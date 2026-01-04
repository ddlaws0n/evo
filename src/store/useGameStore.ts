import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";
import { createRandomGenome, type Genome, mutate } from "../utils/genetics";
import { logAsync } from "../utils/logger";
import { SPAWN_RADIUS } from "../utils/steering";

export type SimulationPhase = "DAY" | "SUNSET" | "NIGHT";

export interface BlobEntity {
	id: string;
	position: [number, number, number];
	energy: number;
	genome: Genome;
	foodEaten: number;
	// Sprint 7: Predation state
	beingEatenBy: string | null;
	beingEatenPosition: [number, number, number] | null;
}

export interface FoodEntity {
	id: string;
	position: [number, number, number];
}

interface GameState {
	// Entities
	blobs: BlobEntity[];
	foods: FoodEntity[];

	// Entity lookup maps for O(1) access (C9 fix)
	blobsById: Map<string, BlobEntity>;
	foodsById: Map<string, FoodEntity>;

	// Simulation state
	day: number;
	phase: SimulationPhase;
	timeRemaining: number;
	dayDuration: number;
	deadThisDay: number;

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
	// Sprint 7: Timer and phase actions
	setTimeRemaining: (time: number) => void;
	startSunset: () => void;
	startNight: () => void;
	startDay: () => void;
	runJudgment: (foodCount: number) => void;
	// Sprint 7: Death and predation
	removeBlob: (id: string) => void;
	markBlobAsEaten: (
		preyId: string,
		predatorId: string,
		predatorPosition: [number, number, number],
	) => void;
}

/**
 * Generate random position for blobs at arena edge (spawn ring)
 */
const generateEdgePosition = (): [number, number, number] => {
	const angle = Math.random() * Math.PI * 2;
	return [
		Math.cos(angle) * SPAWN_RADIUS,
		1, // Spawn above ground - will fall
		Math.sin(angle) * SPAWN_RADIUS,
	];
};

/**
 * Generate random position for food (on the ground)
 * Food spawns in center area during day reset
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

/**
 * Build lookup map from entity array (C9 fix)
 */
const buildBlobMap = (blobs: BlobEntity[]): Map<string, BlobEntity> =>
	new Map(blobs.map((b) => [b.id, b]));

const buildFoodMap = (foods: FoodEntity[]): Map<string, FoodEntity> =>
	new Map(foods.map((f) => [f.id, f]));

export const useGameStore = create<GameState>((set) => ({
	blobs: [],
	foods: [],
	blobsById: new Map(),
	foodsById: new Map(),
	day: 1,
	phase: "DAY",
	timeRemaining: 30,
	dayDuration: 30,
	deadThisDay: 0,

	setupSimulation: (blobCount: number, foodCount: number) => {
		const blobs: BlobEntity[] = Array.from({ length: blobCount }, () => ({
			id: uuidv4(),
			position: generateEdgePosition(), // Start at edge
			energy: 100,
			genome: createRandomGenome(),
			foodEaten: 0,
			beingEatenBy: null,
			beingEatenPosition: null,
		}));

		const foods: FoodEntity[] = Array.from({ length: foodCount }, () => ({
			id: uuidv4(),
			position: generateFoodPosition(12), // Center area
		}));

		set({
			blobs,
			foods,
			blobsById: buildBlobMap(blobs),
			foodsById: buildFoodMap(foods),
			day: 1,
			phase: "DAY",
			timeRemaining: 30,
			deadThisDay: 0,
		});
	},

	removeFood: (id: string) => {
		set((state) => {
			const newFoods = state.foods.filter((food) => food.id !== id);
			// Copy map and delete entry (O(1)) instead of rebuilding (O(N))
			const newFoodsById = new Map(state.foodsById);
			newFoodsById.delete(id);
			return {
				foods: newFoods,
				foodsById: newFoodsById,
			};
		});
	},

	updateBlobEnergy: (id: string, amount: number) => {
		set((state) => {
			const existingBlob = state.blobsById.get(id);
			if (!existingBlob) return state;

			const updatedBlob = {
				...existingBlob,
				energy: existingBlob.energy + amount,
			};
			const newBlobs = state.blobs.map((blob) =>
				blob.id === id ? updatedBlob : blob,
			);
			// Copy map and update single entry (O(1)) instead of rebuilding (O(N))
			const newBlobsById = new Map(state.blobsById);
			newBlobsById.set(id, updatedBlob);
			return { blobs: newBlobs, blobsById: newBlobsById };
		});
	},

	syncBlobPosition: (id: string, position: [number, number, number]) => {
		set((state) => {
			const existingBlob = state.blobsById.get(id);
			if (!existingBlob) return state;

			const updatedBlob = { ...existingBlob, position };
			const newBlobs = state.blobs.map((blob) =>
				blob.id === id ? updatedBlob : blob,
			);
			const newBlobsById = new Map(state.blobsById);
			newBlobsById.set(id, updatedBlob);
			return { blobs: newBlobs, blobsById: newBlobsById };
		});
	},

	incrementFoodEaten: (id: string) => {
		set((state) => {
			const existingBlob = state.blobsById.get(id);
			if (!existingBlob) return state;

			const updatedBlob = {
				...existingBlob,
				foodEaten: existingBlob.foodEaten + 1,
			};
			const newBlobs = state.blobs.map((blob) =>
				blob.id === id ? updatedBlob : blob,
			);
			const newBlobsById = new Map(state.blobsById);
			newBlobsById.set(id, updatedBlob);
			return { blobs: newBlobs, blobsById: newBlobsById };
		});
	},

	resetFoodEaten: (id: string) => {
		set((state) => {
			const existingBlob = state.blobsById.get(id);
			if (!existingBlob) return state;

			const updatedBlob = { ...existingBlob, foodEaten: 0 };
			const newBlobs = state.blobs.map((blob) =>
				blob.id === id ? updatedBlob : blob,
			);
			const newBlobsById = new Map(state.blobsById);
			newBlobsById.set(id, updatedBlob);
			return { blobs: newBlobs, blobsById: newBlobsById };
		});
	},

	reproduceBlob: (
		parentId: string,
		currentPosition: [number, number, number],
	) => {
		set((state) => {
			// Use Map lookup for O(1) access (C9 fix)
			const parent = state.blobsById.get(parentId);
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
				beingEatenBy: null,
				beingEatenPosition: null,
			};

			const newBlobs = [...state.blobs, baby];
			// Copy map and add single entry (O(1)) instead of rebuilding (O(N))
			const newBlobsById = new Map(state.blobsById);
			newBlobsById.set(baby.id, baby);
			return {
				blobs: newBlobs,
				blobsById: newBlobsById,
			};
		});
	},

	// ===================
	// SPRINT 7: Timer & Phase Actions
	// ===================

	setTimeRemaining: (time: number) => {
		set({ timeRemaining: time });
	},

	startSunset: () => {
		logAsync("🌅 SUNSET | Blobs returning home...");
		set({ phase: "SUNSET" });
	},

	startNight: () => {
		logAsync("🌙 NIGHT | Running judgment...");
		set({ phase: "NIGHT" });
	},

	startDay: () => {
		set((state) => {
			logAsync(`☀️ DAY ${state.day} START | Population: ${state.blobs.length}`);
			return { phase: "DAY", timeRemaining: 30, deadThisDay: 0 };
		});
	},

	runJudgment: (foodCount: number) => {
		set((state) => {
			const survivors: BlobEntity[] = [];
			const babies: BlobEntity[] = [];

			for (const blob of state.blobs) {
				// Skip blobs being eaten (they'll be removed by predation)
				if (blob.beingEatenBy) continue;

				if (blob.foodEaten < 1) {
					// DEATH: Didn't eat anything (just skip, don't add to survivors)
				} else if (blob.foodEaten >= 2) {
					// REPRODUCE: Ate 2+ food
					survivors.push({
						...blob,
						foodEaten: 0,
						energy: 100,
						position: generateEdgePosition(),
						beingEatenBy: null,
						beingEatenPosition: null,
					});

					// Create baby with mutated genome
					const babyGenome = mutate(blob.genome);
					babies.push({
						id: uuidv4(),
						position: generateEdgePosition(),
						energy: 100,
						genome: babyGenome,
						foodEaten: 0,
						beingEatenBy: null,
						beingEatenPosition: null,
					});
				} else {
					// SURVIVE: Ate exactly 1 food
					survivors.push({
						...blob,
						foodEaten: 0,
						energy: 100,
						position: generateEdgePosition(),
						beingEatenBy: null,
						beingEatenPosition: null,
					});
				}
			}

			// Generate new food batch in center
			const newFoods: FoodEntity[] = Array.from({ length: foodCount }, () => ({
				id: uuidv4(),
				position: generateFoodPosition(12),
			}));

			// Log judgment results
			logAsync(
				`📊 JUDGMENT | Survivors: ${survivors.length} | ` +
					`Died: ${state.blobs.length - survivors.length - babies.length} | ` +
					`Reproduced: ${babies.length}`,
			);

			const newBlobs = [...survivors, ...babies];
			return {
				blobs: newBlobs,
				foods: newFoods,
				blobsById: buildBlobMap(newBlobs),
				foodsById: buildFoodMap(newFoods),
				day: state.day + 1,
				phase: "DAY" as SimulationPhase,
				timeRemaining: 30,
				deadThisDay: 0,
			};
		});
	},

	// ===================
	// SPRINT 7: Death & Predation
	// ===================

	removeBlob: (id: string) => {
		logAsync(`💀 Blob removed | ID: ${id.slice(0, 8)}`);
		set((state) => {
			const newBlobs = state.blobs.filter((blob) => blob.id !== id);
			// Copy map and delete entry (O(1)) instead of rebuilding (O(N))
			const newBlobsById = new Map(state.blobsById);
			newBlobsById.delete(id);
			return {
				blobs: newBlobs,
				blobsById: newBlobsById,
				deadThisDay: state.deadThisDay + 1,
			};
		});
	},

	markBlobAsEaten: (
		preyId: string,
		predatorId: string,
		predatorPosition: [number, number, number],
	) => {
		set((state) => {
			const existingBlob = state.blobsById.get(preyId);
			if (!existingBlob) return state;

			const updatedBlob = {
				...existingBlob,
				beingEatenBy: predatorId,
				beingEatenPosition: predatorPosition,
			};
			const newBlobs = state.blobs.map((blob) =>
				blob.id === preyId ? updatedBlob : blob,
			);
			const newBlobsById = new Map(state.blobsById);
			newBlobsById.set(preyId, updatedBlob);
			return { blobs: newBlobs, blobsById: newBlobsById };
		});
	},
}));
