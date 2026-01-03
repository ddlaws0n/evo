### 🗺️ The Roadmap to MVP

| Sprint | Phase | Focus |
| :--- | :--- | :--- |
| ~~Sprint 6~~ | ~~Genetics~~ | ✅ **Complete** - See `sprints-1-6.md` |
| **Sprint 7** | **The Cycle** | Energy systems, Day/Night Timer, Death, and the "End of Day" calculation. |
| **Sprint 8** | **Analytics** | Data visualization (Charts), Stats tracking, and Simulation Balancing. |

---

### ⏳ Sprint 7: The Cycle (Energy & Time)
**Goal:** Introduce "Selective Pressure." Blobs must efficiently manage energy and beat the clock to survive.

**Key Deliverables:**
1.  **Global Timer:** A Day/Night cycle in the Store (e.g., 30 seconds per day).
2.  **Energy Decay:** Movement costs energy based on formula: $E_{cost} = speed^2 + size^3 + sense$.
3.  **The "Home" State:** Trigger the `RETURNING` state in `useBlobBrain` when the timer hits 90%.
4.  **End of Day Judgment:**
    *   Energy = 0? **Die** (Mid-day).
    *   Food Eaten < 1? **Die** (End of day).
    *   Food Eaten = 1? **Survive**.
    *   Food Eaten >= 2? **Reproduce**.
    *   ✅ `foodEaten` counter already tracked per blob (Sprint 5.5).
    *   ✅ Reproduction mechanics already implemented (Sprint 6).

**Technical Implementation:**
*   **`src/store/useGameStore.ts`**: Add `timeRemaining`, `nextDay()` function.
*   **`src/hooks/useBlobBrain.ts`**:
    *   Implement the `RETURNING` logic (steer towards `[0,0,0]`).
    *   Calculate energy loss per frame and report to store (use a throttled update or a ref-based syncing approach to avoid 60fps React re-renders).
*   **`App.tsx`**: Visual cue for end-of-day (e.g., light gets dim).

**The "Gotcha":**
*   **The Store Bottleneck:** Updating energy in Zustand every frame for 50 blobs will kill performance.
*   **Solution:** Keep energy in a `useRef` inside the Blob component. Only sync to the Store when:
    1.  Energy hits 0 (Death).
    2.  The Day ends (Judgment).

---

### 📊 Sprint 8: Analytics & UI (The "Primer" Look)
**Goal:** Visualize the evolution. The user needs to *see* that blobs are getting faster/better over generations.

**Key Deliverables:**
1.  **Stat Tracking:** Calculate Average Speed, Average Size, and Average Sense of the population at the start of every day.
2.  **Data Visualization:** A simple line chart overlay showing trait trends over days.
3.  **UI Polish:** "God Mode" panel updates to show current generation count.
4.  **Balancing:** Tweaking the `Energy Cost` formula so the simulation doesn't crash (everyone dies) or explode (infinite blobs) immediately.

**Technical Implementation:**
*   **`src/components/UI/StatsGraph.tsx`**: Simple SVG or Canvas graph.
*   **`src/store/useGameStore.ts`**: Add `history: { day: number, avgSpeed: number ... }[]`.

---

### 🚀 MVP Launch Criteria
By the end of Sprint 8, you will have:
1.  **Visuals:** Cozy 3D world.
2.  **Physics:** Stable movement and collisions.
3.  **Logic:** Autonomous agents (FSM).
4.  **Loop:** Agents evolve over time based on performance.
5.  **Feedback:** UI showing the evolutionary trends.

**Recommended Immediate Next Step:**
Start **Sprint 7**. Focus on the day/night timer and energy decay system. The reproduction mechanics from Sprint 6 will integrate with the end-of-day judgment.
