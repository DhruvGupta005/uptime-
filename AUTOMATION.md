# Automated Uptime Monitoring

## How Automation Works

The application automatically monitors all your endpoints without any manual intervention!

### Automatic Scheduler

- **Runs every minute** - The scheduler checks for monitors that are due for checking
- **Respects intervals** - Each monitor is checked based on its individual `intervalSec` setting
- **Smart scheduling** - Only monitors that haven't been checked within their interval are run
- **Error resilient** - If one monitor fails, others continue to be checked

### How It Works

1. **Scheduler starts automatically** when the Next.js server starts
2. **Every minute**, the scheduler:
   - Queries all active (non-paused) monitors
   - Calculates which monitors are due for checking based on their `lastChecked` time and `intervalSec`
   - Runs checks for due monitors in parallel
   - Creates check records in the database
   - Creates/resolves incidents based on check results

### Monitor Intervals

Each monitor has its own `intervalSec` setting:
- **15 seconds** - High frequency monitoring (e.g., critical APIs)
- **60 seconds** - Standard monitoring (default)
- **300 seconds** - Low frequency (5 minutes)
- **3600 seconds** - Hourly checks

The scheduler respects these intervals - a monitor with 60s interval will only be checked once per minute, even if the scheduler runs every minute.

### Example Timeline

```
12:00:00 - Scheduler runs, checks Monitor A (60s interval) - ✅ Checked
12:00:30 - Scheduler runs, Monitor A not due yet (only 30s passed) - ⏭️ Skipped
12:01:00 - Scheduler runs, checks Monitor A again (60s passed) - ✅ Checked
```

### Manual Checks

You can still trigger manual checks:
- Click **"Run check now"** button on monitor detail page
- This runs immediately and updates the `lastChecked` timestamp
- The scheduler will respect this and wait for the full interval before checking again

### Monitoring the Scheduler

Check your server logs to see scheduler activity:
```
✅ Automated uptime scheduler started - checking monitors every minute
[Scheduler 2024-01-01T12:00:00.000Z] Checking for due monitors...
[Scheduler 2024-01-01T12:00:00.000Z] ✅ Ran 3 check(s)
```

### Pausing Monitors

- Set `isPaused: true` on a monitor to temporarily disable automatic checks
- Paused monitors are skipped by the scheduler
- You can still manually trigger checks on paused monitors

### Database Updates

Every check automatically:
- Creates a `Check` record with status, latency, and timestamp
- Updates monitor's `lastChecked` timestamp
- Creates `Incident` records when services go down
- Resolves `Incident` records when services recover

### No External Services Required

- Everything runs in your Next.js server
- No need for external cron services (though you can use `/api/cron` endpoint if preferred)
- Works in development and production
- Scales with your server

## Configuration

The scheduler is automatically initialized when:
- The server starts
- Any API route is called (monitors API, etc.)

No additional configuration needed!

## Troubleshooting

If monitors aren't being checked automatically:

1. **Check server logs** - Look for scheduler initialization messages
2. **Verify monitors are active** - Ensure `isPaused: false`
3. **Check database connection** - Scheduler needs database access
4. **Verify intervals** - Monitors with long intervals may not check immediately

## Performance

- Checks run in parallel for efficiency
- Failed checks don't block other monitors
- Database queries are optimized with indexes
- Scheduler runs in background, doesn't block API requests











