import { useRef } from "react";
import type { BlobEntity, FoodEntity } from "../store/useGameStore";
import {
	calculateBoundaryForce,
	calculateSteeringForce,
	distance2D,
	EAT_DISTANCE,
	FLEE_FORCE,
	HUNT_FORCE,
	PREDATION_SIZE_RATIO,
	RETURN_FORCE,
	SOFT_BOUNDARY,
	SPAWN_RADIUS,
} from "../utils/steering";

/**
 * Blob Brain States - Explicit Finite State Machine
 * Sprint 7: Added FLEEING state for predation avoidance
 */
export type BlobState =
	| "WANDERING"
	| "HUNTING"
	| "RETURNING"
	| "EATING"
	| "FLEEING";

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
	targetType: "food" | "blob" | null; // Sprint 7: Distinguish food vs prey
}

/**
 * useBlobBrain - The decision-making logic for a Blob
 *
 * Implements an explicit Finite State Machine to replace implicit if/else logic.
 * This hook manages internal state via refs to avoid triggering React re-renders.
 *
 * States (priority order):
 * - FLEEING: Predator detected, running away (highest priority)
 * - EATING: Close enough to consume food or prey
 * - RETURNING: End of day approaching, heading to edge
 * - HUNTING: Food or prey detected within sense radius
 * - WANDERING: No target detected, moving randomly (default)
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
	 *
	 * @param blobPos Current blob position (x, z)
	 * @param senseRadius Detection radius for food and other blobs
	 * @param foods Array of available food entities
	 * @param blobs Array of all blob entities (for predation)
	 * @param myId This blob's ID (to exclude self from blob checks)
	 * @param mySize This blob's size (for predation calculations)
	 * @param wanderSeed Seed for wander behavior
	 * @param speedMultiplier Genome speed trait (0.5-2.0) to scale forces
	 * @param timeRemaining Seconds left in current day (for RETURNING trigger)
	 */
	const tick = (
		blobPos: { x: number; z: number },
		senseRadius: number,
		foods: FoodEntity[],
		blobs: BlobEntity[],
		myId: string,
		mySize: number,
		wanderSeed: number,
		speedMultiplier: number = 1.0,
		timeRemaining: number = 30,
	): BrainOutput => {
		const distanceFromCenter = Math.hypot(blobPos.x, blobPos.z);

		// ===================
		// THREAT DETECTION (FLEEING)
		// ===================
		let threatId: string | null = null;
		let threatDistance = Number.POSITIVE_INFINITY;
		let fleeDirection: { x: number; z: number } | null = null;

		for (const blob of blobs) {
			if (blob.id === myId) continue;
			if (blob.beingEatenBy) continue; // Skip blobs being eaten

			// Quick reject: bounding box check before distance calc
			if (Math.abs(blob.position[0] - blobPos.x) > senseRadius) continue;
			if (Math.abs(blob.position[2] - blobPos.z) > senseRadius) continue;

			const dist = distance2D(blobPos, {
				x: blob.position[0],
				z: blob.position[2],
			});

			// Threat if blob is 20% larger and within MY sense radius
			if (
				blob.genome.size > mySize * PREDATION_SIZE_RATIO &&
				dist < senseRadius &&
				dist < threatDistance
			) {
				threatId = blob.id;
				threatDistance = dist;

				// Flee direction: AWAY from threat
				const len = dist > 0.01 ? dist : 0.01;
				fleeDirection = {
					x: -(blob.position[0] - blobPos.x) / len,
					z: -(blob.position[2] - blobPos.z) / len,
				};
			}
		}

		// FLEEING takes highest priority
		if (threatId && fleeDirection) {
			currentStateRef.current = "FLEEING";
			lastTargetIdRef.current = threatId;

			const steeringVector = {
				x: fleeDirection.x * FLEE_FORCE * speedMultiplier,
				z: fleeDirection.z * FLEE_FORCE * speedMultiplier,
			};

			// When fleeing, still apply boundary force to avoid escaping arena
			const boundaryVector = calculateBoundaryForce(blobPos);

			return {
				state: "FLEEING",
				steeringVector,
				boundaryVector,
				totalForce: {
					x: steeringVector.x + boundaryVector.x,
					z: steeringVector.z + boundaryVector.z,
				},
				targetId: threatId,
				targetDistance: threatDistance,
				targetType: "blob",
			};
		}

		// ===================
		// PREY DETECTION (Predation)
		// ===================
		let preyId: string | null = null;
		let preyDistance = Number.POSITIVE_INFINITY;
		let preyDirection: { x: number; z: number } | null = null;

		for (const blob of blobs) {
			if (blob.id === myId) continue;
			if (blob.beingEatenBy) continue; // Skip blobs being eaten

			// Quick reject
			if (Math.abs(blob.position[0] - blobPos.x) > senseRadius) continue;
			if (Math.abs(blob.position[2] - blobPos.z) > senseRadius) continue;

			const dist = distance2D(blobPos, {
				x: blob.position[0],
				z: blob.position[2],
			});

			// Can eat if 20% larger and within sense radius
			if (
				mySize > blob.genome.size * PREDATION_SIZE_RATIO &&
				dist < senseRadius &&
				dist < preyDistance
			) {
				preyId = blob.id;
				preyDistance = dist;

				const len = dist > 0.01 ? dist : 0.01;
				preyDirection = {
					x: (blob.position[0] - blobPos.x) / len,
					z: (blob.position[2] - blobPos.z) / len,
				};
			}
		}

		// ===================
		// FOOD DETECTION
		// ===================
		const foodSteering = calculateSteeringForce(
			blobPos,
			senseRadius,
			foods,
			wanderSeed,
			speedMultiplier,
		);

		// ===================
		// RETURNING CHECK (90% timer elapsed = 3s remaining)
		// ===================
		const shouldReturn = timeRemaining <= 3;

		if (shouldReturn) {
			currentStateRef.current = "RETURNING";

			// Calculate return direction: toward edge (outward)
			let returnDirection: { x: number; z: number };

			if (distanceFromCenter < 0.1) {
				// At center, pick random outward direction
				const angle = wanderSeed; // Use wander seed for consistency
				returnDirection = { x: Math.cos(angle), z: Math.sin(angle) };
			} else {
				// Head outward toward edge
				returnDirection = {
					x: blobPos.x / distanceFromCenter,
					z: blobPos.z / distanceFromCenter,
				};
			}

			// If already at edge, slow down
			const atEdge = distanceFromCenter >= SPAWN_RADIUS - 1;
			const returnForce = atEdge ? 0.5 : RETURN_FORCE * speedMultiplier;

			const steeringVector = {
				x: returnDirection.x * returnForce,
				z: returnDirection.z * returnForce,
			};

			// No boundary force when RETURNING - let blob reach edge
			return {
				state: "RETURNING",
				steeringVector,
				boundaryVector: { x: 0, z: 0 },
				totalForce: steeringVector,
				targetId: null,
				targetDistance: Number.POSITIVE_INFINITY,
				targetType: null,
			};
		}

		// ===================
		// EATING CHECK (food or prey)
		// ===================
		// Check if eating prey (closer and within eat distance)
		if (preyId && preyDistance < EAT_DISTANCE) {
			currentStateRef.current = "EATING";
			lastTargetIdRef.current = preyId;

			return {
				state: "EATING",
				steeringVector: { x: 0, z: 0 },
				boundaryVector: { x: 0, z: 0 },
				totalForce: { x: 0, z: 0 },
				targetId: preyId,
				targetDistance: preyDistance,
				targetType: "blob",
			};
		}

		// Check if eating food
		if (
			foodSteering.targetId &&
			foodSteering.targetDistance < EAT_DISTANCE &&
			foodSteering.isHunting
		) {
			currentStateRef.current = "EATING";
			lastTargetIdRef.current = foodSteering.targetId;

			return {
				state: "EATING",
				steeringVector: { x: 0, z: 0 },
				boundaryVector: { x: 0, z: 0 },
				totalForce: { x: 0, z: 0 },
				targetId: foodSteering.targetId,
				targetDistance: foodSteering.targetDistance,
				targetType: "food",
			};
		}

		// ===================
		// HUNTING (prey or food, prefer closer target)
		// ===================
		const boundaryVector = calculateBoundaryForce(blobPos);

		// Prefer prey if closer than food
		if (preyId && preyDirection && preyDistance < foodSteering.targetDistance) {
			currentStateRef.current = "HUNTING";
			lastTargetIdRef.current = preyId;

			const steeringVector = {
				x: preyDirection.x * HUNT_FORCE * speedMultiplier,
				z: preyDirection.z * HUNT_FORCE * speedMultiplier,
			};

			return {
				state: "HUNTING",
				steeringVector,
				boundaryVector,
				totalForce: {
					x: steeringVector.x + boundaryVector.x,
					z: steeringVector.z + boundaryVector.z,
				},
				targetId: preyId,
				targetDistance: preyDistance,
				targetType: "blob",
			};
		}

		// Hunt food if available
		if (foodSteering.isHunting) {
			currentStateRef.current = "HUNTING";
			lastTargetIdRef.current = foodSteering.targetId;

			const steeringVector = {
				x: foodSteering.direction.x * foodSteering.force,
				z: foodSteering.direction.z * foodSteering.force,
			};

			return {
				state: "HUNTING",
				steeringVector,
				boundaryVector,
				totalForce: {
					x: steeringVector.x + boundaryVector.x,
					z: steeringVector.z + boundaryVector.z,
				},
				targetId: foodSteering.targetId,
				targetDistance: foodSteering.targetDistance,
				targetType: "food",
			};
		}

		// ===================
		// BOUNDARY RETURN (pushed back by soft boundary)
		// ===================
		if (distanceFromCenter > SOFT_BOUNDARY) {
			currentStateRef.current = "RETURNING";

			const steeringVector = {
				x: foodSteering.direction.x * foodSteering.force,
				z: foodSteering.direction.z * foodSteering.force,
			};

			return {
				state: "RETURNING",
				steeringVector,
				boundaryVector,
				totalForce: {
					x: steeringVector.x + boundaryVector.x,
					z: steeringVector.z + boundaryVector.z,
				},
				targetId: null,
				targetDistance: Number.POSITIVE_INFINITY,
				targetType: null,
			};
		}

		// ===================
		// WANDERING (default)
		// ===================
		currentStateRef.current = "WANDERING";
		lastTargetIdRef.current = null;

		const steeringVector = {
			x: foodSteering.direction.x * foodSteering.force,
			z: foodSteering.direction.z * foodSteering.force,
		};

		return {
			state: "WANDERING",
			steeringVector,
			boundaryVector,
			totalForce: {
				x: steeringVector.x + boundaryVector.x,
				z: steeringVector.z + boundaryVector.z,
			},
			targetId: null,
			targetDistance: Number.POSITIVE_INFINITY,
			targetType: null,
		};
	};

	return { tick };
}
