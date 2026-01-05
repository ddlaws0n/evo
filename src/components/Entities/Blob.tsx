import type { Triplet } from "@react-three/cannon";
import { useSphere } from "@react-three/cannon";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
	ARENA_RADIUS,
	C_SENSE,
	C_SIZE,
	C_SPEED,
} from "../../constants/physics";
import { useBlobBrain } from "../../hooks/useBlobBrain";
import {
	type BlobEntity,
	type FoodEntity,
	useGameStore,
} from "../../store/useGameStore";
import { type Genome, getBlobColor } from "../../utils/genetics";
import { logAsync } from "../../utils/logger";

interface BlobProps {
	id: string;
	position?: Triplet;
	genome: Genome;
	debugMode?: boolean;
}

// Animation settings
const CHOMP_SCALE = 1.3;
const CHOMP_DURATION = 0.15;
const BIRTH_DURATION = 0.4;
const BIRTH_OVERSHOOT = 1.15; // Pop effect overshoot
const ABSORPTION_DURATION = 0.3; // Sprint 7: prey absorption animation

// Energy settings
const ENERGY_FOOD_GAIN = 40; // Energy gained from eating food
const ENERGY_PREY_MULTIPLIER = 80; // Energy gained = prey.size * this (buffed to make predation viable)

// Original blob radius the eye positions were designed for
const BASE_RADIUS = 0.5;

/**
 * Blob - The main agent entity
 *
 * This is now a "dumb" representational component.
 * All decision-making logic lives in useBlobBrain hook.
 * This component only handles:
 * - Physics syncing
 * - Visual rendering (mesh + animations)
 * - Applying forces from the brain
 */
export function Blob({
	id,
	position = [0, 2, 0],
	genome,
	debugMode = false,
}: BlobProps) {
	// Visual group ref (for scaling body + eyes together during animations)
	const visualGroupRef = useRef<THREE.Group>(null);

	// Derive visual properties from genome
	const blobColor = useMemo(
		() => getBlobColor(genome.speed, genome.sense),
		[genome.speed, genome.sense],
	);

	// Scale factor for eyes - positions were designed for BASE_RADIUS (0.5)
	const eyeScale = genome.size / BASE_RADIUS;

	// Memoized geometries to prevent recreation every render (C6 fix)
	const bodyGeometry = useMemo(
		() => new THREE.SphereGeometry(genome.size, 32, 32),
		[genome.size],
	);
	const eyeGeometry = useMemo(
		() => new THREE.SphereGeometry(0.08 * eyeScale, 16, 16),
		[eyeScale],
	);
	const pupilGeometry = useMemo(
		() => new THREE.SphereGeometry(0.035 * eyeScale, 12, 12),
		[eyeScale],
	);

	// Memoized eye positions (C6 optimization)
	const leftEyePosition = useMemo<Triplet>(
		() => [-0.12 * eyeScale, 0.15 * eyeScale, 0.4 * eyeScale],
		[eyeScale],
	);
	const rightEyePosition = useMemo<Triplet>(
		() => [0.12 * eyeScale, 0.15 * eyeScale, 0.4 * eyeScale],
		[eyeScale],
	);
	const pupilPosition = useMemo<Triplet>(
		() => [0, 0, 0.06 * eyeScale],
		[eyeScale],
	);

	// Memoized materials (C6 fix)
	const bodyMaterial = useMemo(
		() =>
			new THREE.MeshPhysicalMaterial({
				color: blobColor,
				transparent: true,
				opacity: 0.9,
				roughness: 0.25,
				metalness: 0.05,
				clearcoat: 0.5,
				clearcoatRoughness: 0.3,
				transmission: 0.1,
				thickness: 0.5,
			}),
		[blobColor],
	);
	const eyeWhiteMaterial = useMemo(
		() => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.1 }),
		[],
	);
	const pupilMaterial = useMemo(
		() => new THREE.MeshStandardMaterial({ color: "#1f2937" }),
		[],
	);
	const debugLineMaterial = useMemo(
		() => new THREE.LineBasicMaterial({ color: "yellow" }),
		[],
	);

	// Cleanup geometries and materials on unmount (C6 fix)
	useEffect(() => {
		return () => {
			bodyGeometry.dispose();
			eyeGeometry.dispose();
			pupilGeometry.dispose();
			bodyMaterial.dispose();
			eyeWhiteMaterial.dispose();
			pupilMaterial.dispose();
			debugLineMaterial.dispose();
		};
	}, [
		bodyGeometry,
		eyeGeometry,
		pupilGeometry,
		bodyMaterial,
		eyeWhiteMaterial,
		pupilMaterial,
		debugLineMaterial,
	]);

	// Track actual physics position via subscription
	const physicsPosition = useRef<THREE.Vector3>(new THREE.Vector3(...position));

	// Birth animation state
	const birthTimeRef = useRef<number>(0);
	const isBornRef = useRef<boolean>(false);

	// Chomp animation state (using refs for 60fps updates)
	const chompTimeRef = useRef<number>(0);
	const isChompingRef = useRef<boolean>(false);

	// Sprint 7: Energy tracking (ref-based for performance)
	const energyRef = useRef<number>(100);

	// Sprint 7: Absorption animation (when being eaten)
	const isBeingEatenRef = useRef<boolean>(false);
	const absorptionTargetRef = useRef<THREE.Vector3 | null>(null);
	const absorptionTimeRef = useRef<number>(0);

	// Debug line geometry (imperative updates, no re-renders)
	const lineGeoRef = useRef<THREE.BufferGeometry>(null);

	// Pre-allocated Vector3 for debug visualization to avoid GC pressure (C7 fix)
	const debugLineStartRef = useRef(new THREE.Vector3());
	const debugLineEndRef = useRef(new THREE.Vector3());
	const debugLinePointsRef = useRef([
		debugLineStartRef.current,
		debugLineEndRef.current,
	]);

	// Track consumed food/prey to prevent double-counting (C3 fix)
	const consumedTargetsRef = useRef<Set<string>>(new Set());

	// Physics body - dynamic sphere (size from genome)
	const [ref, api] = useSphere<THREE.Group>(() => ({
		mass: 1,
		args: [genome.size],
		position,
		linearDamping: 0.7, // Increased damping to slow down
		angularDamping: 0.7,
	}));

	// Subscribe to physics position for accurate boundary checking
	useEffect(() => {
		const unsubscribe = api.position.subscribe((p) => {
			physicsPosition.current.set(p[0], p[1], p[2]);
		});
		return unsubscribe;
	}, [api]);

	// The Brain - FSM decision-making logic
	const brain = useBlobBrain();

	useFrame((state, delta) => {
		if (!ref.current || !visualGroupRef.current) return;

		// Get FRESH store state inside useFrame to avoid stale closures
		const {
			blobsById,
			foodsById,
			phase,
			timeRemaining,
			isPaused,
			simulationSpeed,
			removeFood,
			removeBlob,
			syncBlobPosition,
			incrementFoodEaten,
			markBlobAsEaten,
			getNearbyBlobIds,
			getNearbyFoodIds,
		} = useGameStore.getState();

		// Skip if paused (but still allow animations to run)
		const adjustedDelta = isPaused ? 0 : delta * simulationSpeed;

		// Use subscribed physics position (more accurate than mesh position)
		const blobPos = physicsPosition.current;

		// ===================
		// ABSORPTION ANIMATION (being eaten by predator)
		// ===================
		// Check if we've been marked as being eaten (C9: O(1) Map lookup)
		const selfBlob = blobsById.get(id);
		if (selfBlob?.beingEatenBy && !isBeingEatenRef.current) {
			isBeingEatenRef.current = true;
			absorptionTargetRef.current = selfBlob.beingEatenPosition
				? new THREE.Vector3(...selfBlob.beingEatenPosition)
				: null;
			absorptionTimeRef.current = 0;
		}

		if (isBeingEatenRef.current) {
			absorptionTimeRef.current += delta;
			const t = absorptionTimeRef.current / ABSORPTION_DURATION;

			if (t >= 1) {
				// Remove blob after animation completes
				logAsync(`🍽️ Blob absorbed | ID: ${id.slice(0, 8)}`);
				removeBlob(id);
				return;
			}

			// Scale down and move toward predator
			const scale = Math.max(0, 1 - t);
			visualGroupRef.current.scale.setScalar(scale);

			// Lerp position toward predator
			if (absorptionTargetRef.current) {
				const target = absorptionTargetRef.current;
				api.position.set(
					blobPos.x + (target.x - blobPos.x) * t * 0.5,
					blobPos.y,
					blobPos.z + (target.z - blobPos.z) * t * 0.5,
				);
			}

			return; // Skip other logic while being absorbed
		}

		// ===================
		// BIRTH ANIMATION (runs first, before other animations)
		// ===================
		if (!isBornRef.current) {
			birthTimeRef.current += delta;
			const t = Math.min(birthTimeRef.current / BIRTH_DURATION, 1);

			// Ease-out with overshoot: starts at 0, overshoots to 1.15, settles to 1
			let birthScale: number;
			if (t < 0.7) {
				// Ease-out to overshoot
				const easeT = t / 0.7;
				birthScale = BIRTH_OVERSHOOT * (1 - (1 - easeT) ** 3);
			} else {
				// Settle from overshoot to 1
				const settleT = (t - 0.7) / 0.3;
				birthScale = BIRTH_OVERSHOOT - (BIRTH_OVERSHOOT - 1) * settleT;
			}

			visualGroupRef.current.scale.setScalar(birthScale);

			if (t >= 1) {
				isBornRef.current = true;
				visualGroupRef.current.scale.setScalar(1);
			}
			return; // Don't process other logic until born
		}

		// ===================
		// ENERGY DECAY (Sprint 7)
		// ===================
		// Only decay energy during DAY phase (respects pause via adjustedDelta)
		if (phase === "DAY" && adjustedDelta > 0) {
			const { size, speed, sense } = genome;
			// Formula: Cost = (C_SPEED * speed²) + (C_SIZE * size³) + (C_SENSE * sense)
			// Separate additive terms ensure each trait has independent cost (C4 fix)
			// Multiply by 60 to normalize for 60fps (delta is ~0.016 at 60fps)
			const energyCost =
				(C_SPEED * speed ** 2 + C_SIZE * size ** 3 + C_SENSE * sense) *
				adjustedDelta *
				60;
			energyRef.current -= energyCost;

			// Clamp energy to 0 minimum (death happens at judgment, not here)
			energyRef.current = Math.max(0, energyRef.current);
		}

		// ===================
		// CHOMP ANIMATION
		// ===================
		if (isChompingRef.current) {
			chompTimeRef.current += delta;
			const t = chompTimeRef.current / CHOMP_DURATION;

			if (t >= 1) {
				visualGroupRef.current.scale.setScalar(1);
				isChompingRef.current = false;
				chompTimeRef.current = 0;
			} else {
				const scale = 1 + (CHOMP_SCALE - 1) * Math.sin(t * Math.PI);
				visualGroupRef.current.scale.setScalar(scale);
			}
		}

		// ===================
		// HARD BOUNDARY CHECK (Safety)
		// ===================
		const distanceFromCenter = Math.hypot(blobPos.x, blobPos.z);

		// HARD BOUNDARY: Teleport back if escaped
		if (distanceFromCenter > ARENA_RADIUS) {
			// Calculate position just inside boundary
			const clampRatio = (ARENA_RADIUS - 1) / distanceFromCenter;
			const safeX = blobPos.x * clampRatio;
			const safeZ = blobPos.z * clampRatio;

			// Teleport back and kill velocity
			api.position.set(safeX, blobPos.y, safeZ);
			api.velocity.set(0, 0, 0);
			return;
		}

		// ===================
		// BRAIN TICK - Get decisions from FSM
		// ===================
		const wanderSeed =
			state.clock.getElapsedTime() * 2 + position[0] + position[2];

		// Get nearby entities using spatial grid (C1 fix: O(N) instead of O(N²))
		const nearbyBlobIds = getNearbyBlobIds(blobPos.x, blobPos.z, genome.sense);
		const nearbyBlobs = nearbyBlobIds
			.map((blobId) => blobsById.get(blobId))
			.filter((b): b is BlobEntity => b !== undefined);

		const nearbyFoodIds = getNearbyFoodIds(blobPos.x, blobPos.z, genome.sense);
		const nearbyFoods = nearbyFoodIds
			.map((foodId) => foodsById.get(foodId))
			.filter((f): f is FoodEntity => f !== undefined);

		const brainOutput = brain.tick(
			{ x: blobPos.x, z: blobPos.z },
			genome.sense,
			nearbyFoods,
			nearbyBlobs,
			id,
			genome.size,
			wanderSeed,
			genome.speed,
			timeRemaining,
		);

		// ===================
		// APPLY FORCES (only when not paused)
		// ===================
		if (!isPaused) {
			// EXHAUSTION PENALTY: Sluggish movement if starving
			if (energyRef.current <= 0) {
				brainOutput.totalForce.x *= 0.2;
				brainOutput.totalForce.z *= 0.2;
			}

			// Scale forces by simulation speed
			api.applyForce(
				[
					brainOutput.totalForce.x * simulationSpeed,
					0,
					brainOutput.totalForce.z * simulationSpeed,
				],
				[0, 0, 0],
			);
		}

		// ===================
		// EATING LOGIC (only when not paused)
		// ===================
		if (!isPaused && brainOutput.state === "EATING" && brainOutput.targetId) {
			// Check if we've already consumed this target (prevents double-counting)
			const alreadyConsumed = consumedTargetsRef.current.has(
				brainOutput.targetId,
			);

			if (brainOutput.targetType === "food" && !alreadyConsumed) {
				// Validate target still exists (H1 fix)
				const targetFood = foodsById.get(brainOutput.targetId);
				if (!targetFood) return; // Food was eaten by another blob

				// Mark as consumed FIRST to prevent re-entry
				consumedTargetsRef.current.add(brainOutput.targetId);

				// Eating food
				removeFood(brainOutput.targetId);

				// Gain energy from food
				energyRef.current = Math.min(100, energyRef.current + ENERGY_FOOD_GAIN);

				// Increment food counter (reproduction happens at end of day)
				incrementFoodEaten(id);

				// Sync position to store
				syncBlobPosition(id, [blobPos.x, blobPos.y, blobPos.z]);

				// Trigger chomp animation
				isChompingRef.current = true;
				chompTimeRef.current = 0;
			} else if (brainOutput.targetType === "blob" && !alreadyConsumed) {
				// Gate predation to DAY phase only (H5 fix)
				// Prevents free energy gain during SUNSET when energy decay is paused
				if (phase !== "DAY") return;

				// Eating another blob (predation) - C9: O(1) Map lookup
				// Validate target still exists and isn't being eaten (H1 fix)
				const prey = blobsById.get(brainOutput.targetId);
				if (!prey || prey.beingEatenBy) return;

				// Mark as consumed FIRST to prevent re-entry
				consumedTargetsRef.current.add(brainOutput.targetId);

				// Mark prey as being eaten (triggers absorption animation on prey)
				markBlobAsEaten(prey.id, id, [blobPos.x, blobPos.y, blobPos.z]);

				// Gain energy from prey (proportional to prey size)
				const preyEnergy = prey.genome.size * ENERGY_PREY_MULTIPLIER;
				energyRef.current = Math.min(100, energyRef.current + preyEnergy);

				// Increment food counter (reproduction happens at end of day)
				incrementFoodEaten(id);

				// Sync position
				syncBlobPosition(id, [blobPos.x, blobPos.y, blobPos.z]);

				// Trigger chomp animation
				isChompingRef.current = true;
				chompTimeRef.current = 0;
			}
		}

		// ===================
		// DEBUG VISUALIZATION (Imperative Update)
		// ===================
		if (debugMode && brainOutput.state === "HUNTING" && brainOutput.targetId) {
			// Find the target (food or blob) - C9: O(1) Map lookups
			let targetPos: [number, number, number] | null = null;

			if (brainOutput.targetType === "food") {
				const targetFood = foodsById.get(brainOutput.targetId);
				if (targetFood) targetPos = targetFood.position;
			} else if (brainOutput.targetType === "blob") {
				const targetBlob = blobsById.get(brainOutput.targetId);
				if (targetBlob) targetPos = targetBlob.position;
			}

			if (targetPos && lineGeoRef.current) {
				// Use pre-allocated vectors to avoid GC pressure (C7 fix)
				debugLineStartRef.current.set(blobPos.x, blobPos.y, blobPos.z);
				debugLineEndRef.current.set(targetPos[0], targetPos[1], targetPos[2]);
				lineGeoRef.current.setFromPoints(debugLinePointsRef.current);
			}
		}
	});

	return (
		<group ref={ref}>
			{/* Visual Group - Contains body + eyes, scaled together for animations */}
			<group ref={visualGroupRef}>
				{/* Blob Mesh - Gummy/plastic toy material (C6: memoized geometry/material) */}
				<mesh castShadow geometry={bodyGeometry} material={bodyMaterial} />

				{/* Left Eye - Position scaled relative to BASE_RADIUS */}
				<group position={leftEyePosition}>
					<mesh geometry={eyeGeometry} material={eyeWhiteMaterial} />
					{/* Pupil */}
					<mesh
						position={pupilPosition}
						geometry={pupilGeometry}
						material={pupilMaterial}
					/>
				</group>

				{/* Right Eye - Position scaled relative to BASE_RADIUS */}
				<group position={rightEyePosition}>
					<mesh geometry={eyeGeometry} material={eyeWhiteMaterial} />
					{/* Pupil */}
					<mesh
						position={pupilPosition}
						geometry={pupilGeometry}
						material={pupilMaterial}
					/>
				</group>
			</group>

			{/* Debug Line - Shows target when hunting (imperative updates) */}
			{debugMode && (
				<line>
					<bufferGeometry ref={lineGeoRef} />
					<primitive object={debugLineMaterial} attach="material" />
				</line>
			)}
		</group>
	);
}
