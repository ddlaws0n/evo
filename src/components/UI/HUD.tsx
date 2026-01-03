import type { CSSProperties } from "react";

interface HUDProps {
	day?: number;
	population?: { live: number; dead: number };
}

/**
 * HUD - Scientific instrument overlay
 * Displays simulation metrics with glassmorphism styling
 * Pure HTML overlay (not Canvas-rendered)
 */
export function HUD({ day = 1, population = { live: 5, dead: 0 } }: HUDProps) {
	return (
		<div style={styles.container}>
			{/* Top Left - Day Counter */}
			<div style={{ ...styles.panel, ...styles.topLeft }}>
				<span style={styles.label}>Day</span>
				<span style={styles.value}>{day}</span>
			</div>

			{/* Top Right - Population Metrics */}
			<div style={{ ...styles.panel, ...styles.topRight }}>
				<span style={styles.label}>Population</span>
				<div style={styles.metrics}>
					<span style={styles.metricLive}>{population.live}</span>
					<span style={styles.separator}>|</span>
					<span style={styles.metricDead}>{population.dead}</span>
				</div>
			</div>
		</div>
	);
}

const styles: Record<string, CSSProperties> = {
	container: {
		position: "absolute",
		top: 0,
		left: 0,
		width: "100%",
		height: "100%",
		pointerEvents: "none",
		zIndex: 10,
	},
	panel: {
		position: "absolute",
		background: "rgba(255, 255, 255, 0.7)",
		backdropFilter: "blur(12px)",
		WebkitBackdropFilter: "blur(12px)",
		border: "1px solid rgba(0, 0, 0, 0.1)",
		borderRadius: "8px",
		padding: "12px 16px",
		display: "flex",
		flexDirection: "column",
		gap: "4px",
		pointerEvents: "auto",
	},
	topLeft: {
		top: "20px",
		left: "20px",
	},
	topRight: {
		top: "20px",
		right: "20px",
	},
	label: {
		fontFamily: "system-ui, -apple-system, sans-serif",
		fontSize: "11px",
		fontWeight: 500,
		color: "rgba(0, 0, 0, 0.5)",
		textTransform: "uppercase",
		letterSpacing: "0.5px",
	},
	value: {
		fontFamily: "'Courier New', Courier, monospace",
		fontSize: "32px",
		fontWeight: 700,
		color: "rgba(0, 0, 0, 0.85)",
		lineHeight: 1,
	},
	metrics: {
		display: "flex",
		alignItems: "center",
		gap: "8px",
	},
	metricLive: {
		fontFamily: "'Courier New', Courier, monospace",
		fontSize: "24px",
		fontWeight: 700,
		color: "rgba(0, 0, 0, 0.85)",
	},
	separator: {
		fontFamily: "'Courier New', Courier, monospace",
		fontSize: "20px",
		color: "rgba(0, 0, 0, 0.3)",
	},
	metricDead: {
		fontFamily: "'Courier New', Courier, monospace",
		fontSize: "24px",
		fontWeight: 700,
		color: "rgba(0, 0, 0, 0.4)",
	},
};
