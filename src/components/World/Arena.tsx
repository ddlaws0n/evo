import { usePlane } from "@react-three/cannon";
import { Grid } from "@react-three/drei";
import type * as THREE from "three";

// Visual arena radius (the petri dish)
const ARENA_RADIUS = 20;
const ARENA_HEIGHT = 0.5;

/**
 * Arena - The physical floor of the simulation
 * Visual: A flattened cylinder (radius 20) representing the petri dish
 * Physics: An infinite plane - blobs cannot fall off
 */
export function Arena() {
	// Physics floor - infinite plane at Y=0
	// This prevents blobs from ever falling off, regardless of position
	const [physicsFloorRef] = usePlane<THREE.Mesh>(() => ({
		type: "Static",
		rotation: [-Math.PI / 2, 0, 0], // Rotate to be horizontal
		position: [0, 0, 0],
	}));

	return (
		<group>
			{/* Invisible physics floor (infinite plane) */}
			<mesh ref={physicsFloorRef}>
				<planeGeometry args={[1, 1]} />
				<meshBasicMaterial visible={false} />
			</mesh>

			{/* Infinite Grid - Lab space illusion below the petri dish */}
			<Grid
				position={[0, -0.01, 0]}
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

			{/* Visual Arena Floor - Petri Dish */}
			<mesh position={[0, 0, 0]} receiveShadow>
				<cylinderGeometry
					args={[ARENA_RADIUS, ARENA_RADIUS, ARENA_HEIGHT, 64]}
				/>
				<meshStandardMaterial
					color="#b0b0b0"
					roughness={0.8}
					metalness={0.02}
				/>
			</mesh>

			{/* Safe Zone Rim - Visual boundary indicator */}
			<mesh
				position={[0, ARENA_HEIGHT / 2 + 0.05, 0]}
				rotation={[-Math.PI / 2, 0, 0]}
				receiveShadow
			>
				<torusGeometry args={[ARENA_RADIUS - 0.5, 0.15, 16, 64]} />
				<meshStandardMaterial color="#e0e0e0" roughness={0.7} metalness={0.1} />
			</mesh>
		</group>
	);
}
