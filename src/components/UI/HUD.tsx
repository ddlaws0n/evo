import type { CSSProperties } from "react";
import { useMemo } from "react";
import type { DaySnapshot } from "../../store/useGameStore";

interface HUDProps {
	day?: number;
	timeRemaining?: number;
	population?: { live: number; dead: number };
	isPaused?: boolean;
	simulationSpeed?: number;
	maxGeneration?: number;
	history?: DaySnapshot[];
}

/**
 * HUD - Liquid Glass overlay
 * Displays simulation metrics with Apple-inspired glassmorphism
 * Pure HTML overlay (not Canvas-rendered)
 */
export function HUD({
	day = 1,
	timeRemaining = 30,
	population = { live: 5, dead: 0 },
	isPaused = false,
	simulationSpeed = 1,
	maxGeneration = 1,
	history = [],
}: HUDProps) {
	// Format time as seconds with one decimal
	const timeDisplay = Math.max(0, timeRemaining).toFixed(1);

	// Get latest stats from history or defaults
	const latestStats = useMemo(() => {
		if (history.length === 0) {
			return { avgSpeed: 0, avgSize: 0, avgSense: 0 };
		}
		return history[history.length - 1];
	}, [history]);

	return (
		<div style={styles.container}>
			{/* Pause Overlay */}
			{isPaused && (
				<div style={styles.pauseOverlay}>
					<span style={styles.pauseText}>PAUSED</span>
					<span style={styles.pauseHint}>Press Space to resume</span>
				</div>
			)}

			{/* Top Left - Day Counter */}
			<div style={{ ...styles.panel, ...styles.topLeft }}>
				<span style={styles.label}>Day</span>
				<span style={styles.value}>{day}</span>
			</div>

			{/* Top Center - Timer */}
			<div style={{ ...styles.panel, ...styles.topCenter }}>
				<span style={styles.label}>
					Time {simulationSpeed !== 1 && `(${simulationSpeed}x)`}
				</span>
				<span style={styles.timerValue}>{timeDisplay}s</span>
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

			{/* Bottom Left - Evolution Stats (hidden until first judgment completes) */}
			{history.length > 0 && (
				<div style={{ ...styles.panel, ...styles.bottomLeft }}>
					<span style={styles.label}>Evolution</span>
					<div style={styles.statsGrid}>
						<span style={styles.statLabel}>Gen</span>
						<span style={styles.statValue}>{maxGeneration}</span>
						<span style={styles.statLabel}>Spd</span>
						<span style={styles.statValue}>
							{latestStats.avgSpeed.toFixed(2)}
						</span>
						<span style={styles.statLabel}>Sns</span>
						<span style={styles.statValue}>
							{latestStats.avgSense.toFixed(1)}
						</span>
					</div>
				</div>
			)}

			{/* Bottom Right - Mini Chart (visual indicator of trait trends) */}
			{history.length > 1 && (
				<div style={{ ...styles.panel, ...styles.bottomRight }}>
					<span style={styles.label}>Trend</span>
					<MiniChart history={history} />
				</div>
			)}
		</div>
	);
}

/**
 * MiniChart - Simple sparkline showing trait evolution
 */
function MiniChart({ history }: { history: DaySnapshot[] }) {
	// Take last 10 data points
	const data = history.slice(-10);
	const width = 80;
	const height = 30;

	// Normalize speed values to chart height
	const speeds = data.map((d) => d.avgSpeed);
	const minSpeed = Math.min(...speeds, 0.5);
	const maxSpeed = Math.max(...speeds, 2.0);
	const range = maxSpeed - minSpeed || 1;

	const points = data
		.map((d, i) => {
			const x = (i / (data.length - 1)) * width;
			const y = height - ((d.avgSpeed - minSpeed) / range) * height;
			return `${x},${y}`;
		})
		.join(" ");

	return (
		<svg
			width={width}
			height={height}
			style={{ display: "block" }}
			aria-hidden="true"
		>
			<polyline
				points={points}
				fill="none"
				stroke="rgba(34, 211, 238, 0.8)"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
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
		background: "rgba(255, 255, 255, 0.35)",
		backdropFilter: "blur(24px) saturate(180%)",
		WebkitBackdropFilter: "blur(24px) saturate(180%)",
		border: "1px solid rgba(255, 255, 255, 0.4)",
		borderRadius: "20px",
		padding: "14px 18px",
		display: "flex",
		flexDirection: "column",
		gap: "4px",
		pointerEvents: "auto",
		boxShadow:
			"0 4px 24px -1px rgba(0, 0, 0, 0.1), inset 0 0 20px rgba(255, 255, 255, 0.5)",
	},
	topLeft: {
		top: "20px",
		left: "20px",
	},
	topCenter: {
		top: "20px",
		left: "50%",
		transform: "translateX(-50%)",
	},
	topRight: {
		top: "20px",
		right: "20px",
	},
	timerValue: {
		fontFamily: "'Courier New', Courier, monospace",
		fontSize: "28px",
		fontWeight: 700,
		color: "rgba(0, 0, 0, 0.85)",
		lineHeight: 1,
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
	bottomLeft: {
		bottom: "20px",
		left: "20px",
	},
	bottomRight: {
		bottom: "20px",
		right: "20px",
	},
	statsGrid: {
		display: "grid",
		gridTemplateColumns: "auto auto",
		gap: "4px 12px",
		alignItems: "center",
	},
	statLabel: {
		fontFamily: "system-ui, -apple-system, sans-serif",
		fontSize: "10px",
		fontWeight: 500,
		color: "rgba(0, 0, 0, 0.4)",
		textTransform: "uppercase",
	},
	statValue: {
		fontFamily: "'Courier New', Courier, monospace",
		fontSize: "16px",
		fontWeight: 600,
		color: "rgba(0, 0, 0, 0.85)",
	},
	pauseOverlay: {
		position: "absolute",
		top: "50%",
		left: "50%",
		transform: "translate(-50%, -50%)",
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: "8px",
		pointerEvents: "none",
	},
	pauseText: {
		fontFamily: "system-ui, -apple-system, sans-serif",
		fontSize: "48px",
		fontWeight: 700,
		color: "rgba(0, 0, 0, 0.7)",
		textShadow: "0 2px 10px rgba(255, 255, 255, 0.5)",
		letterSpacing: "8px",
	},
	pauseHint: {
		fontFamily: "system-ui, -apple-system, sans-serif",
		fontSize: "14px",
		fontWeight: 500,
		color: "rgba(0, 0, 0, 0.5)",
	},
};
