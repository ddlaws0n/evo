import type { FoodEntity } from "../store/useGameStore";

// Arena and physics constants
export const ARENA_RADIUS = 17; // Hard boundary - will teleport back if exceeded
export const SOFT_BOUNDARY = 14; // Soft boundary - start pushing back
export const HUNT_FORCE = 4.0;
export const WANDER_FORCE = 0.8;
export const SOFT_RETURN_FORCE = 3.0;
export const EAT_DISTANCE = 1.5;

/**
 * Calculate 2D distance on the XZ plane (ignores Y axis)
 */
export function distance2D(
	a: { x: number; z: number },
	b: { x: number; z: number },
): number {
	return Math.hypot(a.x - b.x, a.z - b.z);
}

/**
 * Calculate boundary force that pushes the blob back toward center
 * when approaching the soft boundary
 *
 * @param blobPos Current blob position (x, z)
 * @returns Force vector {x, z} to apply (zero if inside soft boundary)
 */
export function calculateBoundaryForce(blobPos: {
	x: number;
	z: number;
}): { x: number; z: number } {
	const distanceFromCenter = Math.hypot(blobPos.x, blobPos.z);

	// No force if inside soft boundary
	if (distanceFromCenter <= SOFT_BOUNDARY) {
		return { x: 0, z: 0 };
	}

	// Force increases as blob gets closer to hard boundary
	const boundaryPressure =
		(distanceFromCenter - SOFT_BOUNDARY) / (ARENA_RADIUS - SOFT_BOUNDARY);
	const returnStrength = SOFT_RETURN_FORCE * boundaryPressure * 2;

	// Normalized direction toward center, scaled by return strength
	return {
		x: (-blobPos.x / distanceFromCenter) * returnStrength,
		z: (-blobPos.z / distanceFromCenter) * returnStrength,
	};
}

/**
 * Find the nearest food within sense radius and calculate steering direction
 *
 * @param blobPos Current blob position (x, z)
 * @param senseRadius Detection radius for food
 * @param foods Array of available food entities
 * @param wanderSeed Seed for wander behavior (e.g., elapsed time + position offset)
 * @returns Steering result with direction, force magnitude, target info
 */
export function calculateSteeringForce(
	blobPos: { x: number; z: number },
	senseRadius: number,
	foods: FoodEntity[],
	wanderSeed: number,
): {
	direction: { x: number; z: number };
	force: number;
	targetId: string | null;
	targetDistance: number;
	isHunting: boolean;
} {
	let targetFoodId: string | null = null;
	let targetDistance = Number.POSITIVE_INFINITY;
	let steerDirection: { x: number; z: number } | null = null;

	// Search for nearest food within sense radius (using 2D distance)
	for (const food of foods) {
		const dist = distance2D(
			{ x: blobPos.x, z: blobPos.z },
			{ x: food.position[0], z: food.position[2] },
		);

		if (dist <= senseRadius && dist < targetDistance) {
			targetDistance = dist;
			targetFoodId = food.id;

			// Calculate normalized direction toward food
			const dx = food.position[0] - blobPos.x;
			const dz = food.position[2] - blobPos.z;
			const len = Math.hypot(dx, dz);

			if (len > 0.01) {
				steerDirection = { x: dx / len, z: dz / len };
			}
		}
	}

	// If food found, hunt it
	if (steerDirection && targetFoodId) {
		return {
			direction: steerDirection,
			force: HUNT_FORCE,
			targetId: targetFoodId,
			targetDistance,
			isHunting: true,
		};
	}

	// Otherwise, wander randomly using seed
	const wanderDirection = {
		x: Math.sin(wanderSeed),
		z: Math.cos(wanderSeed),
	};

	return {
		direction: wanderDirection,
		force: WANDER_FORCE,
		targetId: null,
		targetDistance: Number.POSITIVE_INFINITY,
		isHunting: false,
	};
}
