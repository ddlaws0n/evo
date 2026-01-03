import type { Triplet } from "@react-three/cannon";
import { useSphere } from "@react-three/cannon";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";

interface BlobProps {
	position?: Triplet;
	radius?: number;
}

/**
 * Blob - The main agent entity
 * A physics-enabled sphere that will eventually hunt food and reproduce
 * Currently has random movement for physics testing
 */
export function Blob({ position = [0, 2, 0], radius = 0.5 }: BlobProps) {
	// Physics body - dynamic sphere
	const [ref, api] = useSphere<THREE.Mesh>(() => ({
		mass: 1,
		args: [radius],
		position,
		linearDamping: 0.5, // Air resistance
		angularDamping: 0.5,
	}));

	useFrame((state) => {
		if (!ref.current) return;

		// Random wandering force (placeholder for hunt behavior)
		// Apply small random forces to demonstrate physics
		const time = state.clock.getElapsedTime();
		const forceX = Math.sin(time * 2 + position[0]) * 0.5;
		const forceZ = Math.cos(time * 2 + position[2]) * 0.5;

		api.applyForce([forceX, 0, forceZ], [0, 0, 0]);

		// Keep blob from flying off the arena
		const pos = ref.current.position;
		const distanceFromCenter = Math.sqrt(pos.x ** 2 + pos.z ** 2);

		if (distanceFromCenter > 18) {
			// Push back towards center
			const pushBackForce = -2;
			api.applyForce(
				[
					(pos.x / distanceFromCenter) * pushBackForce,
					0,
					(pos.z / distanceFromCenter) * pushBackForce,
				],
				[0, 0, 0],
			);
		}
	});

	return (
		<mesh ref={ref} castShadow>
			<sphereGeometry args={[radius, 32, 32]} />
			<meshPhysicalMaterial
				color="#ff3366"
				transparent
				opacity={0.85}
				roughness={0.1}
				metalness={0.1}
				clearcoat={1.0}
				clearcoatRoughness={0.1}
				transmission={0.3} // Glassy/jelly appearance
				thickness={0.5}
			/>
		</mesh>
	);
}
