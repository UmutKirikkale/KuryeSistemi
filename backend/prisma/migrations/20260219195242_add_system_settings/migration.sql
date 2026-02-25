-- CreateTable
CREATE TABLE "system_settings" (
    "id" SERIAL NOT NULL,
    "courierAutoBusyAfterOrders" INTEGER NOT NULL DEFAULT 4,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);
