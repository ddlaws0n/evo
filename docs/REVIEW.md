# Evo Codebase Review

Comprehensive code quality review conducted after completing Sprints 1-7. This document identifies issues, anti-patterns, and opportunities for improvement across the codebase.

## Summary

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Performance | 3 | 2 | 4 | 2 | 11 |
| Game Logic | 2 | 4 | 2 | 1 | 9 |
| React/State | 2 | 3 | 3 | 1 | 9 |
| R3F/Three.js | 2 | 4 | 3 | 1 | 10 |
| Code Organization | 0 | 3 | 4 | 3 | 10 |
| **Total** | **9** | **16** | **16** | **8** | **49** |

---

## Critical Priority Issues

These issues cause bugs, incorrect behavior, or severe performance degradation.

### C1. O(N²) Entity Detection Algorithm
**Files:** `src/hooks/useBlobBrain.ts:94-187`, `src/utils/steering.ts:91-110`
**Impact:** Performance degrades quadratically with population

The brain tick iterates through ALL blobs for threat detection, then ALL blobs again for prey detection, then ALL foods for food detection. With N blobs and M food:
- Per blob: O(N) threat + O(N) prey + O(M) food = O(2N + M)
- Total: O(N × (2N + M)) = O(N²)

At 50 blobs × 60fps = 150,000+ comparisons/second. This becomes the primary bottleneck.

**Fix:** Implement spatial partitioning (quadtree or grid-based). Expected 10-100x improvement.

---

### C2. ARENA_RADIUS Constant Mismatch (Bug)
**Files:**
- `src/utils/steering.ts:4` → `ARENA_RADIUS = 17`
- `src/components/World/Arena.tsx:6` → `ARENA_RADIUS = 20`

**Impact:** Physics boundary (17) doesn't match visual arena (20)

Blobs hit the invisible physics boundary 3 units before the visual edge of the arena. This is confusing and breaks immersion.

**Fix:** Extract to shared constants file, use single source of truth.

---

### C3. Food Double-Counting During Eating (Bug)
**File:** `src/components/Entities/Blob.tsx:274-313`
**Impact:** Blobs can get 2+ `foodEaten` credits from 1 food item

When blob enters EATING state, each frame (60fps) executes:
- `removeFood(targetId)` - idempotent after first frame
- `incrementFoodEaten(id)` - **increments every frame!**

The chomp animation is 150ms (~9 frames), meaning a single food can credit 1-9 `foodEaten`. This breaks reproduction fairness.

**Fix:** Track consumed food IDs in a Set, only increment on first consumption:
```typescript
const consumedRef = useRef<Set<string>>(new Set());
if (!consumedRef.current.has(targetId)) {
  incrementFoodEaten(id);
  consumedRef.current.add(targetId);
}
```

---

### C4. Energy Formula Doesn't Match Specification
**File:** `src/components/Entities/Blob.tsx:193-197`
**Impact:** Trait balance is broken; small fast blobs are unfairly cheap

**Specification (CLAUDE.md):** `(Speed² × C1) + (Size³ × C2) + (Sense × C3)`
**Implementation:** `C_MOVE * size³ * speed²` (multiplied, not added)

This fundamentally changes evolutionary pressure. With the spec formula, speed and size have independent costs. With the implementation, a small blob's speed cost is reduced by its small size.

**Fix:** Implement formula as specified with separate terms.

---

### C5. No Zustand Selectors in App.tsx
**File:** `src/App.tsx:92-100`
**Impact:** Entire app re-renders on every store change (60+ times/second)

```typescript
const { blobs, foods, day, phase, ... } = useGameStore();
```

Without selectors, the component subscribes to ALL state changes. Every blob position sync, food removal, or energy update triggers App re-render.

**Fix:** Use individual selectors:
```typescript
const blobs = useGameStore(state => state.blobs);
const phase = useGameStore(state => state.phase);
```

---

### C6. Geometry/Material Not Memoized (Memory Leak)
**Files:**
- `src/components/Entities/Blob.tsx:350-388` (body + 4 eye geometries)
- `src/components/Entities/Food.tsx:52-72` (3 geometries per food)
- `src/components/World/CartoonCloud.tsx:37-64` (5 geometries per cloud)

**Impact:** Creates 500+ geometry objects per frame, memory grows unbounded

With 50 blobs × 5 geometries + 100 food × 3 geometries = 550 geometries created every render. These accumulate without disposal, causing memory exhaustion.

**Fix:** Use `useMemo` for geometries, add cleanup in `useEffect` return.

---

### C7. Vector3 Creation in useFrame (GC Pressure)
**File:** `src/components/Entities/Blob.tsx:332-333`
**Impact:** 6,000+ object allocations per second in debug mode

```typescript
new THREE.Vector3(blobPos.x, blobPos.y, blobPos.z),
new THREE.Vector3(targetPos[0], targetPos[1], targetPos[2]),
```

Creating objects in the 60fps render loop causes garbage collection pauses and frame drops.

**Fix:** Pre-allocate vectors in refs, update via `.set()`.

---

### C8. Non-Memoized Inline Props
**File:** `src/App.tsx:116`
**Impact:** Breaks child component memoization

```typescript
population={{ live: blobs.length, dead: deadThisDay }}
```

Creates new object every render, forcing HUD to re-render even when values haven't changed.

**Fix:** Use `useMemo` for object props or restructure component.

---

### C9. O(N) Array Lookups in Hot Path
**File:** `src/components/Entities/Blob.tsx:123, 293, 323, 326`
**Impact:** 4 linear searches per blob per frame

```typescript
const selfBlob = blobs.find((b) => b.id === id);
const prey = blobs.find((b) => b.id === brainOutput.targetId);
```

With 50 blobs, each doing 4 `.find()` operations = 10,000 iterations per frame.

**Fix:** Store blobs in a Map by ID, use O(1) lookups.

---

## High Priority Issues

These issues significantly impact performance, maintainability, or correctness.

### H1. EATING State Doesn't Validate Target Existence
**File:** `src/hooks/useBlobBrain.ts:248-261`
**Impact:** Potential undefined behavior when prey is consumed by another predator

The EATING state for prey doesn't verify the target still exists or hasn't been claimed by another predator.

---

### H2. Animation State Mixed with Game State
**File:** `src/store/useGameStore.ts:15-17`
**Impact:** Mixing concerns, store updates for visual-only changes

`beingEatenBy` and `beingEatenPosition` are animation state stored in game store. This causes store updates during animations, triggering unnecessary re-renders.

---

### H3. Energy System Disconnected from Survival
**File:** `src/components/Entities/Blob.tsx:70, 196-202`
**Impact:** Energy system has no mechanical consequence

Energy decays in a ref, but survival judgment uses `foodEaten` count, not energy. A blob can reach 0 energy and still survive if it ate enough food. This creates confusing visual-mechanical disconnect.

---

### H4. Conflicting RETURNING State Semantics
**File:** `src/hooks/useBlobBrain.ts:205-359`
**Impact:** Two "RETURNING" behaviors with opposite movement goals

- RETURNING (time-based): Moves toward spawn ring (edge)
- BOUNDARY_RETURN (position-based): Uses random wander + boundary force

Same state name, different implementations.

---

### H5. Predation During Non-DAY Phases
**File:** `src/components/Entities/Blob.tsx:303`
**Impact:** Energy decay only in DAY, but predation works in SUNSET

Blobs can eat prey during SUNSET without paying energy costs (since decay is gated to DAY phase).

---

### H6. Blob.tsx is a God File (400+ lines)
**File:** `src/components/Entities/Blob.tsx`
**Impact:** 10+ responsibilities in one component

Handles: physics, birth animation, chomp animation, absorption animation, energy decay, boundary checking, brain tick, eating logic, debug visualization, and rendering.

**Fix:** Extract into focused hooks:
- `useBlobAnimation.ts` (birth/chomp/absorption)
- `useBlobEnergy.ts` (energy decay)
- `useBlobPhysics.ts` (boundary, position sync)

---

### H7. Props Drilling Instead of Store Access
**File:** `src/App.tsx:110-117`
**Impact:** Unnecessary component coupling

`NightOverlay` and `HUD` receive state as props from App instead of reading from store directly. Creates prop drilling and makes components harder to test.

---

### H8. Stale Closure on foodCount Parameter
**File:** `src/hooks/useSimulationTimer.ts:69`
**Impact:** Changing food count mid-simulation uses stale value

The `useFrame` callback captures `foodCount` at hook initialization. If user changes food count via Leva, judgment spawns wrong amount.

**Fix:** Use ref to track latest value:
```typescript
const foodCountRef = useRef(foodCount);
useEffect(() => { foodCountRef.current = foodCount; }, [foodCount]);
```

---

### H9. Inefficient Zustand Array Updates
**File:** `src/store/useGameStore.ts:130-160`
**Impact:** O(N) cost for single-blob updates

Every action maps entire blobs array to update one blob:
```typescript
blobs: state.blobs.map(blob => blob.id === id ? {...blob, update} : blob)
```

**Fix:** Use Immer middleware or normalize state with ID-keyed object.

---

## Medium Priority Issues

### M1. ShaderMaterial Not Disposed
**File:** `src/App.tsx:24-59`

Material created in `useMemo` but never disposed. Memory leak over long sessions.

### M2. No React.memo on Entity Components
**Files:** `Blob.tsx`, `Food.tsx`, `CartoonCloud.tsx`

Components not wrapped with `React.memo()`, causing unnecessary reconciliation on parent re-renders.

### M3. Duplicate Object3D Allocation in Arena
**File:** `src/components/World/Arena.tsx:67, 81`

Creates `new THREE.Object3D()` inside loops (530+ allocations) instead of reusing single instance.

### M4. No Validation of Genome Trait Ranges
**File:** `src/hooks/useBlobBrain.ts:245-255`

Brain uses genome values without validating bounds. Corrupted/mutated values could cause unexpected behavior.

### M5. Threat Detection Has No Hysteresis
**File:** `src/hooks/useBlobBrain.ts:88-150`

Blob can flicker between FLEEING and HUNTING if threat is at boundary of sense radius.

### M6. Position Sync Only During Eating
**File:** `src/components/Entities/Blob.tsx:286, 306`

Store position only updated when eating, causing stale positions for other operations.

### M7. Repeated Circular Position Pattern
**Files:** Multiple (5+ occurrences)

The `angle = random * 2π; x = cos(angle) * r; z = sin(angle) * r` pattern is duplicated across 5 files.

### M8. Duplicate Eye Rendering Code
**File:** `src/components/Entities/Blob.tsx:365-388`

Left and right eye are nearly identical code blocks, only differing in X position.

### M9. HUD Not Self-Contained
**File:** `src/components/UI/HUD.tsx`

Receives all state as props instead of reading from store. Makes testing and reuse harder.

---

## Low Priority Issues

### L1. Unused `_id` Parameter in Food
**File:** `src/components/Entities/Food.tsx:20`

Parameter renamed with underscore prefix but never used. Dead code smell.

### L2. No Barrel Exports
**Directories:** All `src/` subdirectories

No `index.ts` files for clean re-exports. Makes imports verbose.

### L3. Logger Swallows Errors
**File:** `src/utils/logger.ts:52-56`

`logAsync` catches and silently ignores errors, losing debugging info.

### L4. Inconsistent Distance Calculation
**Files:** Multiple

Some code uses `distance2D()` helper, others inline `Math.hypot()`.

### L5. Brain Output Object Allocations
**File:** `src/hooks/useBlobBrain.ts:130-383`

Creates new objects with 8 properties per frame, many unused depending on state.

### L6. Magic Numbers Throughout
**Files:** Multiple

Animation durations, physics constants, and game rules spread across files without centralization.

### L7. Potential Circular Import Risk
**Files:** `useBlobBrain.ts` → `steering.ts` → `useGameStore.ts` → `steering.ts`

Import chain could become circular if not careful during refactoring.

### L8. Conservative Mutation Rate
**File:** `src/utils/genetics.ts:61-73`

±5% mutation takes 14 generations to double a trait. May limit observable evolution.

---

## Recommended Action Order

### Phase 1: Critical Bugs & Performance (Immediate)
1. Fix ARENA_RADIUS mismatch (C2) - 5 min
2. Fix food double-counting bug (C3) - 15 min
3. Add Zustand selectors to App.tsx (C5) - 15 min
4. Fix non-memoized props (C8) - 5 min

### Phase 2: Memory & GC (Short-term)
5. Memoize geometries/materials (C6) - 1 hour
6. Fix Vector3 allocations (C7) - 30 min
7. Replace `.find()` with Map lookups (C9) - 30 min

### Phase 3: Performance Scaling (Medium-term)
8. Implement spatial partitioning (C1) - 4-8 hours
9. Correct energy formula (C4) - 30 min
10. Add React.memo to components (M2) - 15 min

### Phase 4: Architecture (Long-term)
11. Split Blob.tsx into focused hooks (H6) - 2-4 hours
12. Move animation state out of store (H2) - 1-2 hours
13. Extract constants to shared file (L6, M7) - 1 hour
14. Add barrel exports (L2) - 30 min

---

## Performance Benchmarks

Current state with 50 blobs + 10 food at 60fps:
- Entity detection: ~150,000 comparisons/second
- `.find()` operations: ~10,000 iterations/frame
- Object allocations: ~3,000 objects/second (brain output only)
- Geometry objects: ~550 created per render (not disposed)

Expected after fixes:
- Entity detection: ~1,500 comparisons/second (with spatial partitioning)
- `.find()` operations: 0 (Map lookups)
- Object allocations: ~500 objects/second (reused refs)
- Geometry objects: ~50 total (memoized + disposed)

---

*Review conducted: Sprint 8 planning phase*
*Coverage: 5 parallel review agents analyzing R3F patterns, state management, game logic, code organization, and performance*
