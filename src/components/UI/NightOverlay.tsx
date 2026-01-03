import type { CSSProperties } from "react";
import type { SimulationPhase } from "../../store/useGameStore";

interface NightOverlayProps {
	phase: SimulationPhase;
}

/**
 * NightOverlay - Visual overlay for day/night cycle
 * - DAY: Transparent
 * - SUNSET: Warm amber (30% opacity)
 * - NIGHT: Very subtle dark (10% opacity) - blobs must be visible for judgment
 */
export function NightOverlay({ phase }: NightOverlayProps) {
	let opacity = 0;
	let backgroundColor = "#0f172a"; // Dark slate

	if (phase === "SUNSET") {
		opacity = 0.3;
		backgroundColor = "#f59e0b"; // Warm amber
	} else if (phase === "NIGHT") {
		opacity = 0.1; // Minimal - blobs must be visible
		backgroundColor = "#0f172a";
	}

	return (
		<div
			style={{
				...styles.overlay,
				opacity,
				backgroundColor,
			}}
		/>
	);
}

const styles: Record<string, CSSProperties> = {
	overlay: {
		position: "absolute",
		top: 0,
		left: 0,
		width: "100%",
		height: "100%",
		backgroundColor: "#0f172a", // Slate-900
		transition: "opacity 1.0s ease-in-out",
		pointerEvents: "none",
		zIndex: 5,
	},
};
