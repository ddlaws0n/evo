/**
 * Logger utility - Sends logs to Bun log server
 *
 * Falls back to console.log if server is unavailable
 */

const LOG_SERVER_URL = "http://localhost:3001/log";
let serverAvailable = true;

/**
 * Log a message to the log server
 * Falls back to console.log if server is unavailable
 */
export async function log(message: string): Promise<void> {
	// Always log to console for immediate feedback
	console.log(message);

	// Skip server logging if we know it's unavailable
	if (!serverAvailable) return;

	try {
		const response = await fetch(LOG_SERVER_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				message,
				timestamp: new Date().toISOString(),
			}),
		});

		if (!response.ok) {
			throw new Error(`Log server returned ${response.status}`);
		}
	} catch (_error) {
		// Server not available - disable future attempts to avoid spam
		if (serverAvailable) {
			console.warn(
				"⚠️ Log server unavailable. Logs will only appear in console.",
			);
			console.warn("   Start log server with: bun run log:server");
			serverAvailable = false;
		}
	}
}

/**
 * Fire-and-forget logging (doesn't wait for server response)
 * Use this in performance-critical contexts like useFrame
 */
export function logAsync(message: string): void {
	log(message).catch(() => {
		// Silently fail - error already handled in log()
	});
}
