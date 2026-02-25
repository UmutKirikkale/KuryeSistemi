/*
  Warnings:

  - You are about to drop the column `commissionRate` on the `restaurants` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "restaurants" DROP COLUMN "commissionRate",
ADD COLUMN     "commissionPerOrder" DOUBLE PRECISION NOT NULL DEFAULT 0.0;
