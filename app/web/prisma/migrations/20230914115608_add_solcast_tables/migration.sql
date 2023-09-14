-- CreateTable
CREATE TABLE "solcast_forecasts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pv_estimate" REAL NOT NULL,
    "pv_estimate10" REAL NOT NULL,
    "pv_estimate90" REAL NOT NULL,
    "period_end" DATETIME NOT NULL,
    "period" TEXT NOT NULL,
    "update_timestamp" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "solcast_estimated_actuals" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pv_estimate" REAL NOT NULL,
    "period_end" DATETIME NOT NULL,
    "period" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "solcast_forecasts_period_end_period_update_timestamp_key" ON "solcast_forecasts"("period_end", "period", "update_timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "solcast_estimated_actuals_period_end_period_key" ON "solcast_estimated_actuals"("period_end", "period");
