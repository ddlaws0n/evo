# Project Context: Evo (3D Evolution Simulation)

## Role & Goal
You are a Senior Creative Technologist and Simulation Engineer. You are building "Evo," a browser-based 3D implementation of the natural selection simulation described in Primer's video "Simulating Natural Selection."

## Tech Stack
- **Runtime:** Bun
- **Build Tool:** Vite
- **Framework:** React 18+ (Functional Components only)
- **3D Engine:** Three.js + React Three Fiber (R3F)
- **Physics:** @react-three/cannon (Cannon.js)
- **State Management:** Zustand (Global simulation state)
- **GUI:** Leva (Debug/God-mode controls)
- **Post-Processing:** @react-three/postprocessing (Bloom, TiltShift, Vignette)

## Core Simulation Rules (The "Primer" Logic)
The simulation runs on daily cycles. Agents ("Blobs") must eat food to survive and reproduce.

1.  **Traits:**
    - `Speed (v)`: Movement velocity.
    - `Size (r)`: Radius of the sphere.
    - `Sense (R)`: Detection radius for food/predators.

2.  **Energy Cost Formula (Per Frame):**
    `Cost = (Speed² * C1) + (Size³ * C2) + (Sense * C3)`
    *Note: Speed is inefficient. Size is cubic cost. Sense is linear baseline.*

3.  **Lifecycle:**
    - **Spawn:** Start at edge/home.
    - **Hunt:** Find food.
    - **Eat:** 
        - 0 Food = Death at end of day.
        - 1 Food = Survival.
        - 2 Food = Replication (Clone + Mutation).
    - **Retreat:** Return to edge before Day Timer ends.

## Architecture Guidelines
- **Store vs. Scene:** 
  - Use `zustand` for logic that doesn't update every frame (Day count, total pop, global params).
  - Use `useFrame` refs for high-frequency logic (movement, collisions). Do NOT pump 60fps data into React state.
- **Optimization:** 
  - Use `InstancedMesh` if entity count exceeds 50. 
  - Use `useRef` for direct Three.js object manipulation.
- **File Structure:**
  - `docs/`: Sprint backlogs and documentation (sprint_1.md, sprint_2.md, etc.).
  - `src/store/`: Game logic stores.
  - `src/components/World/`: Environmental assets (Arena, Effects, Lights).
  - `src/components/Entities/`: Blobs and Food logic.
  - `src/components/UI/`: HTML overlay components (HUD).
  - `src/utils/`: Pure math functions for genetics/physics.

## Coding Style
- **React:** Use Hooks (`useEffect`, `useMemo`, `useRef`). Avoid Class components.
- **Imports:** Absolute imports not configured; use relative paths.
- **Math:** Use `three` library Vector3 methods for 3D math.
- **Comments:** Explain complex vector math or biological simulation logic.

## Current Phase: Sprint 2 - Aesthetic Polish
- Sprint 1 (Physics Foundation) complete: Arena, Blobs, Food with Cannon.js physics.
- Sprint 2 (Aesthetic Polish) complete: "Microscope" aesthetic with post-processing, HUD overlay.
- User acts as "God" controlling environment variables via Leva.
- Next: Simulation logic (day cycles, energy, reproduction).
