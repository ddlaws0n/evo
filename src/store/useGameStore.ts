import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";
import { createRandomGenome, type Genome, mutate } from "../utils/genetics";

export interface BlobEntity {
	id: string;
	position: [number, number, number];
	energy: number;
	genome: Genome;
	foodEaten: number;
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
	syncBlobPosition: (id: string, position: [number, number, number]) => void;
	incrementFoodEaten: (id: string) => void;
	resetFoodEaten: (id: string) => void;
	reproduceBlob: (
		parentId: string,
		currentPosition: [number, number, number],
	) => void;
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
			genome: createRandomGenome(),
			foodEaten: 0,
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

	syncBlobPosition: (id: string, position: [number, number, number]) => {
		set((state) => ({
			blobs: state.blobs.map((blob) =>
				blob.id === id ? { ...blob, position } : blob,
			),
		}));
	},

	incrementFoodEaten: (id: string) => {
		set((state) => ({
			blobs: state.blobs.map((blob) =>
				blob.id === id ? { ...blob, foodEaten: blob.foodEaten + 1 } : blob,
			),
		}));
	},

	resetFoodEaten: (id: string) => {
		set((state) => ({
			blobs: state.blobs.map((blob) =>
				blob.id === id ? { ...blob, foodEaten: 0 } : blob,
			),
		}));
	},

	reproduceBlob: (
		parentId: string,
		currentPosition: [number, number, number],
	) => {
		set((state) => {
			const parent = state.blobs.find((b) => b.id === parentId);
			if (!parent) return state;

			// Create mutated genome for baby
			const babyGenome = mutate(parent.genome);

			// Calculate spawn offset to avoid physics explosion
			// Offset = (parent size + baby size) * 1.5 in random direction
			const offset = (parent.genome.size + babyGenome.size) * 2.5;
			const angle = Math.random() * Math.PI * 2;
			const babyPosition: [number, number, number] = [
				currentPosition[0] + Math.cos(angle) * offset,
				currentPosition[1],
				currentPosition[2] + Math.sin(angle) * offset,
			];

			const baby: BlobEntity = {
				id: uuidv4(),
				position: babyPosition,
				energy: 100,
				genome: babyGenome,
				foodEaten: 0,
			};

			return {
				blobs: [...state.blobs, baby],
			};
		});
	},
}));
