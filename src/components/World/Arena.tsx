import type { Triplet } from "@react-three/cannon";
import { useCylinder } from "@react-three/cannon";
import { Grid } from "@react-three/drei";

/**
 * Arena - The physical floor of the simulation
 * A flattened cylinder (radius 20) representing the petri dish
 * with a raised rim to act as a "safe zone" boundary
 * Styled as white ceramic for "microscope" aesthetic
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
			{/* Infinite Grid - Lab space illusion below the petri dish */}
			<Grid
				position={[0, -ARENA_HEIGHT - 0.01, 0]}
				args={[200, 200]}
				cellSize={1}
				cellThickness={0.5}
				cellColor="#d0d0d0"
				sectionSize={5}
				sectionThickness={1}
				sectionColor="#b0b0b0"
				fadeDistance={80}
				fadeStrength={1}
				followCamera={false}
				infiniteGrid
			/>

			{/* Main Arena Floor - White Ceramic */}
			<mesh ref={floorRef} receiveShadow>
				<cylinderGeometry
					args={[ARENA_RADIUS, ARENA_RADIUS, ARENA_HEIGHT, 64]}
				/>
				<meshStandardMaterial
					color="#d0d0d0"
					roughness={0.8}
					metalness={0.02}
				/>
			</mesh>

			{/* Safe Zone Rim - Rotated flat on the ground */}
			<mesh
				position={[0, 0.05, 0]}
				rotation={[-Math.PI / 2, 0, 0]}
				receiveShadow
			>
				<torusGeometry args={[ARENA_RADIUS - 0.5, 0.15, 16, 64]} />
				<meshStandardMaterial color="#e0e0e0" roughness={0.7} metalness={0.1} />
			</mesh>
		</group>
	);
}
