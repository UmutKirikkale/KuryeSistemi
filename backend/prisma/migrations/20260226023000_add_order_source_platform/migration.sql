ALTER TABLE "orders"
ADD COLUMN "sourcePlatform" TEXT,
ADD COLUMN "externalOrderId" TEXT;

CREATE INDEX "orders_sourcePlatform_externalOrderId_idx"
ON "orders"("sourcePlatform", "externalOrderId");

CREATE UNIQUE INDEX "orders_restaurant_source_external_key"
ON "orders"("restaurantId", "sourcePlatform", "externalOrderId");
