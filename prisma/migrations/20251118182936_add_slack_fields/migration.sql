-- AlterTable
ALTER TABLE "Monitor" ADD COLUMN     "slackEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slackWebhook" TEXT;
