---
paths: src/**/*.{ts,tsx}
---

# React Three Fiber & Cannon.js Patterns

## The Stale Closure Problem

**CRITICAL:** `useFrame` runs at 60fps independently of React renders. Hook selectors create stale closures.

```typescript
// WRONG - foods array captured at render time, becomes stale
const foods = useGameStore(state => state.foods);
useFrame(() => {
  for (const food of foods) { ... } // Stale data!
});

// CORRECT - getState() reads store directly each frame
useFrame(() => {
  const { foods, removeFood } = useGameStore.getState();
  for (const food of foods) { ... } // Always fresh!
});
```

## Imperative vs Declarative Updates

React props don't update for components that don't re-render. Use refs for 60fps updates.

```typescript
// WRONG - Line points prop never updates (Blob doesn't re-render)
<Line points={[blobPos, targetPos]} />

// CORRECT - Update geometry buffer imperatively in useFrame
const lineGeoRef = useRef<THREE.BufferGeometry>(null);
useFrame(() => {
  if (lineGeoRef.current) {
    lineGeoRef.current.setFromPoints([blobPos, targetPos]);
  }
});
```

## Physics vs Visual Separation

Physics and visuals serve different purposes. Don't conflate them.

```typescript
// Physics: Infinite plane (blobs can't fall off)
usePlane(() => ({ rotation: [-Math.PI/2, 0, 0] }));

// Visual: Bounded cylinder (looks like petri dish)
<mesh><cylinderGeometry args={[20, 20, 0.5]} /></mesh>
```

## Cannon.js Physics Bodies

- `useSphere`, `usePlane`, `useBox` return `[ref, api]`
- Subscribe to position for accurate tracking: `api.position.subscribe()`
- Apply forces, not direct position changes: `api.applyForce([x, 0, z], [0, 0, 0])`
- `api.velocity.set()` is async - doesn't take effect immediately

## Animation via Refs (Not State)

Never use `useState` for 60fps animations. Use refs:

```typescript
const isChompingRef = useRef(false);
const chompTimeRef = useRef(0);

useFrame((_, delta) => {
  if (isChompingRef.current) {
    chompTimeRef.current += delta;
    // Update mesh scale directly via ref
    meshRef.current.scale.setScalar(computeScale(chompTimeRef.current));
  }
});
```
