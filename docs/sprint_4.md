# Sprint 4: Physics Triage & Visual Tuning

## Goal
Fix critical bugs preventing core gameplay loop from functioning.

---

## Root Cause Analysis

### Bug 1: Blobs Falling Off Arena

**Symptoms:** Blobs visible below the arena floor on the grid.

**Root Cause:** The arena floor was a **cylinder with edges**. Blobs are physics spheres that can roll over the edge. The boundary force (even at 10.0) couldn't overcome momentum fast enough - by the time it activated, blobs were already falling due to gravity.

**Why Previous Fix Failed:**
- `api.velocity.set(0,0,0)` is async in Cannon.js - doesn't take effect immediately
- Force takes multiple frames to overcome momentum
- Once falling, horizontal force can't counteract vertical gravity

**Solution:** Replace cylinder physics with **infinite plane**.
```typescript
// Arena.tsx - OLD (cylinder with edges)
useCylinder(() => ({ args: [20, 20, 0.5, 32] }))

// Arena.tsx - NEW (infinite plane)
usePlane(() => ({ rotation: [-Math.PI/2, 0, 0] }))
```

The visual floor remains a cylinder for aesthetics, but physics is an infinite plane - blobs literally cannot fall.

---

### Bug 2: Blobs Not Eating Food

**Symptoms:** Blobs near food but not consuming it.

**Root Causes (Multiple):**

#### A. Food Floating at Y=1
- Food spawned at Y=1 (same as blobs)
- Food is `type: "Static"` - no gravity, stays at spawn position
- Blobs fall to ground (Y≈0.5), food stays floating at Y=1
- Even with 2D distance, the visual disconnect was confusing

**Solution:** Spawn food at ground level (Y=0.4).

#### B. Stale Closure in useFrame
- `useFrame` runs 60fps independently of React renders
- `const foods = useGameStore(state => state.foods)` captures array at render time
- When food is removed, React schedules re-render, but useFrame continues with OLD array
- Multiple blobs could "see" same food that was already eaten

**Solution:** Use `getState()` inside useFrame for fresh data.
```typescript
// OLD (stale closure)
const foods = useGameStore(state => state.foods);
useFrame(() => {
  for (const food of foods) { ... } // Stale!
});

// NEW (fresh state)
useFrame(() => {
  const { foods, removeFood } = useGameStore.getState();
  for (const food of foods) { ... } // Always current!
});
```

#### C. Sense Radius Too Small
- Default `senseRadius = 5.0` in a radius-20 arena
- Many blobs had no food within detection range

**Solution:** Increased to `senseRadius = 8.0`.

---

## All Fixes Applied

### Arena.tsx
| Change | Before | After |
|--------|--------|-------|
| Physics floor | Cylinder (r=20) | Infinite plane |
| Visual floor | Same as physics | Separate mesh |

### useGameStore.ts
| Change | Before | After |
|--------|--------|-------|
| Food spawn Y | 1.0 (floating) | 0.4 (on ground) |
| Food spawn radius | 18 | 16 (safer margin) |
| Blob sense radius | 5.0 | 8.0 |

### Blob.tsx
| Change | Before | After |
|--------|--------|-------|
| Store access | Hook selector (stale) | `getState()` (fresh) |
| Division guard | `len > 0` | `len > 0.01` |

### Effects.tsx
- Removed TiltShift2 (blur issues)

### Food.tsx
- Ghost physics (`collisionResponse: false`)
- Neon green color (`#39ff14`)

---

## Architecture Insight

**React vs Three.js Rendering:**
```
React Render Cycle          Three.js Frame Loop
─────────────────           ──────────────────
1. Component renders        1. useFrame runs 60fps
2. Hooks capture state      2. Uses closure from last render
3. Re-renders on change     3. Doesn't wait for re-render!

Problem: useFrame uses stale data between React renders
Solution: getState() bypasses React, reads store directly
```

**Physics vs Visual Separation:**
```
Visual Layer (Three.js)     Physics Layer (Cannon.js)
───────────────────────     ─────────────────────────
Cylinder mesh (r=20)        Infinite plane (no edges)
Looks like petri dish       Cannot fall off

Blobs see: bounded arena
Blobs feel: infinite floor
```

---

## Constants Reference

| Constant | Value | File |
|----------|-------|------|
| `ARENA_RADIUS` | 18 (boundary) | Blob.tsx |
| `HUNT_FORCE` | 3.0 | Blob.tsx |
| `BOUNDARY_FORCE` | 10.0 | Blob.tsx |
| `EAT_DISTANCE` | 1.2 | Blob.tsx |
| `senseRadius` | 8.0 | useGameStore.ts |
| Food spawn Y | 0.4 | useGameStore.ts |

---

## Files Changed

| File | Key Changes |
|------|-------------|
| `Arena.tsx` | Infinite plane physics, separate visual mesh |
| `useGameStore.ts` | Food Y=0.4, sense radius 8.0 |
| `Blob.tsx` | `getState()` for fresh store access |
| `Effects.tsx` | Removed TiltShift2 |
| `Food.tsx` | Ghost physics, neon green |

---

## Lessons Learned

1. **Separate physics from visuals** - They serve different purposes
2. **Zustand + useFrame = getState()** - Hooks create stale closures in frame loops
3. **Static bodies don't fall** - Food at Y=1 stays at Y=1 forever
4. **Forces can't stop falling** - Once gravity takes over, horizontal forces are useless
