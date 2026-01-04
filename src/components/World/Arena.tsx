import { usePlane } from "@react-three/cannon";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ARENA_RADIUS } from "../../constants/physics";

// Visual arena constants
const ARENA_HEIGHT = 0.5;
const DIRT_HEIGHT = 5;

// Vegetation settings
const GRASS_COUNT = 500;
const ROCK_COUNT = 30;

/**
 * Arena - The physical floor of the simulation
 * Visual: A green grass platform with scattered vegetation
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

	// Refs for instanced meshes
	const grassRef = useRef<THREE.InstancedMesh>(null);
	const rockRef = useRef<THREE.InstancedMesh>(null);

	// Generate random positions for grass and rocks (once)
	const grassPositions = useMemo(() => {
		const positions: { x: number; z: number; rotY: number }[] = [];
		for (let i = 0; i < GRASS_COUNT; i++) {
			// Random position within arena (circular distribution)
			const angle = Math.random() * Math.PI * 2;
			const radius = Math.sqrt(Math.random()) * (ARENA_RADIUS - 0.5);
			positions.push({
				x: Math.cos(angle) * radius,
				z: Math.sin(angle) * radius,
				rotY: Math.random() * Math.PI * 2,
			});
		}
		return positions;
	}, []);

	const rockData = useMemo(() => {
		const data: { x: number; z: number; rotY: number; scale: number }[] = [];
		for (let i = 0; i < ROCK_COUNT; i++) {
			const angle = Math.random() * Math.PI * 2;
			const radius = Math.sqrt(Math.random()) * (ARENA_RADIUS - 1);
			data.push({
				x: Math.cos(angle) * radius,
				z: Math.sin(angle) * radius,
				rotY: Math.random() * Math.PI * 2,
				scale: 0.5 + Math.random(), // 0.5 to 1.5
			});
		}
		return data;
	}, []);

	// Set up instanced mesh transforms
	useEffect(() => {
		if (!grassRef.current) return;

		const dummy = new THREE.Object3D();
		for (const [i, pos] of grassPositions.entries()) {
			dummy.position.set(pos.x, ARENA_HEIGHT / 2 + 0.2, pos.z);
			dummy.rotation.set(0, pos.rotY, 0);
			dummy.scale.setScalar(1);
			dummy.updateMatrix();
			grassRef.current.setMatrixAt(i, dummy.matrix);
		}
		grassRef.current.instanceMatrix.needsUpdate = true;
	}, [grassPositions]);

	useEffect(() => {
		if (!rockRef.current) return;

		const dummy = new THREE.Object3D();
		for (const [i, rock] of rockData.entries()) {
			dummy.position.set(rock.x, ARENA_HEIGHT / 2 + 0.1, rock.z);
			dummy.rotation.set(0, rock.rotY, 0);
			dummy.scale.setScalar(rock.scale);
			dummy.updateMatrix();
			rockRef.current.setMatrixAt(i, dummy.matrix);
		}
		rockRef.current.instanceMatrix.needsUpdate = true;
	}, [rockData]);

	return (
		<group>
			{/* Invisible physics floor (infinite plane) */}
			<mesh ref={physicsFloorRef}>
				<planeGeometry args={[1, 1]} />
				<meshBasicMaterial visible={false} />
			</mesh>

			{/* Visual Arena Floor - Green Grass Platform (Toon shaded) */}
			<mesh position={[0, 0, 0]} receiveShadow>
				<cylinderGeometry
					args={[ARENA_RADIUS, ARENA_RADIUS, ARENA_HEIGHT, 64]}
				/>
				<meshToonMaterial color="#4ade80" />
			</mesh>

			{/* Dirt Layer - Extends below the grass to create floating island depth */}
			<mesh
				position={[0, -(ARENA_HEIGHT / 2 + DIRT_HEIGHT / 2), 0]}
				receiveShadow
			>
				<cylinderGeometry
					args={[ARENA_RADIUS, ARENA_RADIUS * 0.85, DIRT_HEIGHT, 64]}
				/>
				<meshToonMaterial color="#5D4037" />
			</mesh>

			{/* Grass Tufts - Instanced cones */}
			<instancedMesh
				ref={grassRef}
				args={[undefined, undefined, GRASS_COUNT]}
				castShadow
				receiveShadow
			>
				<coneGeometry args={[0.1, 0.4, 4]} />
				<meshStandardMaterial color="#22c55e" flatShading />
			</instancedMesh>

			{/* Rocks - Instanced dodecahedrons */}
			<instancedMesh
				ref={rockRef}
				args={[undefined, undefined, ROCK_COUNT]}
				castShadow
				receiveShadow
			>
				<dodecahedronGeometry args={[0.3]} />
				<meshStandardMaterial color="#9ca3af" flatShading />
			</instancedMesh>
		</group>
	);
}
