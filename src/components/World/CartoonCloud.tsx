import type { Triplet } from "@react-three/cannon";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

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

	// Memoized geometries (C6 fix) - static sizes, shared across clouds
	const mainPuffGeometry = useMemo(() => new THREE.SphereGeometry(1, 16, 16), []);
	const leftPuffGeometry = useMemo(() => new THREE.SphereGeometry(0.7, 16, 16), []);
	const rightPuffGeometry = useMemo(() => new THREE.SphereGeometry(0.8, 16, 16), []);
	const backPuffGeometry = useMemo(() => new THREE.SphereGeometry(0.6, 16, 16), []);
	const frontPuffGeometry = useMemo(() => new THREE.SphereGeometry(0.5, 16, 16), []);

	// Shared material for all puffs (C6 fix)
	const cloudMaterial = useMemo(
		() => new THREE.MeshBasicMaterial({ color: "#ffffff" }),
		[],
	);

	// Cleanup on unmount (C6 fix)
	useEffect(() => {
		return () => {
			mainPuffGeometry.dispose();
			leftPuffGeometry.dispose();
			rightPuffGeometry.dispose();
			backPuffGeometry.dispose();
			frontPuffGeometry.dispose();
			cloudMaterial.dispose();
		};
	}, [mainPuffGeometry, leftPuffGeometry, rightPuffGeometry, backPuffGeometry, frontPuffGeometry, cloudMaterial]);

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
			<mesh position={[0, 0, 0]} geometry={mainPuffGeometry} material={cloudMaterial} />

			{/* Left puff */}
			<mesh position={[-0.8, -0.2, 0]} geometry={leftPuffGeometry} material={cloudMaterial} />

			{/* Right puff */}
			<mesh position={[0.9, -0.1, 0]} geometry={rightPuffGeometry} material={cloudMaterial} />

			{/* Back puff */}
			<mesh position={[0.2, 0.1, -0.5]} geometry={backPuffGeometry} material={cloudMaterial} />

			{/* Front puff */}
			<mesh position={[-0.3, -0.1, 0.4]} geometry={frontPuffGeometry} material={cloudMaterial} />
		</group>
	);
}
