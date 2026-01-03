import { useRef } from "react";
import type { FoodEntity } from "../store/useGameStore";
import {
	calculateBoundaryForce,
	calculateSteeringForce,
	EAT_DISTANCE,
	SOFT_BOUNDARY,
} from "../utils/steering";

/**
 * Blob Brain States - Explicit Finite State Machine
 */
export type BlobState = "WANDERING" | "HUNTING" | "RETURNING" | "EATING";

/**
 * Brain output for a single frame
 */
export interface BrainOutput {
	state: BlobState;
	steeringVector: { x: number; z: number };
	boundaryVector: { x: number; z: number };
	totalForce: { x: number; z: number };
	targetId: string | null;
	targetDistance: number;
}

/**
 * useBlobBrain - The decision-making logic for a Blob
 *
 * Implements an explicit Finite State Machine to replace implicit if/else logic.
 * This hook manages internal state via refs to avoid triggering React re-renders.
 *
 * States:
 * - WANDERING: No food detected, moving randomly
 * - HUNTING: Food detected within sense radius, pursuing target
 * - EATING: Close enough to consume food
 * - RETURNING: Approaching boundary, moving back to center (future: end of day)
 *
 * @returns tick function to call in useFrame with current position and game state
 */
export function useBlobBrain() {
	// Internal state managed via refs (no React re-renders)
	const currentStateRef = useRef<BlobState>("WANDERING");
	const lastTargetIdRef = useRef<string | null>(null);

	/**
	 * Process one frame of brain logic
	 * Call this inside useFrame with fresh position and store state
	 */
	const tick = (
		blobPos: { x: number; z: number },
		senseRadius: number,
		foods: FoodEntity[],
		wanderSeed: number,
	): BrainOutput => {
		// Calculate distance from arena center
		const distanceFromCenter = Math.hypot(blobPos.x, blobPos.z);

		// ===================
		// BOUNDARY DETECTION
		// ===================
		const boundaryVector = calculateBoundaryForce(blobPos);

		// If crossing soft boundary, switch to RETURNING state
		const isNearBoundary = distanceFromCenter > SOFT_BOUNDARY;

		// ===================
		// STEERING LOGIC
		// ===================
		const steering = calculateSteeringForce(
			blobPos,
			senseRadius,
			foods,
			wanderSeed,
		);

		// ===================
		// STATE TRANSITIONS
		// ===================
		let newState: BlobState = currentStateRef.current;

		// Check if we're eating (close enough to target)
		if (
			steering.targetId &&
			steering.targetDistance < EAT_DISTANCE &&
			steering.isHunting
		) {
			newState = "EATING";
		}
		// Check if we need to return due to boundary pressure
		else if (isNearBoundary) {
			newState = "RETURNING";
		}
		// Check if we're hunting food
		else if (steering.isHunting) {
			newState = "HUNTING";
		}
		// Default to wandering
		else {
			newState = "WANDERING";
		}

		// Update internal state
		currentStateRef.current = newState;
		lastTargetIdRef.current = steering.targetId;

		// ===================
		// COMBINE FORCES
		// ===================
		const steeringVector = {
			x: steering.direction.x * steering.force,
			z: steering.direction.z * steering.force,
		};

		const totalForce = {
			x: steeringVector.x + boundaryVector.x,
			z: steeringVector.z + boundaryVector.z,
		};

		return {
			state: newState,
			steeringVector,
			boundaryVector,
			totalForce,
			targetId: steering.targetId,
			targetDistance: steering.targetDistance,
		};
	};

	return { tick };
}
