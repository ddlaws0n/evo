import type { Triplet } from "@react-three/cannon";
import { useBox } from "@react-three/cannon";

interface FoodProps {
	id: string;
	position?: Triplet;
	size?: number;
}

/**
 * Food - Static resource entity
 * A glowing box that Blobs hunt and consume
 * Static physics body (doesn't move when hit)
 */
export function Food({ id: _id, position = [0, 0.5, 0], size = 0.4 }: FoodProps) {
	// Static physics body
	const [ref] = useBox<THREE.Mesh>(() => ({
		type: "Static",
		args: [size, size, size] as Triplet,
		position,
	}));

	return (
		<mesh ref={ref} castShadow>
			<boxGeometry args={[size, size, size]} />
			<meshStandardMaterial
				color="#00d9a3"
				emissive="#00d9a3"
				emissiveIntensity={2}
				roughness={0.4}
				metalness={0.6}
				toneMapped={false}
			/>
		</mesh>
	);
}
