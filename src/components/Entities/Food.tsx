import type { Triplet } from "@react-three/cannon";
import { useBox } from "@react-three/cannon";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

// Static rotation for leaf (C6 optimization)
const LEAF_ROTATION: Triplet = [0, 0, Math.PI / 4];

interface FoodProps {
	id: string;
	position?: Triplet;
	size?: number;
}

/**
 * Food - Apple resource entity
 * A red apple that Blobs hunt and consume
 * Ghost physics body - blobs pass through it (no collision response)
 * Visual mesh bobs gently while physics anchor stays fixed
 */
export function Food({
	id: _id,
	position = [0, 0.5, 0],
	size = 0.4,
}: FoodProps) {
	// Visual ref for bobbing animation (separate from physics)
	const visualRef = useRef<THREE.Group>(null);

	const appleRadius = size * 0.6;

	// Memoized positions (C6 optimization)
	const stemPosition = useMemo<Triplet>(
		() => [0, appleRadius + 0.04, 0],
		[appleRadius],
	);
	const leafPosition = useMemo<Triplet>(
		() => [0.06, appleRadius + 0.08, 0],
		[appleRadius],
	);

	// Memoized geometries (C6 fix)
	const appleGeometry = useMemo(
		() => new THREE.SphereGeometry(appleRadius, 16, 16),
		[appleRadius],
	);
	const stemGeometry = useMemo(
		() => new THREE.CylinderGeometry(0.03, 0.04, 0.12, 8),
		[],
	);
	const leafGeometry = useMemo(() => new THREE.PlaneGeometry(0.1, 0.06), []);

	// Memoized materials (C6 fix)
	const appleMaterial = useMemo(
		() => new THREE.MeshStandardMaterial({ color: "#dc2626", roughness: 0.6 }),
		[],
	);
	const stemMaterial = useMemo(
		() => new THREE.MeshStandardMaterial({ color: "#78350f", roughness: 0.8 }),
		[],
	);
	const leafMaterial = useMemo(
		() =>
			new THREE.MeshStandardMaterial({
				color: "#22c55e",
				side: THREE.DoubleSide,
				roughness: 0.7,
			}),
		[],
	);

	// Cleanup on unmount (C6 fix)
	useEffect(() => {
		return () => {
			appleGeometry.dispose();
			stemGeometry.dispose();
			leafGeometry.dispose();
			appleMaterial.dispose();
			stemMaterial.dispose();
			leafMaterial.dispose();
		};
	}, [
		appleGeometry,
		stemGeometry,
		leafGeometry,
		appleMaterial,
		stemMaterial,
		leafMaterial,
	]);

	// Ghost physics body - stationary anchor
	const [physicsRef] = useBox<THREE.Group>(() => ({
		type: "Static",
		args: [size, size, size] as Triplet,
		position,
		collisionResponse: false, // Blobs pass through instead of bouncing
	}));

	// Bobbing animation - only moves visual mesh, not physics body
	useFrame((state) => {
		if (visualRef.current) {
			visualRef.current.position.y =
				Math.sin(state.clock.elapsedTime * 2) * 0.1;
		}
	});

	return (
		// Physics Body (Anchor - stationary)
		<group ref={physicsRef}>
			{/* Visual Child (Bobbing) */}
			<group ref={visualRef}>
				{/* Apple body - red sphere */}
				<mesh castShadow geometry={appleGeometry} material={appleMaterial} />

				{/* Stem - brown cylinder */}
				<mesh
					position={stemPosition}
					castShadow
					geometry={stemGeometry}
					material={stemMaterial}
				/>

				{/* Leaf - small green plane */}
				<mesh
					position={leafPosition}
					rotation={LEAF_ROTATION}
					geometry={leafGeometry}
					material={leafMaterial}
				/>
			</group>
		</group>
	);
}
