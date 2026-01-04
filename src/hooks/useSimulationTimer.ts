import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { useGameStore } from "../store/useGameStore";

const DAY_DURATION = 30; // seconds
const SUNSET_DURATION = 3; // seconds - matches brain RETURNING trigger
const NIGHT_DURATION = 2; // seconds for fade transition

/**
 * useSimulationTimer - Centralized day/night cycle timer
 *
 * Runs at 60fps via useFrame, tracks time via ref (not state).
 * Only syncs to store at key thresholds to avoid performance issues.
 *
 * Flow:
 * 1. DAY phase: countdown from 30s to 0
 * 2. At 0s: trigger NIGHT phase
 * 3. After 2s fade: run judgment and start new DAY
 */
export function useSimulationTimer(foodCount: number) {
	const timeRef = useRef(DAY_DURATION);
	const sunsetTimerRef = useRef(0);
	const nightTimerRef = useRef(0);
	const lastSyncedTimeRef = useRef(DAY_DURATION);

	// Track latest foodCount to avoid stale closure (H8 fix)
	const foodCountRef = useRef(foodCount);
	useEffect(() => {
		foodCountRef.current = foodCount;
	}, [foodCount]);

	useFrame((_, delta) => {
		const { phase, setTimeRemaining, startSunset, startNight, runJudgment } =
			useGameStore.getState();

		if (phase === "DAY") {
			// Countdown during day
			timeRef.current -= delta;

			// Sync to store every second
			const currentSecond = Math.ceil(timeRef.current);
			const lastSecond = Math.ceil(lastSyncedTimeRef.current);
			if (currentSecond !== lastSecond) {
				setTimeRemaining(Math.max(0, timeRef.current));
				lastSyncedTimeRef.current = timeRef.current;
			}

			// Trigger SUNSET when 3 seconds remain
			if (timeRef.current <= 3) {
				timeRef.current = 3; // Freeze at 3
				setTimeRemaining(3);
				startSunset();
				sunsetTimerRef.current = 0;
			}
		} else if (phase === "SUNSET") {
			// Count up during sunset
			sunsetTimerRef.current += delta;

			// Update display (counts down 3→0)
			const sunsetTimeRemaining = SUNSET_DURATION - sunsetTimerRef.current;
			setTimeRemaining(Math.max(0, sunsetTimeRemaining));

			if (sunsetTimerRef.current >= SUNSET_DURATION) {
				// Transition to NIGHT
				setTimeRemaining(0);
				startNight();
				nightTimerRef.current = 0;
			}
		} else if (phase === "NIGHT") {
			// Wait for night transition
			nightTimerRef.current += delta;

			if (nightTimerRef.current >= NIGHT_DURATION) {
				// Run judgment and reset to DAY (use ref for latest value)
				runJudgment(foodCountRef.current);
				timeRef.current = DAY_DURATION;
				lastSyncedTimeRef.current = DAY_DURATION;
				nightTimerRef.current = 0;
				sunsetTimerRef.current = 0;
			}
		}
	});

	return { timeRef };
}
