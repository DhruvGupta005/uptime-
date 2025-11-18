import cron, { ScheduledTask } from "node-cron";
import { runDueChecks } from "./uptime";

let schedulerStarted = false;
let cronJob: ScheduledTask | null = null;

export function startScheduler() {
  if (schedulerStarted) {
    console.log("[Scheduler] Already started, skipping initialization");
    return;
  }

  if (typeof window !== "undefined") {
    console.log("[Scheduler] Cannot start in browser environment");
    return;
  }

  // Run every minute: "* * * * *"
  // This checks monitors and runs checks for those that are due based on their intervalSec
  cronJob = cron.schedule("* * * * *", async () => {
    try {
      const timestamp = new Date().toISOString();
      console.log(`[Scheduler ${timestamp}] Checking for due monitors...`);
      const result = await runDueChecks();
      if (result.ran > 0) {
        console.log(`[Scheduler ${timestamp}] ✅ Ran ${result.ran} check(s)`);
      }
    } catch (error) {
      console.error(`[Scheduler] ❌ Error running checks:`, error);
    }
  }, {
    timezone: "UTC"
  });

  schedulerStarted = true;
  console.log("✅ Automated uptime scheduler started - checking monitors every minute");
  console.log("   Monitors will be checked based on their individual interval settings");
}

export function stopScheduler() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    schedulerStarted = false;
    console.log("[Scheduler] Stopped");
  }
}

// Initialize scheduler when module is imported in server environment
if (typeof window === "undefined") {
  // Small delay to ensure database connection is ready
  setTimeout(() => {
    startScheduler();
  }, 2000);
}

