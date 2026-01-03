import type { Triplet } from "@react-three/cannon";
import { useSphere } from "@react-three/cannon";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useBlobBrain } from "../../hooks/useBlobBrain";
import { useGameStore } from "../../store/useGameStore";
import { type Genome, getBlobColor } from "../../utils/genetics";
import { logAsync } from "../../utils/logger";
import { ARENA_RADIUS, C_MOVE, C_SENSE } from "../../utils/steering";

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
const ENERGY_PREY_MULTIPLIER = 50; // Energy gained = prey.size * this multiplier

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
			foods,
			blobs,
			phase,
			timeRemaining,
			removeFood,
			removeBlob,
			syncBlobPosition,
			incrementFoodEaten,
			markBlobAsEaten,
		} = useGameStore.getState();

		// Use subscribed physics position (more accurate than mesh position)
		const blobPos = physicsPosition.current;

		// ===================
		// ABSORPTION ANIMATION (being eaten by predator)
		// ===================
		// Check if we've been marked as being eaten
		const selfBlob = blobs.find((b) => b.id === id);
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
		// Only decay energy during DAY phase
		if (phase === "DAY") {
			const { size, speed, sense } = genome;
			// Formula: Cost = C_MOVE * (size^3 * speed^2) + C_SENSE * sense
			// Multiply by 60 to normalize for 60fps (delta is ~0.016 at 60fps)
			const energyCost =
				(C_MOVE * size ** 3 * speed ** 2 + C_SENSE * sense) * delta * 60;
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

		const brainOutput = brain.tick(
			{ x: blobPos.x, z: blobPos.z },
			genome.sense,
			foods,
			blobs,
			id,
			genome.size,
			wanderSeed,
			genome.speed,
			timeRemaining,
		);

		// ===================
		// APPLY FORCES
		// ===================
		// EXHAUSTION PENALTY: Sluggish movement if starving
		if (energyRef.current <= 0) {
			brainOutput.totalForce.x *= 0.2;
			brainOutput.totalForce.z *= 0.2;
		}

		api.applyForce(
			[brainOutput.totalForce.x, 0, brainOutput.totalForce.z],
			[0, 0, 0],
		);

		// ===================
		// EATING LOGIC
		// ===================
		if (brainOutput.state === "EATING" && brainOutput.targetId) {
			if (brainOutput.targetType === "food") {
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
			} else if (brainOutput.targetType === "blob") {
				// Eating another blob (predation)
				const prey = blobs.find((b) => b.id === brainOutput.targetId);
				if (prey && !prey.beingEatenBy) {
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
		}

		// ===================
		// DEBUG VISUALIZATION (Imperative Update)
		// ===================
		if (debugMode && brainOutput.state === "HUNTING" && brainOutput.targetId) {
			// Find the target (food or blob) and update line geometry directly
			let targetPos: [number, number, number] | null = null;

			if (brainOutput.targetType === "food") {
				const targetFood = foods.find((f) => f.id === brainOutput.targetId);
				if (targetFood) targetPos = targetFood.position;
			} else if (brainOutput.targetType === "blob") {
				const targetBlob = blobs.find((b) => b.id === brainOutput.targetId);
				if (targetBlob) targetPos = targetBlob.position;
			}

			if (targetPos && lineGeoRef.current) {
				const points = [
					new THREE.Vector3(blobPos.x, blobPos.y, blobPos.z),
					new THREE.Vector3(targetPos[0], targetPos[1], targetPos[2]),
				];
				lineGeoRef.current.setFromPoints(points);
			}
		}
	});

	// Scale factor for eyes - positions were designed for BASE_RADIUS (0.5)
	// So we scale relative to that baseline to maintain proportions
	const eyeScale = genome.size / BASE_RADIUS;

	return (
		<group ref={ref}>
			{/* Visual Group - Contains body + eyes, scaled together for animations */}
			<group ref={visualGroupRef}>
				{/* Blob Mesh - Gummy/plastic toy material */}
				<mesh castShadow>
					<sphereGeometry args={[genome.size, 32, 32]} />
					<meshPhysicalMaterial
						color={blobColor}
						transparent
						opacity={0.9}
						roughness={0.25}
						metalness={0.05}
						clearcoat={0.5}
						clearcoatRoughness={0.3}
						transmission={0.1}
						thickness={0.5}
					/>
				</mesh>

				{/* Left Eye - Position scaled relative to BASE_RADIUS */}
				<group position={[-0.12 * eyeScale, 0.15 * eyeScale, 0.4 * eyeScale]}>
					<mesh>
						<sphereGeometry args={[0.08 * eyeScale, 16, 16]} />
						<meshStandardMaterial color="#ffffff" roughness={0.1} />
					</mesh>
					{/* Pupil */}
					<mesh position={[0, 0, 0.06 * eyeScale]}>
						<sphereGeometry args={[0.035 * eyeScale, 12, 12]} />
						<meshStandardMaterial color="#1f2937" />
					</mesh>
				</group>

				{/* Right Eye - Position scaled relative to BASE_RADIUS */}
				<group position={[0.12 * eyeScale, 0.15 * eyeScale, 0.4 * eyeScale]}>
					<mesh>
						<sphereGeometry args={[0.08 * eyeScale, 16, 16]} />
						<meshStandardMaterial color="#ffffff" roughness={0.1} />
					</mesh>
					{/* Pupil */}
					<mesh position={[0, 0, 0.06 * eyeScale]}>
						<sphereGeometry args={[0.035 * eyeScale, 12, 12]} />
						<meshStandardMaterial color="#1f2937" />
					</mesh>
				</group>
			</group>

			{/* Debug Line - Shows target when hunting (imperative updates) */}
			{debugMode && (
				<line>
					<bufferGeometry ref={lineGeoRef} />
					<lineBasicMaterial color="yellow" />
				</line>
			)}
		</group>
	);
}
