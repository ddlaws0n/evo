import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

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
 * Generate random position within arena radius
 */
const generatePosition = (radius: number): [number, number, number] => {
	const angle = Math.random() * Math.PI * 2;
	const distance = Math.random() * radius;
	return [
		Math.cos(angle) * distance,
		1, // Spawn above ground
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
			position: generatePosition(15),
			energy: 100,
			senseRadius: 5.0,
		}));

		const foods: FoodEntity[] = Array.from({ length: foodCount }, () => ({
			id: uuidv4(),
			position: generatePosition(18),
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
