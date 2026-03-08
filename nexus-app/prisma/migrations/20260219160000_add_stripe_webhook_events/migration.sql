-- Create table for persistent Stripe webhook idempotency and observability.
CREATE TABLE IF NOT EXISTS "StripeWebhookEvent" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "livemode" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'processing',
  "attempts" INTEGER NOT NULL DEFAULT 1,
  "processedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StripeWebhookEvent_eventId_key"
  ON "StripeWebhookEvent"("eventId");

CREATE INDEX IF NOT EXISTS "StripeWebhookEvent_status_idx"
  ON "StripeWebhookEvent"("status");

CREATE INDEX IF NOT EXISTS "StripeWebhookEvent_eventType_idx"
  ON "StripeWebhookEvent"("eventType");

CREATE INDEX IF NOT EXISTS "StripeWebhookEvent_createdAt_idx"
  ON "StripeWebhookEvent"("createdAt");
