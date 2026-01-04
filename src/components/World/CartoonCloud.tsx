import type { Triplet } from "@react-three/cannon";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

// Static puff positions (C6 optimization)
const MAIN_PUFF_POSITION: Triplet = [0, 0, 0];
const LEFT_PUFF_POSITION: Triplet = [-0.8, -0.2, 0];
const RIGHT_PUFF_POSITION: Triplet = [0.9, -0.1, 0];
const BACK_PUFF_POSITION: Triplet = [0.2, 0.1, -0.5];
const FRONT_PUFF_POSITION: Triplet = [-0.3, -0.1, 0.4];

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
	const mainPuffGeometry = useMemo(
		() => new THREE.SphereGeometry(1, 16, 16),
		[],
	);
	const leftPuffGeometry = useMemo(
		() => new THREE.SphereGeometry(0.7, 16, 16),
		[],
	);
	const rightPuffGeometry = useMemo(
		() => new THREE.SphereGeometry(0.8, 16, 16),
		[],
	);
	const backPuffGeometry = useMemo(
		() => new THREE.SphereGeometry(0.6, 16, 16),
		[],
	);
	const frontPuffGeometry = useMemo(
		() => new THREE.SphereGeometry(0.5, 16, 16),
		[],
	);

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
	}, [
		mainPuffGeometry,
		leftPuffGeometry,
		rightPuffGeometry,
		backPuffGeometry,
		frontPuffGeometry,
		cloudMaterial,
	]);

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
			<mesh
				position={MAIN_PUFF_POSITION}
				geometry={mainPuffGeometry}
				material={cloudMaterial}
			/>

			{/* Left puff */}
			<mesh
				position={LEFT_PUFF_POSITION}
				geometry={leftPuffGeometry}
				material={cloudMaterial}
			/>

			{/* Right puff */}
			<mesh
				position={RIGHT_PUFF_POSITION}
				geometry={rightPuffGeometry}
				material={cloudMaterial}
			/>

			{/* Back puff */}
			<mesh
				position={BACK_PUFF_POSITION}
				geometry={backPuffGeometry}
				material={cloudMaterial}
			/>

			{/* Front puff */}
			<mesh
				position={FRONT_PUFF_POSITION}
				geometry={frontPuffGeometry}
				material={cloudMaterial}
			/>
		</group>
	);
}
