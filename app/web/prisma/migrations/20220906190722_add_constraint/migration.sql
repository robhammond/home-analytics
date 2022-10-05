/*
  Warnings:

  - A unique constraint covering the columns `[carId,datetime]` on the table `CarStatus` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CarStatus_carId_datetime_key" ON "CarStatus"("carId", "datetime");
