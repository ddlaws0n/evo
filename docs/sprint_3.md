# Sprint 3: The Brain & State

## Goal
Implement the core evolutionary loop: **Locate Food → Move to Food → Eat Food**

## Completed Tasks

### 1. Visual Tweak (Floor Glare Fix)
- **File:** `src/components/World/Arena.tsx`
- Changed floor color from `#ffffff` → `#d0d0d0` (light grey)
- Reduced roughness from `0.95` → `0.8`
- Fixes bloom over-exposure from pure white surface

### 2. Zustand Store Architecture
- **File:** `src/store/useGameStore.ts`

**Entities:**
```typescript
interface BlobEntity {
  id: string;
  position: [number, number, number];
  energy: number;
  senseRadius: number;
}

interface FoodEntity {
  id: string;
  position: [number, number, number];
}
```

**Actions:**
| Action | Purpose |
|--------|---------|
| `setupSimulation(blobCount, foodCount)` | Initialize entities with random positions |
| `removeFood(id)` | Remove food when eaten |
| `updateBlobEnergy(id, amount)` | Modify blob energy (placeholder) |

### 3. App.tsx Refactor
- Migrated from local `useMemo` arrays to Zustand store
- `useEffect` calls `setupSimulation` when Leva counts change
- HUD now displays live `blobs.length` from store

### 4. Blob Brain (Sensing + Hunting)
- **File:** `src/components/Entities/Blob.tsx`

**Behavior Loop (per frame):**
1. **Sense:** Loop through all foods, find nearest within `senseRadius`
2. **Hunt:** If food found, apply force vector toward it (`HUNT_FORCE = 3.0`)
3. **Wander:** If no food, continue random sine/cosine movement
4. **Boundary:** Push back if beyond `ARENA_RADIUS = 18`

**Constants:**
```typescript
const HUNT_FORCE = 3.0;
const WANDER_FORCE = 0.5;
const BOUNDARY_FORCE = 2.0;
const EAT_DISTANCE = 1.0;
```

### 5. Eating + Chomp Animation
- When `distance < EAT_DISTANCE`, call `removeFood(id)`
- Trigger scale animation: `1.0 → 1.3 → 1.0` over 0.15s
- Uses sine curve for smooth pulse: `scale = 1 + 0.3 * sin(t * π)`

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     useGameStore                         │
│  ┌─────────┐  ┌─────────┐  ┌───────────────────────┐   │
│  │  blobs  │  │  foods  │  │ setupSimulation()     │   │
│  │  [...]  │  │  [...]  │  │ removeFood(id)        │   │
│  └────┬────┘  └────┬────┘  │ updateBlobEnergy(id)  │   │
│       │            │       └───────────────────────┘   │
└───────┼────────────┼───────────────────────────────────┘
        │            │
        ▼            ▼
┌───────────────┐  ┌────────────────┐
│   Blob.tsx    │  │   App.tsx      │
│ - useFrame()  │  │ - useEffect()  │
│ - sense foods │  │ - renders all  │
│ - hunt/wander │  │                │
│ - eat + chomp │  │                │
└───────────────┘  └────────────────┘
```

## Performance Notes
- O(N × M) per frame where N = blobs, M = foods
- Acceptable for < 100 entities
- Future: Spatial indexing (quadtree) if needed at scale

## Next Sprint Ideas
- [ ] Day/night cycle timer
- [ ] Energy drain per frame
- [ ] Death at day end (0 food eaten)
- [ ] Reproduction (2+ food eaten → clone with mutation)
- [ ] Trait visualization (size = visible, sense = ring indicator)
