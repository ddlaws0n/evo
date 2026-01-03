import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";

export interface BlobEntity {
	id: string;
	position: [number, number, number];
	energy: number;
	senseRadius: number;
}

export interface FoodEntity {
	id: string;
	position: [number, number, number];
}

interface GameState {
	// Entities
	blobs: BlobEntity[];
	foods: FoodEntity[];

	// Simulation state
	day: number;

	// Actions
	setupSimulation: (blobCount: number, foodCount: number) => void;
	removeFood: (id: string) => void;
	updateBlobEnergy: (id: string, amount: number) => void;
}

/**
 * Generate random position for blobs (spawn above ground to fall)
 */
const generateBlobPosition = (radius: number): [number, number, number] => {
	const angle = Math.random() * Math.PI * 2;
	const distance = Math.random() * radius;
	return [
		Math.cos(angle) * distance,
		1, // Spawn above ground - will fall
		Math.sin(angle) * distance,
	];
};

/**
 * Generate random position for food (on the ground)
 * Food is static so it stays where spawned
 */
const generateFoodPosition = (radius: number): [number, number, number] => {
	const angle = Math.random() * Math.PI * 2;
	const distance = Math.random() * radius;
	return [
		Math.cos(angle) * distance,
		0.4, // On the ground (food size is 0.4, so center at 0.4 sits on Y=0 floor)
		Math.sin(angle) * distance,
	];
};

export const useGameStore = create<GameState>((set) => ({
	blobs: [],
	foods: [],
	day: 1,

	setupSimulation: (blobCount: number, foodCount: number) => {
		const blobs: BlobEntity[] = Array.from({ length: blobCount }, () => ({
			id: uuidv4(),
			position: generateBlobPosition(15),
			energy: 100,
			senseRadius: 8.0, // Increased from 5.0 for better detection
		}));

		const foods: FoodEntity[] = Array.from({ length: foodCount }, () => ({
			id: uuidv4(),
			position: generateFoodPosition(16), // Reduced from 18 to keep food well inside
		}));

		set({ blobs, foods });
	},

	removeFood: (id: string) => {
		set((state) => ({
			foods: state.foods.filter((food) => food.id !== id),
		}));
	},

	updateBlobEnergy: (id: string, amount: number) => {
		set((state) => ({
			blobs: state.blobs.map((blob) =>
				blob.id === id ? { ...blob, energy: blob.energy + amount } : blob,
			),
		}));
	},
}));
