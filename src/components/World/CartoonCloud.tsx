import type { Triplet } from "@react-three/cannon";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";

interface CartoonCloudProps {
	position: Triplet;
	scale?: number;
	speed?: number;
}

/**
 * CartoonCloud - Procedural puffy white cloud
 * Made of grouped spheres for a cute toy-box aesthetic
 * Slowly drifts horizontally
 */
export function CartoonCloud({
	position,
	scale = 1,
	speed = 0.5,
}: CartoonCloudProps) {
	const groupRef = useRef<THREE.Group>(null);
	const startX = position[0];

	// Slow horizontal drift animation
	useFrame((state) => {
		if (groupRef.current) {
			// Drift back and forth using sine wave
			groupRef.current.position.x =
				startX + Math.sin(state.clock.elapsedTime * speed) * 3;
		}
	});

	return (
		<group ref={groupRef} position={position} scale={scale}>
			{/* Main puff - center */}
			<mesh position={[0, 0, 0]}>
				<sphereGeometry args={[1, 16, 16]} />
				<meshBasicMaterial color="#ffffff" />
			</mesh>

			{/* Left puff */}
			<mesh position={[-0.8, -0.2, 0]}>
				<sphereGeometry args={[0.7, 16, 16]} />
				<meshBasicMaterial color="#ffffff" />
			</mesh>

			{/* Right puff */}
			<mesh position={[0.9, -0.1, 0]}>
				<sphereGeometry args={[0.8, 16, 16]} />
				<meshBasicMaterial color="#ffffff" />
			</mesh>

			{/* Back puff */}
			<mesh position={[0.2, 0.1, -0.5]}>
				<sphereGeometry args={[0.6, 16, 16]} />
				<meshBasicMaterial color="#ffffff" />
			</mesh>

			{/* Front puff */}
			<mesh position={[-0.3, -0.1, 0.4]}>
				<sphereGeometry args={[0.5, 16, 16]} />
				<meshBasicMaterial color="#ffffff" />
			</mesh>
		</group>
	);
}
