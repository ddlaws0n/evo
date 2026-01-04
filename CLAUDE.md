# Evo - 3D Evolution Simulation

Browser-based natural selection simulation inspired by Primer's "Simulating Natural Selection." Agents ("Blobs") hunt food, survive, and reproduce based on genetic traits.

## Tech Stack

- **Runtime/Build:** Bun + Vite
- **3D:** React Three Fiber (R3F) + @react-three/cannon (physics)
- **State:** Zustand (global), useRef (60fps updates)
- **GUI:** Leva (debug controls)
- **Post-Processing:** @react-three/postprocessing

## Core Simulation Rules

Simulation runs on daily cycles. Blobs must eat to survive.

**Traits:**
- `Speed (v)` - Movement velocity
- `Size (r)` - Sphere radius
- `Sense (R)` - Detection radius for food

**Energy Cost (per frame):** `(Speed² × C1) + (Size³ × C2) + (Sense × C3)`

**Lifecycle:**
1. Spawn at edge
2. Hunt food
3. End of day: 0 food = death, 1 food = survive, 2 food = replicate with mutation
4. Retreat to edge before timer ends

## Directory Structure

```
src/
├── App.tsx              # Canvas + Leva controls
├── store/               # Zustand stores (useGameStore)
├── hooks/               # Custom hooks (useBlobBrain - FSM logic)
├── utils/               # Pure functions (steering.ts, spatialGrid.ts)
├── constants/           # Physics constants (physics.ts)
├── components/
│   ├── Entities/        # Blob, Food
│   ├── World/           # Arena, Effects
│   └── UI/              # HUD overlay
docs/                    # Sprint documentation
```

## Quick Reference

- **Build:** `bun run build`
- **Check:** `bun run check`
