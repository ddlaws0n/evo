import type { Triplet } from "@react-three/cannon";
import { useSphere } from "@react-three/cannon";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useBlobBrain } from "../../hooks/useBlobBrain";
import { useGameStore } from "../../store/useGameStore";
import { type Genome, getBlobColor } from "../../utils/genetics";
import { ARENA_RADIUS } from "../../utils/steering";

interface BlobProps {
	id: string;
	position?: Triplet;
	genome: Genome;
	debugMode?: boolean;
}

// Chomp animation settings
const CHOMP_SCALE = 1.3;
const CHOMP_DURATION = 0.15;

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
	const meshRef = useRef<THREE.Mesh>(null);

	// Derive visual properties from genome
	const blobColor = useMemo(
		() => getBlobColor(genome.speed, genome.sense),
		[genome.speed, genome.sense],
	);

	// Track actual physics position via subscription
	const physicsPosition = useRef<THREE.Vector3>(new THREE.Vector3(...position));

	// Chomp animation state (using refs for 60fps updates)
	const chompTimeRef = useRef<number>(0);
	const isChompingRef = useRef<boolean>(false);

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
		if (!ref.current || !meshRef.current) return;

		// Get FRESH store state inside useFrame to avoid stale closures
		const {
			foods,
			blobs,
			removeFood,
			syncBlobPosition,
			incrementFoodEaten,
			resetFoodEaten,
			reproduceBlob,
		} = useGameStore.getState();

		// Use subscribed physics position (more accurate than mesh position)
		const blobPos = physicsPosition.current;

		// ===================
		// CHOMP ANIMATION
		// ===================
		if (isChompingRef.current) {
			chompTimeRef.current += delta;
			const t = chompTimeRef.current / CHOMP_DURATION;

			if (t >= 1) {
				meshRef.current.scale.setScalar(1);
				isChompingRef.current = false;
				chompTimeRef.current = 0;
			} else {
				const scale = 1 + (CHOMP_SCALE - 1) * Math.sin(t * Math.PI);
				meshRef.current.scale.setScalar(scale);
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
			wanderSeed,
			genome.speed, // Speed multiplier for forces
		);

		// ===================
		// APPLY FORCES
		// ===================
		api.applyForce(
			[brainOutput.totalForce.x, 0, brainOutput.totalForce.z],
			[0, 0, 0],
		);

		// ===================
		// EATING LOGIC
		// ===================
		if (brainOutput.state === "EATING" && brainOutput.targetId) {
			removeFood(brainOutput.targetId);

			// Get current food count BEFORE incrementing
			const currentBlob = blobs.find((b) => b.id === id);
			const currentFoodEaten = currentBlob?.foodEaten ?? 0;

			incrementFoodEaten(id);

			// Sync position to store
			syncBlobPosition(id, [blobPos.x, blobPos.y, blobPos.z]);

			// ===================
			// REPRODUCTION CHECK
			// ===================
			// If this eat brings us to 2+ food, reproduce
			if (currentFoodEaten + 1 >= 2) {
				const currentPos: [number, number, number] = [
					blobPos.x,
					blobPos.y,
					blobPos.z,
				];
				reproduceBlob(id, currentPos);
				resetFoodEaten(id);
			}

			// Trigger chomp animation
			isChompingRef.current = true;
			chompTimeRef.current = 0;
		}

		// ===================
		// DEBUG VISUALIZATION (Imperative Update)
		// ===================
		if (debugMode && brainOutput.state === "HUNTING" && brainOutput.targetId) {
			// Find the target food and update line geometry directly
			const targetFood = foods.find((f) => f.id === brainOutput.targetId);
			if (targetFood && lineGeoRef.current) {
				// Update line positions directly without re-rendering component
				const points = [
					new THREE.Vector3(blobPos.x, blobPos.y, blobPos.z),
					new THREE.Vector3(
						targetFood.position[0],
						targetFood.position[1],
						targetFood.position[2],
					),
				];
				lineGeoRef.current.setFromPoints(points);
			}
		}
	});

	// Scale factor for eyes (relative to blob size)
	const eyeScale = genome.size;

	return (
		<group ref={ref}>
			{/* Blob Mesh - Gummy/plastic toy material */}
			<mesh ref={meshRef} castShadow>
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

			{/* Left Eye - Position scaled by genome.size */}
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

			{/* Right Eye - Position scaled by genome.size */}
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
