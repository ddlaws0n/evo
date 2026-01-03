# Sprint 1: Physics MVP - Backlog ✅ COMPLETE

## Goal
Build the visual and physical foundation: A sphere (Blob) moving towards a cube (Food) on a cylinder floor (Arena).

## Tasks

### Foundation
- [x] Create folder structure (`src/components/World/`, `src/components/Entities/`)
- [x] Set up sprint tracking document

### Scene Setup
- [x] Create Arena component (flattened cylinder, radius 20, safe zone rim)
- [x] Configure App.tsx with Canvas, Physics (gravity -9.8), OrbitControls
- [x] Add lighting setup (Ambient + Directional with shadows)

### Entities
- [x] Create Blob component (physics-enabled sphere with random movement)
- [x] Create Food component (static physics box)

### God Mode Controls
- [x] Implement Leva controls for BlobCount
- [x] Implement Leva controls for FoodCount
- [x] Render arrays of Blobs and Food based on Leva values

### Polish
- [x] Apply "Clinical Science" aesthetic (white/grey bg, red blobs, teal food)
- [x] Configure MeshPhysicalMaterial for Blobs (glassy/jelly look)
- [x] Configure MeshStandardMaterial for Food (slight emissivity)
- [x] Set up soft shadows

### Testing
- [x] Run dev server and verify physics interactions
- [x] Verify Leva controls work correctly
- [x] Check visual aesthetic matches specifications

## Notes
- NOT implementing genetics/reproduction this sprint
- Focus on physics interactions and visual foundation
- Use useFrame for high-frequency physics, NOT React state

## Implementation Details

### Created Files:
- `src/components/World/Arena.tsx` - Cylindrical floor with safe zone rim
- `src/components/Entities/Blob.tsx` - Physics sphere with random wandering + boundary containment
- `src/components/Entities/Food.tsx` - Static glowing boxes
- `src/App.tsx` - Main canvas with Physics, lighting, and Leva controls
- `src/main.tsx` - Entry point (converted to .tsx)
- `src/index.css` - Minimal clinical aesthetic styling

### Key Features Implemented:
- **Physics**: Gravity (-9.8), restitution (0.3), linear/angular damping
- **Blob Movement**: Random wandering forces with arena boundary containment
- **Materials**: MeshPhysicalMaterial for blobs (transmission 0.3, clearcoat 1.0), MeshStandardMaterial with emissive for food
- **Lighting**: Ambient (0.4) + Directional (1.2) with 2048x2048 shadow maps + fill light
- **God Mode**: Leva controls for blob count (0-50) and food count (0-100)

### Dev Server:
- Running on: http://localhost:5173/
- Command: `bun run dev`

## What to Expect:
1. Clean white/grey clinical environment
2. Red translucent blobs (glassy appearance) bouncing and wandering randomly
3. Teal/green glowing food cubes scattered across the arena
4. Blobs stay within arena boundaries (pushed back when approaching edge)
5. Leva panel in top-right to control entity counts in real-time

## Next Sprint Ideas:
- Blob sensory system (detect nearest food within Sense radius)
- Pathfinding/steering towards food
- Collision detection for eating
- Energy system and cost calculation
- Day/night cycle timer
