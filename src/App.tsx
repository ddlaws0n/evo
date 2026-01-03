import { Physics } from "@react-three/cannon";
import { Environment, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useControls } from "leva";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Blob } from "./components/Entities/Blob";
import { Food } from "./components/Entities/Food";
import { HUD } from "./components/UI/HUD";
import { NightOverlay } from "./components/UI/NightOverlay";
import { Arena } from "./components/World/Arena";
import { CartoonCloud } from "./components/World/CartoonCloud";
import { Effects } from "./components/World/Effects";
import { useSimulationTimer } from "./hooks/useSimulationTimer";
import { useGameStore } from "./store/useGameStore";

/**
 * GradientSkybox - Creates a vertical gradient from zenith to nadir
 * - Zenith (top): Bright Sky Blue
 * - Horizon (middle): White Haze
 * - Nadir (bottom): Deep Void Purple
 */
function GradientSkybox() {
	const shaderMaterial = useMemo(() => {
		return new THREE.ShaderMaterial({
			uniforms: {
				topColor: { value: new THREE.Color("#7dd3fc") }, // Vibrant sky blue (sky-300)
				middleColor: { value: new THREE.Color("#bae6fd") }, // Deeper sky horizon (sky-200)
				bottomColor: { value: new THREE.Color("#a5b4fc") }, // Soft indigo (indigo-300)
			},
			vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
			fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 middleColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          vec3 color;
          if (h >= 0.0) {
            color = mix(middleColor, topColor, h);
          } else {
            color = mix(middleColor, bottomColor, -h);
          }
          gl_FragColor = vec4(color, 1.0);
        }
      `,
			side: THREE.BackSide,
			depthWrite: false,
			depthTest: false,
		});
	}, []);

	return (
		<mesh>
			<sphereGeometry args={[100, 32, 32]} />
			<primitive object={shaderMaterial} attach="material" />
		</mesh>
	);
}

/**
 * SimulationController - Invisible component that runs the day/night timer
 * Lives inside Physics world to access useFrame
 */
function SimulationController({ foodCount }: { foodCount: number }) {
	useSimulationTimer(foodCount);
	return null;
}

/**
 * Main App - The God Mode Simulation
 * User controls entity counts via Leva
 * Physics runs with realistic gravity
 */
function App() {
	// God Mode Controls
	const { blobCount, foodCount, debugMode } = useControls("God Mode", {
		blobCount: { value: 5, min: 0, max: 50, step: 1, label: "Blob Count" },
		foodCount: { value: 10, min: 0, max: 100, step: 1, label: "Food Count" },
		debugMode: { value: false, label: "Debug Mode" },
	});

	// Game state from store
	const {
		blobs,
		foods,
		day,
		phase,
		timeRemaining,
		deadThisDay,
		setupSimulation,
	} = useGameStore();

	// Initialize simulation when counts change
	useEffect(() => {
		setupSimulation(blobCount, foodCount);
	}, [blobCount, foodCount, setupSimulation]);

	return (
		<div style={{ width: "100vw", height: "100vh", position: "relative" }}>
			{/* Night Overlay - Fades in during night phase */}
			<NightOverlay phase={phase} />

			{/* HUD Overlay - HTML layer */}
			<HUD
				day={day}
				timeRemaining={timeRemaining}
				population={{ live: blobs.length, dead: deadThisDay }}
			/>

			<Canvas
				shadows
				camera={{ position: [30, 30, 30], fov: 28 }}
				gl={{ antialias: true }}
			>
				{/* Gradient Skybox - Floating island aesthetic */}
				<GradientSkybox />

				{/* Environment - Reflections for gummy blobs */}
				<Environment preset="forest" />

				{/* Cartoon Clouds - Above the platform */}
				<CartoonCloud position={[-15, 18, -15]} scale={1.5} speed={0.3} />
				<CartoonCloud position={[20, 20, 10]} scale={1.2} speed={0.4} />
				<CartoonCloud position={[0, 22, 25]} scale={1.8} speed={0.25} />

				{/* Cartoon Clouds - At platform level (horizon) */}
				<CartoonCloud position={[-40, 5, 0]} scale={2} speed={0.2} />
				<CartoonCloud position={[45, 3, -15]} scale={1.8} speed={0.35} />
				<CartoonCloud position={[0, 4, -45]} scale={2.2} speed={0.15} />

				{/* Cartoon Clouds - Below the platform (floating island effect) */}
				<CartoonCloud position={[-25, -10, 20]} scale={1.5} speed={0.4} />
				<CartoonCloud position={[30, -15, -10]} scale={1.3} speed={0.3} />
				<CartoonCloud position={[5, -18, 35]} scale={1.8} speed={0.25} />
				<CartoonCloud position={[-35, -12, -30]} scale={1.4} speed={0.35} />

				{/* Lighting - Hemisphere for ambient sky/ground bounce */}
				<hemisphereLight args={["#87CEEB", "#2f9e44", 0.6]} />

				{/* Main Sun - Steep angle for dramatic shadows */}
				<directionalLight
					position={[50, 80, 30]}
					intensity={1.5}
					color="#ffeaa7"
					castShadow
					shadow-mapSize={[4096, 4096]}
					shadow-camera-left={-30}
					shadow-camera-right={30}
					shadow-camera-top={30}
					shadow-camera-bottom={-30}
				/>

				{/* Rim Light - Warm orange backlight for edge highlights */}
				<spotLight
					position={[-50, 20, -20]}
					target-position={[0, 0, 0]}
					intensity={2.0}
					color="#fbbf24"
					angle={Math.PI / 4}
					penumbra={0.5}
				/>

				{/* Physics World */}
				<Physics
					gravity={[0, -9.8, 0]}
					defaultContactMaterial={{ restitution: 0.3 }}
				>
					{/* Simulation Controller - Runs day/night timer */}
					<SimulationController foodCount={foodCount} />

					{/* Environment */}
					<Arena />

					{/* Blobs - Dynamic entities */}
					{blobs.map((blob) => (
						<Blob
							key={blob.id}
							id={blob.id}
							position={blob.position}
							genome={blob.genome}
							debugMode={debugMode}
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

				{/* Camera Controls - Fake isometric with locked angle */}
				<OrbitControls
					enableDamping
					dampingFactor={0.05}
					minDistance={10}
					maxDistance={60}
					minPolarAngle={Math.PI / 6}
					maxPolarAngle={Math.PI / 3}
				/>
			</Canvas>
		</div>
	);
}

export default App;
