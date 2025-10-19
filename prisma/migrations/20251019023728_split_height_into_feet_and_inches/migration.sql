/*
  Warnings:

  - You are about to drop the column `height` on the `user_profiles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user_profiles" DROP COLUMN "height",
ADD COLUMN     "feetHeight" DOUBLE PRECISION,
ADD COLUMN     "inchesHeight" DOUBLE PRECISION;
