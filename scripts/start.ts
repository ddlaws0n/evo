/**
 * Unified startup script
 * Starts both log server and Vite dev server
 */

import { spawn } from "bun";

console.log("🚀 Starting Evo simulation...\n");

// Start log server
const logServer = spawn({
	cmd: ["bun", "run", "server/log-server.ts"],
	stdout: "inherit",
	stderr: "inherit",
});

console.log("✅ Log server started\n");

// Wait a moment for log server to initialize
await Bun.sleep(500);

// Start Vite dev server
const viteServer = spawn({
	cmd: ["bun", "run", "vite"],
	stdout: "inherit",
	stderr: "inherit",
});

console.log("✅ Vite dev server started\n");

// Handle cleanup on exit
process.on("SIGINT", () => {
	console.log("\n\n🛑 Shutting down...");
	logServer.kill();
	viteServer.kill();
	process.exit(0);
});

// Keep the script running
await Promise.all([logServer.exited, viteServer.exited]);
