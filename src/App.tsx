import { Physics } from "@react-three/cannon";
import { Environment, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useControls } from "leva";
import { useEffect } from "react";
import { Blob } from "./components/Entities/Blob";
import { Food } from "./components/Entities/Food";
import { HUD } from "./components/UI/HUD";
import { Arena } from "./components/World/Arena";
import { Effects } from "./components/World/Effects";
import { useGameStore } from "./store/useGameStore";

/**
 * Main App - The God Mode Simulation
 * User controls entity counts via Leva
 * Physics runs with realistic gravity
 */
function App() {
	// God Mode Controls
	const { blobCount, foodCount } = useControls("God Mode", {
		blobCount: { value: 5, min: 0, max: 50, step: 1, label: "Blob Count" },
		foodCount: { value: 10, min: 0, max: 100, step: 1, label: "Food Count" },
	});

	// Game state from store
	const { blobs, foods, day, setupSimulation } = useGameStore();

	// Initialize simulation when counts change
	useEffect(() => {
		setupSimulation(blobCount, foodCount);
	}, [blobCount, foodCount, setupSimulation]);

	return (
		<div style={{ width: "100vw", height: "100vh", position: "relative" }}>
			{/* HUD Overlay - HTML layer */}
			<HUD day={day} population={{ live: blobs.length, dead: 0 }} />

			<Canvas
				shadows
				camera={{ position: [25, 25, 25], fov: 50 }}
				gl={{ antialias: true }}
				style={{ background: "#f0f0f0" }}
			>
				{/* Environment - Reflections for glassy blobs */}
				<Environment preset="city" />

				{/* Lighting - Clinical Science Aesthetic */}
				<ambientLight intensity={0.4} />
				<directionalLight
					position={[10, 20, 10]}
					intensity={1.2}
					castShadow
					shadow-mapSize={[2048, 2048]}
					shadow-camera-left={-30}
					shadow-camera-right={30}
					shadow-camera-top={30}
					shadow-camera-bottom={-30}
				/>

				{/* Soft fill light */}
				<directionalLight position={[-10, 10, -10]} intensity={0.3} />

				{/* Physics World */}
				<Physics
					gravity={[0, -9.8, 0]}
					defaultContactMaterial={{ restitution: 0.3 }}
				>
					{/* Environment */}
					<Arena />

					{/* Blobs - Dynamic entities */}
					{blobs.map((blob) => (
						<Blob
							key={blob.id}
							id={blob.id}
							position={blob.position}
							radius={0.5}
							senseRadius={blob.senseRadius}
						/>
					))}

					{/* Food - Static resources */}
					{foods.map((food) => (
						<Food
							key={food.id}
							id={food.id}
							position={food.position}
							size={0.4}
						/>
					))}
				</Physics>

				{/* Post-processing effects */}
				<Effects />

				{/* Camera Controls */}
				<OrbitControls
					enableDamping
					dampingFactor={0.05}
					minDistance={10}
					maxDistance={60}
				/>
			</Canvas>
		</div>
	);
}

export default App;
