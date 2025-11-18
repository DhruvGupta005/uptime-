import { z } from "zod";

export const monitorInputSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
  intervalSec: z.number().int().min(15).max(3600).default(60),
  timeoutMs: z.number().int().min(1000).max(60000).default(10000),
  headersJson: z.string().optional().nullable(),
  body: z.string().optional().nullable(),
  isPaused: z.boolean().optional().default(false),
  slackWebhook: z.string().url().optional().nullable(),
  slackEnabled: z.boolean().optional().default(false),
});

export type MonitorInput = z.infer<typeof monitorInputSchema>;



