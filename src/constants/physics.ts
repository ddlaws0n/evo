/**
 * Physics and Arena Constants
 * Single source of truth for arena dimensions and physics values
 */

// Arena boundaries
export const ARENA_RADIUS = 17; // Hard boundary - entities teleport back if exceeded
export const SOFT_BOUNDARY = 14; // Soft boundary - start pushing back toward center
export const SPAWN_RADIUS = 16.5; // Edge spawn ring (between soft and hard boundary)

// Physics forces
export const HUNT_FORCE = 4.0;
export const WANDER_FORCE = 0.8;
export const SOFT_RETURN_FORCE = 3.0;
export const FLEE_FORCE = 5.0; // Fleeing force (faster than hunt for survival)
export const RETURN_FORCE = 4.0; // Return to edge force

// Interaction distances
export const EAT_DISTANCE = 1.5;
export const PREDATION_SIZE_RATIO = 1.2; // Must be 20% larger to eat another blob

// Energy system constants (formula: C_SPEED * speed² + C_SIZE * size³ + C_SENSE * sense)
export const C_SPEED = 0.02; // Speed energy coefficient (speed²)
export const C_SIZE = 0.005; // Size energy coefficient (size³) - reduced to enable large predators
export const C_SENSE = 0.015; // Sense energy coefficient (sense) - increased for trade-off

// SUNSET phase constants
export const EDGE_THRESHOLD = SPAWN_RADIUS - 1; // Distance to trigger "at edge" detection (15.5 units)
export const SUNSET_FAILSAFE_MS = 10000; // Max SUNSET duration in milliseconds (10 seconds)
export const FAST_FORWARD_MULTIPLIER = 5; // Speed multiplier when all food is consumed
