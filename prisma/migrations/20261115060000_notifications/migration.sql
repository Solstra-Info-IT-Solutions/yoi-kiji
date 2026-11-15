CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'WHATSAPP');
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED');
CREATE TABLE "NotificationLog" (
 "id" TEXT NOT NULL,
 "orderId" TEXT NOT NULL,
 "channel" "NotificationChannel" NOT NULL,
 "event" TEXT NOT NULL,
 "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
 "providerId" TEXT,
 "error" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NotificationLog_orderId_channel_event_key" ON "NotificationLog"("orderId","channel","event");
CREATE INDEX "NotificationLog_status_createdAt_idx" ON "NotificationLog"("status","createdAt");
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
