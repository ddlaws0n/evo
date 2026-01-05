import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";
import { createRandomGenome, type Genome, mutate } from "../utils/genetics";
import { logAsync } from "../utils/logger";
import {
	createSpatialGrid,
	gridInsert,
	gridQueryRadius,
	gridRemove,
	gridUpdate,
	rebuildGrid,
	type SpatialGrid,
} from "../utils/spatialGrid";
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
	// Sprint 8: Generation tracking
	generation: number;
	parentId: string | null;
}

export interface FoodEntity {
	id: string;
	position: [number, number, number];
}

// Day snapshot for history tracking
export interface DaySnapshot {
	day: number;
	population: number;
	births: number;
	deaths: number;
	avgSpeed: number;
	avgSize: number;
	avgSense: number;
	maxSpeed: number;
	maxSize: number;
	maxSense: number;
	maxGeneration: number;
}

interface GameState {
	// Entities
	blobs: BlobEntity[];
	foods: FoodEntity[];

	// Entity lookup maps for O(1) access (C9 fix)
	blobsById: Map<string, BlobEntity>;
	foodsById: Map<string, FoodEntity>;

	// Spatial grids for O(N) entity detection (C1 fix)
	blobGrid: SpatialGrid;
	foodGrid: SpatialGrid;

	// Simulation state
	day: number;
	phase: SimulationPhase;
	timeRemaining: number;
	dayDuration: number;
	deadThisDay: number;

	// SUNSET tracking state
	blobsAtEdge: number; // Count of blobs that reached edge during SUNSET
	sunsetStartTime: number; // Timestamp when SUNSET began (for failsafe)

	// Sprint 8: Simulation controls
	isPaused: boolean;
	simulationSpeed: number;

	// Sprint 8: Evolution history
	history: DaySnapshot[];
	maxGeneration: number;

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
	markBlobAtEdge: (id: string) => void; // Called when blob reaches edge during SUNSET
	// Sprint 7: Death and predation
	removeBlob: (id: string) => void;
	markBlobAsEaten: (
		preyId: string,
		predatorId: string,
		predatorPosition: [number, number, number],
	) => void;
	// Spatial grid queries (C1 fix)
	getNearbyBlobIds: (x: number, z: number, radius: number) => string[];
	getNearbyFoodIds: (x: number, z: number, radius: number) => string[];
	// Sprint 8: Simulation controls
	togglePause: () => void;
	setSimulationSpeed: (speed: number) => void;
	// Sprint 8: Statistics helpers
	getPopulationStats: () => {
		avgSpeed: number;
		avgSize: number;
		avgSense: number;
		maxSpeed: number;
		maxSize: number;
		maxSense: number;
		maxGeneration: number;
	};
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

export const useGameStore = create<GameState>((set, get) => ({
	blobs: [],
	foods: [],
	blobsById: new Map(),
	foodsById: new Map(),
	blobGrid: createSpatialGrid(5), // 5-unit cells for optimal performance
	foodGrid: createSpatialGrid(5),
	day: 1,
	phase: "DAY",
	timeRemaining: 30,
	dayDuration: 30,
	deadThisDay: 0,
	// SUNSET tracking state
	blobsAtEdge: 0,
	sunsetStartTime: 0,
	// Sprint 8: Simulation controls
	isPaused: false,
	simulationSpeed: 1,
	// Sprint 8: Evolution history
	history: [],
	maxGeneration: 1,

	setupSimulation: (blobCount: number, foodCount: number) => {
		const blobs: BlobEntity[] = Array.from({ length: blobCount }, () => ({
			id: uuidv4(),
			position: generateEdgePosition(), // Start at edge
			energy: 100,
			genome: createRandomGenome(),
			foodEaten: 0,
			beingEatenBy: null,
			beingEatenPosition: null,
			generation: 1,
			parentId: null,
		}));

		const foods: FoodEntity[] = Array.from({ length: foodCount }, () => ({
			id: uuidv4(),
			position: generateFoodPosition(14), // Wider spawn area for less crowding
		}));

		// Build spatial grids
		const blobGrid = createSpatialGrid(5);
		const foodGrid = createSpatialGrid(5);
		rebuildGrid(blobGrid, blobs);
		rebuildGrid(foodGrid, foods);

		set({
			blobs,
			foods,
			blobsById: buildBlobMap(blobs),
			foodsById: buildFoodMap(foods),
			blobGrid,
			foodGrid,
			day: 1,
			phase: "DAY",
			timeRemaining: 30,
			deadThisDay: 0,
			// Reset SUNSET tracking state
			blobsAtEdge: 0,
			sunsetStartTime: 0,
			// Reset Sprint 8 state
			isPaused: false,
			history: [],
			maxGeneration: 1,
		});
	},

	removeFood: (id: string) => {
		set((state) => {
			const newFoods = state.foods.filter((food) => food.id !== id);
			// Copy map and delete entry (O(1)) instead of rebuilding (O(N))
			const newFoodsById = new Map(state.foodsById);
			newFoodsById.delete(id);
			// Remove from spatial grid
			gridRemove(state.foodGrid, id);
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
			// Update spatial grid position
			gridUpdate(state.blobGrid, id, position);
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

			const babyGeneration = parent.generation + 1;
			const baby: BlobEntity = {
				id: uuidv4(),
				position: babyPosition,
				energy: 100,
				genome: babyGenome,
				foodEaten: 0,
				beingEatenBy: null,
				beingEatenPosition: null,
				generation: babyGeneration,
				parentId: parent.id,
			};

			const newBlobs = [...state.blobs, baby];
			// Copy map and add single entry (O(1)) instead of rebuilding (O(N))
			const newBlobsById = new Map(state.blobsById);
			newBlobsById.set(baby.id, baby);
			// Add to spatial grid
			gridInsert(state.blobGrid, baby.id, baby.position);
			// Update max generation
			const newMaxGeneration = Math.max(state.maxGeneration, babyGeneration);
			return {
				blobs: newBlobs,
				blobsById: newBlobsById,
				maxGeneration: newMaxGeneration,
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
		set({ phase: "SUNSET", sunsetStartTime: Date.now() });
	},

	startNight: () => {
		logAsync("🌙 NIGHT | Running judgment...");
		set({ phase: "NIGHT" });
	},

	startDay: () => {
		set((state) => {
			logAsync(`☀️ DAY ${state.day} START | Population: ${state.blobs.length}`);
			return {
				phase: "DAY",
				timeRemaining: 30,
				deadThisDay: 0,
				blobsAtEdge: 0, // Reset for new day
			};
		});
	},

	markBlobAtEdge: (_id: string) => {
		set((state) => ({
			blobsAtEdge: state.blobsAtEdge + 1,
		}));
	},

	runJudgment: (foodCount: number) => {
		set((state) => {
			// Calculate statistics BEFORE judgment for history
			const liveBlobs = state.blobs.filter((b) => !b.beingEatenBy);
			const population = liveBlobs.length;
			const speeds = liveBlobs.map((b) => b.genome.speed);
			const sizes = liveBlobs.map((b) => b.genome.size);
			const senses = liveBlobs.map((b) => b.genome.sense);
			const generations = liveBlobs.map((b) => b.generation);

			const avgSpeed =
				population > 0 ? speeds.reduce((a, b) => a + b, 0) / population : 0;
			const avgSize =
				population > 0 ? sizes.reduce((a, b) => a + b, 0) / population : 0;
			const avgSense =
				population > 0 ? senses.reduce((a, b) => a + b, 0) / population : 0;
			const maxSpeed = population > 0 ? Math.max(...speeds) : 0;
			const maxSize = population > 0 ? Math.max(...sizes) : 0;
			const maxSense = population > 0 ? Math.max(...senses) : 0;
			const maxGen = population > 0 ? Math.max(...generations) : 0;

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

					// Create baby with mutated genome and generation tracking
					const babyGenome = mutate(blob.genome);
					babies.push({
						id: uuidv4(),
						position: generateEdgePosition(),
						energy: 100,
						genome: babyGenome,
						foodEaten: 0,
						beingEatenBy: null,
						beingEatenPosition: null,
						generation: blob.generation + 1,
						parentId: blob.id,
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

			// Calculate deaths and births
			const deaths = state.blobs.length - survivors.length;
			const births = babies.length;

			// Generate new food batch (wider spawn area)
			const newFoods: FoodEntity[] = Array.from({ length: foodCount }, () => ({
				id: uuidv4(),
				position: generateFoodPosition(14),
			}));

			// Create history snapshot
			const snapshot: DaySnapshot = {
				day: state.day,
				population,
				births,
				deaths,
				avgSpeed,
				avgSize,
				avgSense,
				maxSpeed,
				maxSize,
				maxSense,
				maxGeneration: maxGen,
			};

			// Log judgment results
			logAsync(
				`📊 JUDGMENT | Survivors: ${survivors.length} | ` +
					`Died: ${deaths} | Reproduced: ${births} | ` +
					`Gen: ${maxGen} | Avg Speed: ${avgSpeed.toFixed(2)}`,
			);

			const newBlobs = [...survivors, ...babies];
			// Rebuild spatial grids after judgment
			const blobGrid = createSpatialGrid(5);
			const foodGrid = createSpatialGrid(5);
			rebuildGrid(blobGrid, newBlobs);
			rebuildGrid(foodGrid, newFoods);

			// Calculate new max generation (include babies)
			const newMaxGen = Math.max(
				state.maxGeneration,
				...newBlobs.map((b) => b.generation),
			);

			return {
				blobs: newBlobs,
				foods: newFoods,
				blobsById: buildBlobMap(newBlobs),
				foodsById: buildFoodMap(newFoods),
				blobGrid,
				foodGrid,
				day: state.day + 1,
				phase: "DAY" as SimulationPhase,
				timeRemaining: 30,
				deadThisDay: 0,
				history: [...state.history, snapshot],
				maxGeneration: newMaxGen,
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
			// Remove from spatial grid
			gridRemove(state.blobGrid, id);
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

	// ===================
	// SPATIAL GRID QUERIES (C1 fix)
	// ===================

	getNearbyBlobIds: (x: number, z: number, radius: number) => {
		const state = get();
		return gridQueryRadius(state.blobGrid, x, z, radius);
	},

	getNearbyFoodIds: (x: number, z: number, radius: number) => {
		const state = get();
		return gridQueryRadius(state.foodGrid, x, z, radius);
	},

	// ===================
	// SPRINT 8: Simulation Controls
	// ===================

	togglePause: () => {
		set((state) => ({ isPaused: !state.isPaused }));
	},

	setSimulationSpeed: (speed: number) => {
		set({ simulationSpeed: speed });
	},

	// ===================
	// SPRINT 8: Statistics Helpers
	// ===================

	getPopulationStats: () => {
		const state = get();
		const blobs = state.blobs.filter((b) => !b.beingEatenBy);
		const population = blobs.length;

		if (population === 0) {
			return {
				avgSpeed: 0,
				avgSize: 0,
				avgSense: 0,
				maxSpeed: 0,
				maxSize: 0,
				maxSense: 0,
				maxGeneration: 0,
			};
		}

		const speeds = blobs.map((b) => b.genome.speed);
		const sizes = blobs.map((b) => b.genome.size);
		const senses = blobs.map((b) => b.genome.sense);
		const generations = blobs.map((b) => b.generation);

		return {
			avgSpeed: speeds.reduce((a, b) => a + b, 0) / population,
			avgSize: sizes.reduce((a, b) => a + b, 0) / population,
			avgSense: senses.reduce((a, b) => a + b, 0) / population,
			maxSpeed: Math.max(...speeds),
			maxSize: Math.max(...sizes),
			maxSense: Math.max(...senses),
			maxGeneration: Math.max(...generations),
		};
	},
}));
