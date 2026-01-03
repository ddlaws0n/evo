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

## Materials & Post-Processing Pitfalls

### SoftShadows + MeshToonMaterial Incompatibility

**CRITICAL:** Drei's `<SoftShadows />` injects PCSS (Percent Closer Soft Shadows) into Three.js shader chunks. This breaks `MeshToonMaterial` shader compilation.

```typescript
// BROKEN - Causes "Fragment shader is not compiled" error
<SoftShadows size={25} samples={16} />
<mesh>
  <meshToonMaterial color="#4ade80" /> {/* Shader fails! */}
</mesh>

// WORKS - Don't use SoftShadows with toon materials
// Use standard shadow-mapSize on directionalLight instead
<directionalLight shadow-mapSize={[4096, 4096]} />
```

### Custom Skybox Depth Settings

Custom skybox ShaderMaterial **MUST** disable depth writing or it occludes all scene objects:

```typescript
// WRONG - Skybox writes to depth buffer, everything else disappears
new THREE.ShaderMaterial({
  side: THREE.BackSide,
  // Missing depth settings!
});

// CORRECT - Skybox renders as background
new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,  // Don't write to depth buffer
  depthTest: false,   // Don't read from depth buffer
});
```

### Unlit Materials for Decorative Objects

Objects that should stay bright regardless of scene lighting (clouds, UI elements, glowing objects) need unlit materials:

```typescript
// WRONG - Clouds get tinted by hemisphere light ground color
<mesh>
  <meshToonMaterial color="#ffffff" /> {/* Turns olive/muddy */}
</mesh>

// CORRECT - Always bright white regardless of lighting
<mesh>
  <meshBasicMaterial color="#ffffff" /> {/* Self-lit, ignores scene lights */}
</mesh>
```

### TiltShift2 Post-Processing

`TiltShift2` from `@react-three/postprocessing` works correctly on its own. If the scene disappears when adding it, check for other shader-breaking components (like SoftShadows) first.
