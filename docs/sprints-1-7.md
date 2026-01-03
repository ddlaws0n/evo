# Sprint History (1-7)

Historical record of completed development sprints.

---

## Sprint 1: Physics MVP

**Goal:** Build the visual and physical foundation.

### Deliverables
- Arena component (cylinder floor, safe zone rim)
- Blob entity (physics sphere with random wandering)
- Food entity (static physics box)
- Leva "God Mode" controls for entity counts
- Clinical science aesthetic (white/grey, red blobs, teal food)

### Key Decisions
- Cannon.js for physics (gravity -9.8, restitution 0.3)
- MeshPhysicalMaterial for blobs (transmission 0.3, clearcoat 1.0)
- useFrame for high-frequency physics, not React state

---

## Sprint 2: Aesthetic Polish

**Goal:** "Microscope aesthetic" - user feels like observing a digital petri dish.

### Deliverables
- Environment reflections (`<Environment preset="city" />`)
- Post-processing: Bloom, Vignette (TiltShift removed later)
- HUD overlay with glassmorphism styling
- Floor tuned to light grey to prevent bloom over-exposure

---

## Sprint 3: The Brain & State

**Goal:** Implement core loop: Locate → Move → Eat

### Deliverables
- Zustand store (`useGameStore`) for entities and actions
- Blob sensing system (find nearest food within `senseRadius`)
- Hunting behavior (force vector toward food)
- Eating + chomp animation (scale pulse on consume)

### Architecture
```
useGameStore (blobs, foods, actions)
       ↓
   Blob.tsx (useFrame: sense → hunt/wander → eat)
       ↓
   App.tsx (renders entities from store)
```

### Constants (Sprint 3)
| Constant | Value |
|----------|-------|
| HUNT_FORCE | 3.0 |
| WANDER_FORCE | 0.5 |
| BOUNDARY_FORCE | 2.0 |
| EAT_DISTANCE | 1.0 |

---

## Sprint 4: Physics Triage

**Goal:** Fix critical bugs preventing core gameplay loop.

### Bug 1: Blobs Falling Off Arena

**Root Cause:** Cylinder physics had edges. Blobs rolled off before boundary force could stop them.

**Solution:** Separate physics (infinite plane) from visuals (cylinder mesh).

```typescript
// Physics: can't fall off
usePlane(() => ({ rotation: [-Math.PI/2, 0, 0] }));

// Visual: bounded appearance
<mesh><cylinderGeometry args={[20, 20, 0.5]} /></mesh>
```

### Bug 2: Blobs Not Eating Food

**Root Causes:**
1. Food spawned at Y=1 (floating), blobs at Y≈0.5 (grounded)
2. Stale closure in useFrame (hook selector captured old array)
3. Sense radius too small (5.0 in radius-20 arena)

**Solutions:**
1. Spawn food at Y=0.4
2. Use `getState()` inside useFrame for fresh data
3. Increase sense radius to 8.0

### Critical Pattern: Stale Closures

```typescript
// WRONG - captures array at render time
const foods = useGameStore(state => state.foods);
useFrame(() => {
  for (const food of foods) { ... } // Stale!
});

// CORRECT - reads store directly each frame
useFrame(() => {
  const { foods, removeFood } = useGameStore.getState();
  for (const food of foods) { ... } // Always fresh!
});
```

### Final Constants (Sprint 4)
| Constant | Value | File |
|----------|-------|------|
| ARENA_RADIUS | 17 (hard), 14 (soft) | steering.ts |
| HUNT_FORCE | 4.0 | steering.ts |
| SOFT_RETURN_FORCE | 3.0 | steering.ts |
| EAT_DISTANCE | 1.5 | steering.ts |
| senseRadius | 8.0 | useGameStore.ts |

---

## Key Lessons (Sprints 1-4)

1. **Separate physics from visuals** - They serve different purposes
2. **Zustand + useFrame = getState()** - Hooks create stale closures in frame loops
3. **Static bodies don't fall** - Cannon.js static objects ignore gravity
4. **Forces can't stop falling** - Once gravity takes over, horizontal forces are useless
5. **Don't pump 60fps into React state** - Use refs for high-frequency updates

---

## Post-Sprint 4: Architecture Refactor

After Sprint 4, a major refactor separated representation from logic:

| Before | After |
|--------|-------|
| Blob.tsx had all logic inline | Logic extracted to `useBlobBrain` hook |
| Implicit state (if/else) | Explicit FSM (WANDERING, HUNTING, RETURNING, EATING) |
| Math mixed with rendering | Pure functions in `steering.ts` |

This prepares the codebase for Sprint 5: Visual Polish & Aesthetic Refinement.

---

## Sprint 5: Visual Polish & Aesthetic Refinement

**Goal:** Elevate visual appeal and create a cohesive "living world" aesthetic.

### Deliverables
- **Blob enhancement:** Added expressive eyes (left/right pupils) to create personality and life-like appearance
- **Food redesign:** Replaced utilitarian box with organic apple shape (red sphere + brown stem + green leaf) with gentle bobbing animation
- **HUD refinement:** Enhanced glassmorphism effect with increased backdrop blur (24px) and inset shadow for stronger liquid glass appearance
- **Code cleanup:** Standardized formatting across configuration and utility files

### Key Decisions
- Eyes as separate sphere geometry (two pupils) rather than texture, allowing for dynamic expression in future sprints
- Food bobbing on visual mesh only (animation), while physics body remains stationary (anchor) - separation of concerns
- Glassmorphism as core design language for UI (continued from Sprint 2)
- No functional behavior changes - pure visual enhancements to support immersion

### Visual Characteristics
- **Blobs:** Gummy toy aesthetic with translucent material + expressive eyes
- **Food:** Natural, organic appearance with playful animation
- **HUD:** Liquid glass UI that feels integrated into the 3D world

### Impact
These changes set the visual foundation for Sprint 6+, where genetic traits will manifest visually (size variation, color mutations, sense radius visualization). The cohesive aesthetic makes the simulation feel like a living ecosystem rather than a physics sandbox.

---

## Sprint 5.5: Pre-Sprint 6 Preparation

**Goal:** Address critical infrastructure gaps identified in architecture audit before implementing genetics.

### Context
An architecture audit (`docs/audit.md`) identified a **position sync gap**: the Zustand store only knew blob spawn positions, not current positions. This would break reproduction mechanics (spawning babies where parents are).

### Deliverables

1. **`foodEaten` counter** - Added to `BlobEntity` interface
   - Tracks how many food items each blob has consumed
   - Required for Sprint 7's reproduction condition (≥2 food = reproduce)
   - Initialized to 0 on spawn, incremented on each eat

2. **Position sync infrastructure** - Two new store actions:
   - `syncBlobPosition(id, position)` - Updates blob's position in store
   - `incrementFoodEaten(id)` - Increments blob's food counter
   - Both called from `Blob.tsx` when eating (event-driven, not 60fps)

3. **Camera FOV adjustment** - Reduced from 35° to 28°
   - Per audit recommendation: cute blob eyes were lost at distance
   - Tighter FOV creates more intimate, character-focused view

### Technical Implementation
```typescript
// useGameStore.ts - New BlobEntity field
interface BlobEntity {
  // ...existing fields
  foodEaten: number;
}

// useGameStore.ts - New actions
syncBlobPosition: (id, position) => void;
incrementFoodEaten: (id) => void;

// Blob.tsx - Called on eat event (not every frame)
if (brainOutput.state === "EATING" && brainOutput.targetId) {
  removeFood(brainOutput.targetId);
  incrementFoodEaten(id);
  syncBlobPosition(id, [blobPos.x, blobPos.y, blobPos.z]);
}
```

### Why Event-Driven Sync?
The audit recommended "End of Day Snapshot" (Option A). We went further:
- Sync on eat events (when position matters for reproduction)
- Avoids Sprint 7 dependency (no day timer needed yet)
- Zero performance cost (not 60fps, only on discrete events)
- Store always has "last known position" for baby spawning

---

## Sprint 6: Genetics & Reproduction

**Goal:** Blobs are no longer clones. They carry genetic traits, pass them to offspring with mutation, and reproduce when well-fed.

### Deliverables

1. **Genome System** (`src/utils/genetics.ts`)
   - `Genome` interface: `speed` (0.5-2.0), `size` (0.3-1.0), `sense` (3.0-15.0)
   - `createRandomGenome()` - Initial population with random traits
   - `mutate(genome)` - ±5% variation per trait, clamped to valid ranges
   - `getBlobColor(speed, sense)` - Diegetic UI via color blending

2. **Store Integration** (`src/store/useGameStore.ts`)
   - Added `genome: Genome` to `BlobEntity`
   - `reproduceBlob(parentId, currentPosition)` - Spawns mutated offspring
   - `resetFoodEaten(id)` - Resets counter after reproduction

3. **Phenotype Visualization** (`src/components/Entities/Blob.tsx`)
   - Size trait → Physical radius (physics body + mesh)
   - Speed trait → Cyan tint (high speed = "electric" look)
   - Sense trait → Magenta tint (high sense = "brainy" look)
   - Eyes scale proportionally with body size

4. **Movement Modulation** (`src/hooks/useBlobBrain.ts`, `src/utils/steering.ts`)
   - `speedMultiplier` parameter flows through brain → steering
   - Forces multiplied by `genome.speed` (fast blobs move faster)

5. **Reproduction Mechanics**
   - Trigger: `foodEaten >= 2` after eating
   - Baby spawns at offset `(parentSize + babySize) * 2.5` in random direction
   - Parent's `foodEaten` resets to 0

6. **Birth Animation**
   - Visual group wrapper for unified body + eye scaling
   - 0.4s ease-out with 15% overshoot "pop" effect
   - Babies appear with satisfying spring animation

### Key Decisions

- **Diegetic UI**: Traits visible through world aesthetics, not text overlays
- **Subtle mutation (±5%)**: Babies resemble parents, evolution is gradual
- **Immediate reproduction**: No day timer yet (deferred to Sprint 7)
- **Position passed to store**: Avoids stale position trap (store only has spawn position)

### Critical Pattern: Stale Position Trap

```typescript
// WRONG - Store has spawn position, not current position
reproduceBlob: (parentId) => {
  const parent = blobs.find(b => b.id === parentId);
  const babyPos = parent.position; // Stale! This is spawn position
}

// CORRECT - Pass current physics position from component
reproduceBlob: (parentId, currentPosition) => {
  const babyPos = calculateOffset(currentPosition); // Fresh!
}
```

### Visual Mapping

| Trait | Range | Visual Effect |
|-------|-------|---------------|
| Speed | 0.5 - 2.0 | Pink → Cyan gradient |
| Size | 0.3 - 1.0 | Physical scale (giants vs dwarfs) |
| Sense | 3.0 - 15.0 | Pink → Magenta gradient |

### Files Changed

| File | Changes |
|------|---------|
| `src/utils/genetics.ts` | **NEW** - Genome type, mutation, color utilities |
| `src/store/useGameStore.ts` | Genome on BlobEntity, reproduction actions |
| `src/components/Entities/Blob.tsx` | Phenotype visuals, birth animation, reproduction trigger |
| `src/hooks/useBlobBrain.ts` | speedMultiplier parameter |
| `src/utils/steering.ts` | Force scaling by speed trait |
| `src/App.tsx` | Pass genome prop to Blob component |

### Impact

Blobs now have individuality. You can visually identify fast blobs (cyan) vs sensory blobs (magenta), large vs small. When a cyan blob reproduces, its baby is also cyan (with slight variation). This creates the foundation for natural selection in Sprint 7, where traits will affect survival.

---

## Sprint 7: The Cycle (Energy & Time)

**Goal:** Introduce "Selective Pressure." Blobs must efficiently manage energy and beat the clock to survive.

### Deliverables

1. **Day/Night Cycle** (`src/hooks/useSimulationTimer.ts`)
   - 30-second days with ref-based countdown (not React state)
   - Phase transitions: DAY → NIGHT → JUDGMENT → DAY
   - Timer displayed in HUD

2. **Energy System** (`src/components/Entities/Blob.tsx`)
   - Formula: `Cost = C_MOVE × (Size³ × Speed²) + C_SENSE × Sense`
   - Energy tracked via `useRef` (not state) for performance
   - Death triggers when energy ≤ 0
   - Energy gain: +40 from food, +50×prey.size from predation

3. **Predation/Cannibalism** (`src/hooks/useBlobBrain.ts`)
   - Blobs can eat other blobs if ≥20% larger (`size > target.size × 1.2`)
   - Brain detects prey within sense radius
   - Predator gains `foodEaten++` (counts toward reproduction)

4. **Fleeing Behavior** (`src/hooks/useBlobBrain.ts`)
   - New FSM state: `FLEEING`
   - Triggers when larger blob (>1.2× size) detected in sense radius
   - Flee direction: away from threat
   - Highest priority state (survival instinct)

5. **RETURNING State Enhancement**
   - Triggers at 90% timer elapsed (3s remaining)
   - Direction: toward arena edge (not center)
   - Blobs head "home" before day ends

6. **End of Day Judgment** (`src/store/useGameStore.ts`)
   - `foodEaten < 1` → Death
   - `foodEaten = 1` → Survive (teleport to edge, reset energy)
   - `foodEaten >= 2` → Reproduce (survive + spawn mutated baby)

7. **Absorption Animation** (`src/components/Entities/Blob.tsx`)
   - When eaten: prey shrinks to 0 over 0.3s
   - Prey lerps toward predator position
   - Clean visual feedback for predation

8. **Night Overlay** (`src/components/UI/NightOverlay.tsx`)
   - Fades to 85% opacity slate-900 during NIGHT/JUDGMENT
   - 1.5s ease-in-out transition
   - Creates dramatic day/night visual

### Energy Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| C_MOVE | 0.05 | Movement cost coefficient (size³ × speed²) |
| C_SENSE | 0.003 | Sense cost coefficient |
| FLEE_FORCE | 5.0 | Fleeing force (faster than hunt) |
| RETURN_FORCE | 4.0 | Return to edge force |
| SPAWN_RADIUS | 16.5 | Edge spawn ring |
| PREDATION_SIZE_RATIO | 1.2 | Must be 20% larger to eat |

### FSM State Priority (Highest to Lowest)

1. **FLEEING** - Threat detected, run away
2. **EATING** - At food or prey
3. **RETURNING** - Timer at 90%, head to edge
4. **HUNTING** - Food or prey in range
5. **WANDERING** - Default behavior

### Day/Night Flow

```
Timer: 30s → 3s → 0s
         |      |     |
         |      |     v
         |      |   startNight()
         |      |   NightOverlay fades in (1.5s)
         |      |     |
         |      v     v (after 2s)
         |   RETURNING   runJudgment()
         |   (to edge)   - Remove blobs with 0 food
         v               - Reproduce blobs with 2+ food
      Normal             - Teleport survivors to edge
      hunting            - Spawn new food in center
                         - Increment day counter
                           |
                           v
                       NightOverlay fades out
                       New day begins
```

### Critical Pattern: Ref-Based Energy

```typescript
// WRONG - State updates at 60fps kills performance
const [energy, setEnergy] = useState(100);
useFrame((_, delta) => {
  setEnergy(e => e - cost * delta); // 60 re-renders/second!
});

// CORRECT - Ref tracks energy, only sync on events
const energyRef = useRef(100);
useFrame((_, delta) => {
  energyRef.current -= cost * delta; // No re-renders
  if (energyRef.current <= 0) {
    removeBlob(id); // Sync only on death
  }
});
```

### Files Changed

| File | Changes |
|------|---------|
| `src/utils/steering.ts` | Added C_MOVE, C_SENSE, FLEE_FORCE, RETURN_FORCE, SPAWN_RADIUS, PREDATION_SIZE_RATIO |
| `src/store/useGameStore.ts` | Added phase, timeRemaining, dayDuration, deadThisDay, beingEatenBy/Position; new actions (setTimeRemaining, startNight, startDay, runJudgment, removeBlob, markBlobAsEaten) |
| `src/hooks/useSimulationTimer.ts` | **NEW** - Day/night timer hook |
| `src/hooks/useBlobBrain.ts` | Added FLEEING state, predation detection, threat detection, RETURNING at 90% timer, targetType field |
| `src/components/Entities/Blob.tsx` | Energy decay (ref-based), absorption animation, predation handling |
| `src/components/UI/NightOverlay.tsx` | **NEW** - Night phase overlay |
| `src/components/UI/HUD.tsx` | Added timer display |
| `src/App.tsx` | SimulationController component, NightOverlay integration |

### Impact

The simulation now has **selective pressure**. Traits matter:
- **Big + Fast** blobs burn energy quickly, must eat often or die
- **Small** blobs are prey but cheaper to run
- **High Sense** blobs find food faster but cost more energy
- **Fleeing** gives small blobs a survival strategy

Natural selection will now favor efficient trait combinations. Over generations, the population should evolve toward sustainable energy budgets.
