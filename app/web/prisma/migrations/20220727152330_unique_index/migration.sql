/*
  Warnings:

  - A unique constraint covering the columns `[entityId,datetime_start,datetime_end,granularity]` on the table `EntityUsage` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "EntityUsage_entityId_datetime_start_datetime_end_granularity_key" ON "EntityUsage"("entityId", "datetime_start", "datetime_end", "granularity");
