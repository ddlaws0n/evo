import type { Triplet } from "@react-three/cannon";
import { useSphere } from "@react-three/cannon";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useGameStore } from "../../store/useGameStore";

interface BlobProps {
	id: string;
	position?: Triplet;
	radius?: number;
	senseRadius?: number;
}

// Arena and physics constants
const ARENA_RADIUS = 17; // Hard boundary - will teleport back if exceeded
const SOFT_BOUNDARY = 14; // Soft boundary - start pushing back
const HUNT_FORCE = 4.0;
const WANDER_FORCE = 0.8;
const SOFT_RETURN_FORCE = 3.0;
const EAT_DISTANCE = 1.5;

// Chomp animation settings
const CHOMP_SCALE = 1.3;
const CHOMP_DURATION = 0.15;

/**
 * Calculate 2D distance on the XZ plane (ignores Y axis)
 */
function distance2D(
	a: { x: number; z: number },
	b: { x: number; z: number },
): number {
	return Math.hypot(a.x - b.x, a.z - b.z);
}

/**
 * Blob - The main agent entity
 * A physics-enabled sphere that hunts food within its sense radius
 * Falls back to random wandering when no food is detected
 */
export function Blob({
	id: _id,
	position = [0, 2, 0],
	radius = 0.5,
	senseRadius = 10.0,
}: BlobProps) {
	const meshRef = useRef<THREE.Mesh>(null);

	// Track actual physics position via subscription
	const physicsPosition = useRef<THREE.Vector3>(new THREE.Vector3(...position));

	// Chomp animation state (using refs for 60fps updates)
	const chompTimeRef = useRef<number>(0);
	const isChompingRef = useRef<boolean>(false);

	// Physics body - dynamic sphere
	const [ref, api] = useSphere<THREE.Group>(() => ({
		mass: 1,
		args: [radius],
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

	useFrame((state, delta) => {
		if (!ref.current || !meshRef.current) return;

		// Get FRESH store state inside useFrame to avoid stale closures
		const { foods, removeFood } = useGameStore.getState();

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
		// BOUNDARY: Two-tier system
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

		// SOFT BOUNDARY: Gradual push back when approaching edge
		let boundaryForce = { x: 0, z: 0 };
		if (distanceFromCenter > SOFT_BOUNDARY) {
			// Force increases as they get closer to hard boundary
			const boundaryPressure =
				(distanceFromCenter - SOFT_BOUNDARY) / (ARENA_RADIUS - SOFT_BOUNDARY);
			const returnStrength = SOFT_RETURN_FORCE * boundaryPressure * 2;

			boundaryForce = {
				x: (-blobPos.x / distanceFromCenter) * returnStrength,
				z: (-blobPos.z / distanceFromCenter) * returnStrength,
			};
		}

		// ===================
		// STEERING: Decide where to go
		// ===================
		let steerDirection: { x: number; z: number } | null = null;
		let steerForce = WANDER_FORCE;
		let targetFoodId: string | null = null;
		let targetDistance = Number.POSITIVE_INFINITY;

		// Find nearest food within sense radius (using 2D distance)
		for (const food of foods) {
			const dist = distance2D(
				{ x: blobPos.x, z: blobPos.z },
				{ x: food.position[0], z: food.position[2] },
			);

			if (dist <= senseRadius && dist < targetDistance) {
				targetDistance = dist;
				targetFoodId = food.id;

				// Calculate direction toward food
				const dx = food.position[0] - blobPos.x;
				const dz = food.position[2] - blobPos.z;
				const len = Math.hypot(dx, dz);

				if (len > 0.01) {
					steerDirection = { x: dx / len, z: dz / len };
					steerForce = HUNT_FORCE;
				}
			}
		}

		// If no food found, wander randomly
		if (!steerDirection) {
			const time = state.clock.getElapsedTime();
			steerDirection = {
				x: Math.sin(time * 2 + position[0]),
				z: Math.cos(time * 2 + position[2]),
			};
			steerForce = WANDER_FORCE;
		}

		// ===================
		// ENGINE: Apply combined forces
		// ===================
		const totalForceX = steerDirection.x * steerForce + boundaryForce.x;
		const totalForceZ = steerDirection.z * steerForce + boundaryForce.z;

		api.applyForce([totalForceX, 0, totalForceZ], [0, 0, 0]);

		// ===================
		// EATING: Check if close enough to consume
		// ===================
		if (targetFoodId && targetDistance < EAT_DISTANCE) {
			removeFood(targetFoodId);

			// Trigger chomp animation
			isChompingRef.current = true;
			chompTimeRef.current = 0;
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
