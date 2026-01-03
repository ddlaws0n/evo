# Coding Style

## TypeScript

- Use strict types: `interface` for props, explicit return types for complex functions
- Prefer `type` imports: `import type { Triplet } from "@react-three/cannon"`
- Use `as const` for literal arrays/objects when needed

## React

- Functional components only (no class components)
- Hooks: `useEffect`, `useMemo`, `useRef`, `useCallback`
- Destructure props in function signature

```typescript
export function Blob({
  id,
  position = [0, 2, 0],
  radius = 0.5,
}: BlobProps) { ... }
```

## Imports

- Relative paths only (absolute imports not configured)
- Group by: external → internal → types
- Use `import type` for type-only imports

## Vector Math

- Use `THREE.Vector3` methods for 3D operations
- Use `Math.hypot(x, z)` for 2D distance (XZ plane)
- Normalize before scaling: `direction.normalize().multiplyScalar(force)`

## Comments

- Document complex vector math or physics logic
- Document FSM state transitions
- Section headers in useFrame for readability:

```typescript
useFrame(() => {
  // ===================
  // SECTION NAME
  // ===================
  ...
});
```

## Naming

- Components: PascalCase (`Blob`, `Arena`)
- Hooks: camelCase with `use` prefix (`useBlobBrain`)
- Refs: camelCase with `Ref` suffix (`meshRef`, `physicsPosition`)
- Constants: SCREAMING_SNAKE_CASE (`ARENA_RADIUS`, `HUNT_FORCE`)
