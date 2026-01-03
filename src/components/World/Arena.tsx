import type { Triplet } from "@react-three/cannon";
import { useCylinder } from "@react-three/cannon";

/**
 * Arena - The physical floor of the simulation
 * A flattened cylinder (radius 20) representing the petri dish
 * with a raised rim to act as a "safe zone" boundary
 */
export function Arena() {
	const ARENA_RADIUS = 20;
	const ARENA_HEIGHT = 0.5;

	// Main floor - static physics body
	const [floorRef] = useCylinder<THREE.Mesh>(() => ({
		type: "Static",
		args: [ARENA_RADIUS, ARENA_RADIUS, ARENA_HEIGHT, 32] as Triplet,
		position: [0, -ARENA_HEIGHT / 2, 0],
	}));

	return (
		<group>
			{/* Main Arena Floor */}
			<mesh ref={floorRef} receiveShadow>
				<cylinderGeometry
					args={[ARENA_RADIUS, ARENA_RADIUS, ARENA_HEIGHT, 32]}
				/>
				<meshStandardMaterial color="#e8e8e8" roughness={0.8} metalness={0.1} />
			</mesh>

			{/* Safe Zone Rim - Visual indicator */}
			<mesh position={[0, 0, 0]} receiveShadow>
				<torusGeometry args={[ARENA_RADIUS - 0.5, 0.3, 16, 32]} />
				<meshStandardMaterial color="#c0c0c0" roughness={0.6} metalness={0.2} />
			</mesh>
		</group>
	);
}
