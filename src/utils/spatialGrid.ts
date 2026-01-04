import type { Triplet } from "@react-three/cannon";

/**
 * Uniform spatial grid for O(1) entity lookups
 * Used to optimize entity detection from O(N²) to O(N)
 */

export interface SpatialGrid {
	cellSize: number;
	cells: Map<string, Set<string>>; // "cellX,cellZ" -> Set of entity IDs
	entityCells: Map<string, string>; // entityId -> current cell key
}

/**
 * Create a new spatial grid
 */
export function createSpatialGrid(cellSize = 5): SpatialGrid {
	return {
		cellSize,
		cells: new Map(),
		entityCells: new Map(),
	};
}

/**
 * Get cell key for a position
 */
export function getCellKey(x: number, z: number, cellSize: number): string {
	const cellX = Math.floor(x / cellSize);
	const cellZ = Math.floor(z / cellSize);
	return `${cellX},${cellZ}`;
}

/**
 * Insert entity into grid
 */
export function gridInsert(
	grid: SpatialGrid,
	id: string,
	position: Triplet,
): void {
	const key = getCellKey(position[0], position[2], grid.cellSize);

	if (!grid.cells.has(key)) {
		grid.cells.set(key, new Set());
	}
	grid.cells.get(key)?.add(id);
	grid.entityCells.set(id, key);
}

/**
 * Remove entity from grid
 */
export function gridRemove(grid: SpatialGrid, id: string): void {
	const oldKey = grid.entityCells.get(id);
	if (oldKey) {
		grid.cells.get(oldKey)?.delete(id);
		// Clean up empty cells
		if (grid.cells.get(oldKey)?.size === 0) {
			grid.cells.delete(oldKey);
		}
		grid.entityCells.delete(id);
	}
}

/**
 * Update entity position in grid (only if cell changed)
 */
export function gridUpdate(
	grid: SpatialGrid,
	id: string,
	newPosition: Triplet,
): void {
	const newKey = getCellKey(newPosition[0], newPosition[2], grid.cellSize);
	const oldKey = grid.entityCells.get(id);

	// Only update if cell changed
	if (oldKey !== newKey) {
		if (oldKey) {
			grid.cells.get(oldKey)?.delete(id);
			if (grid.cells.get(oldKey)?.size === 0) {
				grid.cells.delete(oldKey);
			}
		}

		if (!grid.cells.has(newKey)) {
			grid.cells.set(newKey, new Set());
		}
		grid.cells.get(newKey)?.add(id);
		grid.entityCells.set(id, newKey);
	}
}

/**
 * Query all entity IDs within radius of a position
 * Checks 3x3 grid of cells (or more if radius > cellSize)
 */
export function gridQueryRadius(
	grid: SpatialGrid,
	x: number,
	z: number,
	radius: number,
): string[] {
	const results: string[] = [];
	const cellSize = grid.cellSize;

	// Calculate cell range to check
	const cellRadius = Math.ceil(radius / cellSize);
	const centerCellX = Math.floor(x / cellSize);
	const centerCellZ = Math.floor(z / cellSize);

	// Check all cells in range
	for (let dx = -cellRadius; dx <= cellRadius; dx++) {
		for (let dz = -cellRadius; dz <= cellRadius; dz++) {
			const key = `${centerCellX + dx},${centerCellZ + dz}`;
			const cell = grid.cells.get(key);
			if (cell) {
				for (const id of cell) {
					results.push(id);
				}
			}
		}
	}

	return results;
}

/**
 * Clear all entities from grid
 */
export function gridClear(grid: SpatialGrid): void {
	grid.cells.clear();
	grid.entityCells.clear();
}

/**
 * Rebuild grid from entity arrays (used after judgment/reset)
 */
export function rebuildGrid(
	grid: SpatialGrid,
	entities: Array<{ id: string; position: Triplet }>,
): void {
	gridClear(grid);
	for (const entity of entities) {
		gridInsert(grid, entity.id, entity.position);
	}
}
