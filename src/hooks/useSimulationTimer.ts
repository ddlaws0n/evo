import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import {
	FAST_FORWARD_MULTIPLIER,
	SUNSET_FAILSAFE_MS,
} from "../constants/physics";
import { useGameStore } from "../store/useGameStore";

const DAY_DURATION = 30; // seconds
const NIGHT_DURATION = 2; // seconds for fade transition

/**
 * useSimulationTimer - Centralized day/night cycle timer
 *
 * Runs at 60fps via useFrame, tracks time via ref (not state).
 * Only syncs to store at key thresholds to avoid performance issues.
 *
 * PERFORMANCE: Reads foods/blobs/blobsAtEdge via getState() inside useFrame
 * to avoid triggering React re-renders on every position update.
 *
 * Flow:
 * 1. DAY phase: countdown from 30s to 0 (fast-forward if food gone)
 * 2. At 0s: trigger SUNSET phase
 * 3. SUNSET: wait for all blobs to reach edge (no timer, failsafe at 10s)
 * 4. NIGHT: 2s fade, then run judgment and start new DAY
 */
export function useSimulationTimer(foodCount: number) {
	const timeRef = useRef(DAY_DURATION);
	const nightTimerRef = useRef(0);
	const lastSyncedTimeRef = useRef(DAY_DURATION);

	// Track latest foodCount to avoid stale closure
	const foodCountRef = useRef(foodCount);
	useEffect(() => {
		foodCountRef.current = foodCount;
	}, [foodCount]);

	useFrame((_, delta) => {
		// PERFORMANCE: Read all state via getState() to avoid React re-renders
		const {
			phase,
			isPaused,
			simulationSpeed,
			setTimeRemaining,
			startSunset,
			startNight,
			runJudgment,
			sunsetStartTime,
			foods,
			blobs,
			blobsAtEdge,
		} = useGameStore.getState();

		// Skip if paused
		if (isPaused) return;

		// Apply simulation speed to delta
		let adjustedDelta = delta * simulationSpeed;

		if (phase === "DAY") {
			// Fast-forward if all food is gone
			if (foods.length === 0) {
				adjustedDelta *= FAST_FORWARD_MULTIPLIER;
			}

			// Countdown during day
			timeRef.current -= adjustedDelta;

			// Sync to store every second
			const currentSecond = Math.ceil(timeRef.current);
			const lastSecond = Math.ceil(lastSyncedTimeRef.current);
			if (currentSecond !== lastSecond) {
				setTimeRemaining(Math.max(0, timeRef.current));
				lastSyncedTimeRef.current = timeRef.current;
			}

			// Trigger SUNSET when timer hits 0
			if (timeRef.current <= 0) {
				timeRef.current = 0;
				setTimeRemaining(0);
				startSunset();
			}
		} else if (phase === "SUNSET") {
			// No countdown - wait for all blobs to reach edge
			// Calculate alive blob count (exclude blobs being eaten)
			const aliveBlobCount = blobs.filter((b) => !b.beingEatenBy).length;

			// Check if all alive blobs are at edge
			const allBlobsHome = blobsAtEdge >= aliveBlobCount;

			// Failsafe: if SUNSET has been running for too long, force transition
			const sunsetElapsed = Date.now() - sunsetStartTime;
			const failsafeTriggered = sunsetElapsed > SUNSET_FAILSAFE_MS;

			if (allBlobsHome || failsafeTriggered || aliveBlobCount === 0) {
				// Transition to NIGHT
				setTimeRemaining(0);
				startNight();
				nightTimerRef.current = 0;
			}
		} else if (phase === "NIGHT") {
			// Wait for night transition (uses adjusted delta for speed control)
			nightTimerRef.current += adjustedDelta;

			if (nightTimerRef.current >= NIGHT_DURATION) {
				// Run judgment and reset to DAY (use ref for latest value)
				runJudgment(foodCountRef.current);
				timeRef.current = DAY_DURATION;
				lastSyncedTimeRef.current = DAY_DURATION;
				nightTimerRef.current = 0;
			}
		}
	});

	return { timeRef };
}
