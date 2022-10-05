-- CreateTable
CREATE TABLE "CarbonIntensity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datetime_start" DATETIME NOT NULL,
    "datetime_end" DATETIME NOT NULL,
    "postcode" TEXT NOT NULL,
    "intensityForecast" INTEGER NOT NULL,
    "intensityIndex" TEXT NOT NULL,
    "biomass" REAL NOT NULL,
    "coal" REAL NOT NULL,
    "gas" REAL NOT NULL,
    "hydro" REAL NOT NULL,
    "imports" REAL NOT NULL,
    "nuclear" REAL NOT NULL,
    "other" REAL NOT NULL,
    "solar" REAL NOT NULL,
    "wind" REAL NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CarbonIntensity_datetime_start_datetime_end_postcode_key" ON "CarbonIntensity"("datetime_start", "datetime_end", "postcode");
