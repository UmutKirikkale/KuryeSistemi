-- CreateTable
CREATE TABLE "courier_availability_events" (
    "id" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "courierId" TEXT NOT NULL,

    CONSTRAINT "courier_availability_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "courier_availability_events_courierId_createdAt_idx" ON "courier_availability_events"("courierId", "createdAt");

-- AddForeignKey
ALTER TABLE "courier_availability_events" ADD CONSTRAINT "courier_availability_events_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "courier_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
