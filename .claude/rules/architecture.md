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

## File Placement

| Type | Location | Example |
|------|----------|---------|
| React components | `src/components/` | Blob.tsx, Arena.tsx |
| Custom hooks | `src/hooks/` | useBlobBrain.ts |
| Pure functions | `src/utils/` | steering.ts |
| Zustand stores | `src/store/` | useGameStore.ts |
| Sprint docs | `docs/` | sprint_4.md |
