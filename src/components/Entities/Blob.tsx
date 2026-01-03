import type { Triplet } from "@react-three/cannon";
import { useSphere } from "@react-three/cannon";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useGameStore } from "../../store/useGameStore";

interface BlobProps {
	id: string;
	position?: Triplet;
	radius?: number;
	senseRadius?: number;
}

const ARENA_RADIUS = 18;
const HUNT_FORCE = 3.0;
const WANDER_FORCE = 0.5;
const BOUNDARY_FORCE = 2.0;
const EAT_DISTANCE = 1.0;

// Chomp animation settings
const CHOMP_SCALE = 1.3;
const CHOMP_DURATION = 0.15; // seconds

/**
 * Blob - The main agent entity
 * A physics-enabled sphere that hunts food within its sense radius
 * Falls back to random wandering when no food is detected
 */
export function Blob({
	id,
	position = [0, 2, 0],
	radius = 0.5,
	senseRadius = 5.0,
}: BlobProps) {
	const meshRef = useRef<THREE.Mesh>(null);

	// Chomp animation state (using refs for 60fps updates)
	const chompTimeRef = useRef<number>(0);
	const isChompingRef = useRef<boolean>(false);

	// Get store actions
	const foods = useGameStore((state) => state.foods);
	const removeFood = useGameStore((state) => state.removeFood);

	// Physics body - dynamic sphere
	const [ref, api] = useSphere<THREE.Group>(() => ({
		mass: 1,
		args: [radius],
		position,
		linearDamping: 0.5,
		angularDamping: 0.5,
	}));

	useFrame((state, delta) => {
		if (!ref.current || !meshRef.current) return;

		const blobPos = ref.current.position;

		// --- CHOMP ANIMATION ---
		if (isChompingRef.current) {
			chompTimeRef.current += delta;
			const t = chompTimeRef.current / CHOMP_DURATION;

			if (t >= 1) {
				// Animation complete, reset
				meshRef.current.scale.setScalar(1);
				isChompingRef.current = false;
				chompTimeRef.current = 0;
			} else {
				// Smooth scale up then down (sine curve)
				const scale = 1 + (CHOMP_SCALE - 1) * Math.sin(t * Math.PI);
				meshRef.current.scale.setScalar(scale);
			}
		}

		// --- SENSING: Find nearest food within sense radius ---
		let nearestFood: { id: string; pos: THREE.Vector3; dist: number } | null =
			null;

		for (const food of foods) {
			const foodPos = new THREE.Vector3(...food.position);
			const dist = blobPos.distanceTo(foodPos);

			if (dist <= senseRadius) {
				if (!nearestFood || dist < nearestFood.dist) {
					nearestFood = { id: food.id, pos: foodPos, dist };
				}
			}
		}

		// --- HUNTING or WANDERING ---
		if (nearestFood) {
			// Calculate direction vector towards food
			const direction = new THREE.Vector3()
				.subVectors(nearestFood.pos, blobPos)
				.normalize();

			// Apply hunting force
			api.applyForce(
				[direction.x * HUNT_FORCE, 0, direction.z * HUNT_FORCE],
				[0, 0, 0],
			);

			// --- EATING: Check if close enough to consume ---
			if (nearestFood.dist < EAT_DISTANCE) {
				removeFood(nearestFood.id);

				// Trigger chomp animation
				isChompingRef.current = true;
				chompTimeRef.current = 0;
			}
		} else {
			// Random wandering when no food in range
			const time = state.clock.getElapsedTime();
			const forceX = Math.sin(time * 2 + position[0]) * WANDER_FORCE;
			const forceZ = Math.cos(time * 2 + position[2]) * WANDER_FORCE;
			api.applyForce([forceX, 0, forceZ], [0, 0, 0]);
		}

		// --- BOUNDARY: Keep blob within arena ---
		const distanceFromCenter = Math.sqrt(blobPos.x ** 2 + blobPos.z ** 2);

		if (distanceFromCenter > ARENA_RADIUS) {
			// Push back towards center
			api.applyForce(
				[
					(-blobPos.x / distanceFromCenter) * BOUNDARY_FORCE,
					0,
					(-blobPos.z / distanceFromCenter) * BOUNDARY_FORCE,
				],
				[0, 0, 0],
			);
		}
	});

	return (
		<group ref={ref}>
			<mesh ref={meshRef} castShadow>
				<sphereGeometry args={[radius, 32, 32]} />
				<meshPhysicalMaterial
					color="#ff3366"
					transparent
					opacity={0.85}
					roughness={0.1}
					metalness={0.1}
					clearcoat={1.0}
					clearcoatRoughness={0.1}
					transmission={0.3}
					thickness={0.5}
				/>
			</mesh>
		</group>
	);
}
