/**
 * Simple Bun HTTP server for logging
 * Listens on port 3001 and writes logs to logs/ directory
 *
 * Run with: bun run server/log-server.ts
 */

import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const PORT = 3001;
const LOGS_DIR = "./logs";

// Ensure logs directory exists
if (!existsSync(LOGS_DIR)) {
	await mkdir(LOGS_DIR, { recursive: true });
	console.log(`📁 Created logs directory: ${LOGS_DIR}`);
}

// Generate log filename with timestamp
const now = new Date();
const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, -5);
const logFilename = `simulation-${timestamp}.log`;
const logPath = join(LOGS_DIR, logFilename);

console.log(`📝 Logging to: ${logPath}`);
console.log(`🚀 Log server running on http://localhost:${PORT}`);

const _server = Bun.serve({
	port: PORT,
	async fetch(req) {
		// CORS headers for local development
		const corsHeaders = {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		};

		// Handle CORS preflight
		if (req.method === "OPTIONS") {
			return new Response(null, { headers: corsHeaders });
		}

		if (req.method === "POST" && new URL(req.url).pathname === "/log") {
			try {
				const body = await req.json();
				const { message, timestamp: logTimestamp } = body;

				// Format: [HH:MM:SS.mmm] message
				const time = new Date(logTimestamp).toISOString().slice(11, 23);
				const logLine = `[${time}] ${message}\n`;

				// Append to log file
				const file = Bun.file(logPath);
				await Bun.write(logPath, (await file.text()) + logLine);

				return new Response(JSON.stringify({ success: true }), {
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				});
			} catch (error) {
				console.error("Error writing log:", error);
				return new Response(
					JSON.stringify({ success: false, error: String(error) }),
					{
						status: 500,
						headers: { ...corsHeaders, "Content-Type": "application/json" },
					},
				);
			}
		}

		return new Response("Log server ready", {
			headers: corsHeaders,
		});
	},
});

console.log(`\n✅ Ready to receive logs`);
console.log(`   Send POST to http://localhost:${PORT}/log`);
console.log(`   Press Ctrl+C to stop\n`);
