import type { Triplet } from "@react-three/cannon";
import { useBox } from "@react-three/cannon";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

interface FoodProps {
	id: string;
	position?: Triplet;
	size?: number;
}

/**
 * Food - Apple resource entity
 * A red apple that Blobs hunt and consume
 * Ghost physics body - blobs pass through it (no collision response)
 * Visual mesh bobs gently while physics anchor stays fixed
 */
export function Food({
	id: _id,
	position = [0, 0.5, 0],
	size = 0.4,
}: FoodProps) {
	// Visual ref for bobbing animation (separate from physics)
	const visualRef = useRef<THREE.Group>(null);

	// Ghost physics body - stationary anchor
	const [physicsRef] = useBox<THREE.Group>(() => ({
		type: "Static",
		args: [size, size, size] as Triplet,
		position,
		collisionResponse: false, // Blobs pass through instead of bouncing
	}));

	// Bobbing animation - only moves visual mesh, not physics body
	useFrame((state) => {
		if (visualRef.current) {
			visualRef.current.position.y =
				Math.sin(state.clock.elapsedTime * 2) * 0.1;
		}
	});

	const appleRadius = size * 0.6;

	return (
		// Physics Body (Anchor - stationary)
		<group ref={physicsRef}>
			{/* Visual Child (Bobbing) */}
			<group ref={visualRef}>
				{/* Apple body - red sphere */}
				<mesh castShadow>
					<sphereGeometry args={[appleRadius, 16, 16]} />
					<meshStandardMaterial color="#dc2626" roughness={0.6} />
				</mesh>

				{/* Stem - brown cylinder */}
				<mesh position={[0, appleRadius + 0.04, 0]} castShadow>
					<cylinderGeometry args={[0.03, 0.04, 0.12, 8]} />
					<meshStandardMaterial color="#78350f" roughness={0.8} />
				</mesh>

				{/* Leaf - small green plane */}
				<mesh
					position={[0.06, appleRadius + 0.08, 0]}
					rotation={[0, 0, Math.PI / 4]}
				>
					<planeGeometry args={[0.1, 0.06]} />
					<meshStandardMaterial
						color="#22c55e"
						side={THREE.DoubleSide}
						roughness={0.7}
					/>
				</mesh>
			</group>
		</group>
	);
}
