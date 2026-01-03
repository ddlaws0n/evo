import * as THREE from "three";

/**
 * Genome - Genetic traits that define a blob's characteristics
 *
 * These values are passed down from parent to offspring with mutation.
 * Each trait has a defined range and affects both behavior and appearance.
 */
export interface Genome {
	speed: number; // Force multiplier (0.5 - 2.0)
	size: number; // Physical radius (0.3 - 1.0)
	sense: number; // Detection radius (3.0 - 15.0)
}

// Trait ranges (min, max)
const SPEED_RANGE: [number, number] = [0.5, 2.0];
const SIZE_RANGE: [number, number] = [0.3, 1.0];
const SENSE_RANGE: [number, number] = [3.0, 15.0];

// Mutation magnitude (±5%)
const MUTATION_RANGE = 0.05;

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

/**
 * Generate a random number in range [-magnitude, +magnitude]
 */
function randomRange(magnitude: number): number {
	return (Math.random() * 2 - 1) * magnitude;
}

/**
 * Generate a random value within a trait's range
 */
function randomInRange(min: number, max: number): number {
	return min + Math.random() * (max - min);
}

/**
 * Create a random genome for initial population
 */
export function createRandomGenome(): Genome {
	return {
		speed: randomInRange(...SPEED_RANGE),
		size: randomInRange(...SIZE_RANGE),
		sense: randomInRange(...SENSE_RANGE),
	};
}

/**
 * Create a mutated copy of a parent genome
 *
 * Each trait is modified by ±5% (multiplicative) and clamped to valid range.
 * This produces subtle variation while keeping offspring similar to parent.
 */
export function mutate(genome: Genome): Genome {
	return {
		speed: clamp(
			genome.speed * (1 + randomRange(MUTATION_RANGE)),
			...SPEED_RANGE,
		),
		size: clamp(genome.size * (1 + randomRange(MUTATION_RANGE)), ...SIZE_RANGE),
		sense: clamp(
			genome.sense * (1 + randomRange(MUTATION_RANGE)),
			...SENSE_RANGE,
		),
	};
}

/**
 * Calculate blob color based on speed and sense traits
 *
 * Uses "diegetic UI" approach where traits are visible through color:
 * - High Speed → Cyan tint (looks "electric")
 * - High Sense → Magenta tint (looks "brainy")
 * - Both high → Violet blend
 * - Both low → White/grey neutral
 */
export function getBlobColor(speed: number, sense: number): string {
	// Normalize traits to 0-1 range
	const normalizedSpeed =
		(speed - SPEED_RANGE[0]) / (SPEED_RANGE[1] - SPEED_RANGE[0]);
	const normalizedSense =
		(sense - SENSE_RANGE[0]) / (SENSE_RANGE[1] - SENSE_RANGE[0]);

	// Start with neutral pink base (current blob color)
	const baseColor = new THREE.Color("#f472b6");

	// Blend toward cyan for speed
	const speedColor = new THREE.Color("#22d3ee"); // Cyan
	baseColor.lerp(speedColor, normalizedSpeed * 0.6);

	// Blend toward magenta for sense
	const senseColor = new THREE.Color("#e879f9"); // Fuchsia
	baseColor.lerp(senseColor, normalizedSense * 0.4);

	return `#${baseColor.getHexString()}`;
}
