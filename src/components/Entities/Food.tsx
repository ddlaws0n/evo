import type { Triplet } from "@react-three/cannon";
import type * as THREE from "three";
import { useBox } from "@react-three/cannon";

interface FoodProps {
	id: string;
	position?: Triplet;
	size?: number;
}

/**
 * Food - Static resource entity
 * A glowing box that Blobs hunt and consume
 * Ghost physics body - blobs pass through it (no collision response)
 */
export function Food({
	id: _id,
	position = [0, 0.5, 0],
	size = 0.4,
}: FoodProps) {
	// Ghost physics body - no collision response allows blobs to pass through
	const [ref] = useBox<THREE.Mesh>(() => ({
		type: "Static",
		args: [size, size, size] as Triplet,
		position,
		collisionResponse: false, // Blobs pass through instead of bouncing
	}));

	return (
		<mesh ref={ref} castShadow>
			<boxGeometry args={[size, size, size]} />
			<meshStandardMaterial
				color="#39ff14"
				emissive="#39ff14"
				emissiveIntensity={2}
				roughness={0.4}
				metalness={0.6}
				toneMapped={false}
			/>
		</mesh>
	);
}
