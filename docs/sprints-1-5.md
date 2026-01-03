# Sprint History (1-4)

Historical record of the first four development sprints.

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
