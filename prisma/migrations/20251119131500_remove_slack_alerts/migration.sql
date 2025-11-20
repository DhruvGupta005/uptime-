-- DropTable
DROP TABLE IF EXISTS "Alert";

-- AlterTable
ALTER TABLE "Incident" DROP COLUMN IF EXISTS "lastAlertSentAt";

ALTER TABLE "Monitor"
  DROP COLUMN IF EXISTS "slackEnabled",
  DROP COLUMN IF EXISTS "slackWebhook";





