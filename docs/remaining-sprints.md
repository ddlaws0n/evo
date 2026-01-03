### 🗺️ The Roadmap to MVP

| Sprint | Phase | Focus |
| :--- | :--- | :--- |
| ~~Sprint 7~~ | ~~The Cycle~~ | ✅ **Complete** - See `sprints-1-7.md` |
| **Sprint 8** | **Analytics** | Data visualization (Charts), Stats tracking, and Simulation Balancing. |

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
Start **Sprint 8**. Focus on stat tracking at the start of each day and a simple line chart to visualize trait evolution over generations.
