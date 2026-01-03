# Sprint Backlog

## Sprint 2: Aesthetic Polish & UX - "The Microscope Aesthetic"

**Goal:** Make the user feel like they are looking through a high-end microscope at a digital petri dish.

### Tasks

- [x] **1. Visual Fixes (The Arena)**
  - [x] Rotate "Safe Zone" Torus to lie flat (`[-Math.PI / 2, 0, 0]`)
  - [x] Change Arena floor to "white ceramic" (higher roughness, white color)
  - [x] Add large GridHelper below cylinder for "floating in lab space" effect

- [x] **2. Lighting & Atmosphere**
  - [x] Add `<Environment preset="city" />` for blob reflections
  - [x] Set scene background to light cool grey (`#f0f0f0`)

- [x] **3. Post-Processing (The "Juice")**
  - [x] Wrap scene in `<EffectComposer>`
  - [x] Add Bloom (threshold ~1, intensity ~1.5) for glowing Food
  - [x] Add TiltShift2 for miniature/microscope scale feel
  - [x] Add Vignette for subtle corner darkening

- [x] **4. UI Layer (The HUD)**
  - [x] Create `src/components/UI/HUD.tsx`
  - [x] Top Left: "Day: 1" (Large, Monospace)
  - [x] Top Right: "Population: [Live] | [Dead]"
  - [x] Glassmorphism styling (translucent, blur, thin borders)

---

## Sprint 1: Physics Foundation (COMPLETED)

- [x] Set up React Three Fiber with Cannon physics
- [x] Create Arena with static physics body
- [x] Implement Blob entities with dynamic physics
- [x] Implement Food entities with static physics
- [x] Add Leva controls for God Mode
