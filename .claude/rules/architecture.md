# Architecture Guidelines

## Store vs Scene Decision Tree

**Use Zustand store for:**
- Data that changes infrequently (day count, population, global params)
- Data that needs persistence across component lifecycle
- Actions that trigger state transitions (removeFood, updateBlobEnergy)

**Use useRef + useFrame for:**
- Position/velocity updates (60fps)
- Animation state (chomp, scale, rotation)
- Any data that changes every frame

**Rule of thumb:** If it updates every frame, it's a ref. If it updates on events, it's store.

## Component Architecture

**Representational components** (Blob.tsx, Food.tsx):
- Handle rendering (mesh, materials)
- Handle physics body setup
- Apply forces from brain/logic layer
- Manage visual animations

**Logic hooks** (useBlobBrain.ts):
- Contain decision-making (FSM)
- Return actions/vectors to apply
- Use refs internally to avoid re-renders
- Pure inputs, predictable outputs

**Pure utilities** (steering.ts):
- Stateless math functions
- Testable in isolation
- No React/Three.js dependencies

## Performance Rules

1. **Never pump 60fps data into React state** - triggers re-renders, kills performance
2. **Use InstancedMesh** when entity count exceeds 50
3. **Subscribe to physics position** rather than reading mesh position
4. **Batch store updates** when possible (single `set()` call)
5. **Use spatial grid for entity queries** - never iterate all entities in hot paths

## Spatial Partitioning

The simulation uses a uniform spatial grid (`src/utils/spatialGrid.ts`) to optimize entity detection from O(N²) to O(N).

**Grid structure:**
- Cell size: 5 units (matches typical sense radius)
- Arena coverage: 7×7 grid over 34×34 arena
- Stored in Zustand: `blobGrid`, `foodGrid`

**Query pattern:**
```typescript
// DON'T: Iterate all entities
for (const blob of blobs) { ... }  // O(N)

// DO: Query spatial grid
const nearbyIds = getNearbyBlobIds(x, z, radius);  // O(1) per cell
const nearbyBlobs = nearbyIds.map(id => blobsById.get(id));
```

**Grid maintenance:**
- `gridInsert()` - when entity spawns
- `gridUpdate()` - when entity moves (only if cell changed)
- `gridRemove()` - when entity dies
- `rebuildGrid()` - after day reset/judgment

## File Placement

| Type | Location | Example |
|------|----------|---------|
| React components | `src/components/` | Blob.tsx, Arena.tsx |
| Custom hooks | `src/hooks/` | useBlobBrain.ts |
| Pure functions | `src/utils/` | steering.ts |
| Zustand stores | `src/store/` | useGameStore.ts |
| Sprint docs | `docs/` | sprint_4.md |
