/*
  Warnings:

  - You are about to drop the `Car` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CarStatus` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CarUsage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CarbonIntensity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Cooling` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Credentials` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Electricity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Entity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EntityUsage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Heating` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `HotWater` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Insurance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Rates` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Solar` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Supplier` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Temperature` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Car";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CarStatus";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CarUsage";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CarbonIntensity";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Cooling";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Credentials";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Electricity";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Entity";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "EntityUsage";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Heating";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "HotWater";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Insurance";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Rates";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Solar";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Supplier";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Temperature";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Api" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "api_credentials" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "api_id" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "api_credentials_api_id_fkey" FOREIGN KEY ("api_id") REFERENCES "Api" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "electricity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datetime_start" DATETIME NOT NULL,
    "datetime_end" DATETIME NOT NULL,
    "kwh" REAL,
    "kwh_exported" REAL,
    "granularity" TEXT NOT NULL,
    "rate_id" INTEGER,
    "export_rate_id" INTEGER,
    "source" TEXT,
    CONSTRAINT "electricity_rate_id_fkey" FOREIGN KEY ("rate_id") REFERENCES "energy_rates" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "electricity_export_rate_id_fkey" FOREIGN KEY ("export_rate_id") REFERENCES "energy_rates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "solar" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datetime_start" DATETIME NOT NULL,
    "datetime_end" DATETIME,
    "kwh_produced" REAL,
    "kwh_consumed" REAL,
    "kwh_exported" REAL,
    "kwh_imported" REAL,
    "kwh_battery_discharge" REAL,
    "kwh_battery_charge" REAL,
    "time_unit" TEXT DEFAULT 'day'
);

-- CreateTable
CREATE TABLE "solar_snapshots" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datetime_start" DATETIME NOT NULL,
    "datetime_end" DATETIME,
    "kw_produced" REAL,
    "kw_consumed" REAL,
    "kw_exported" REAL,
    "kw_imported" REAL,
    "kw_battery_discharge" REAL,
    "kw_battery_charge" REAL,
    "time_unit" TEXT
);

-- CreateTable
CREATE TABLE "heating" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datetime" DATETIME NOT NULL,
    "kwh_consumed" REAL NOT NULL,
    "kwh_produced" REAL NOT NULL,
    "heating_cop" REAL NOT NULL,
    "granularity" TEXT NOT NULL DEFAULT 'daily'
);

-- CreateTable
CREATE TABLE "cooling" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datetime" DATETIME NOT NULL,
    "kwh_consumed" REAL NOT NULL,
    "kwh_produced" REAL NOT NULL,
    "cooling_cop" REAL NOT NULL,
    "granularity" TEXT NOT NULL DEFAULT 'daily'
);

-- CreateTable
CREATE TABLE "hot_water" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datetime" DATETIME NOT NULL,
    "kwh_produced" REAL NOT NULL,
    "kwh_consumed" REAL NOT NULL,
    "hot_water_cop" REAL NOT NULL,
    "granularity" TEXT NOT NULL DEFAULT 'daily'
);

-- CreateTable
CREATE TABLE "temperatures" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datetime" DATETIME NOT NULL,
    "set_temperature" REAL,
    "outside_temperature" REAL,
    "inside_temperature" REAL,
    "tank_temperature" REAL,
    "unit" TEXT NOT NULL DEFAULT 'hour'
);

-- CreateTable
CREATE TABLE "cars" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "variant" TEXT,
    "battery_size" INTEGER,
    "registration_number" TEXT,
    "vin" TEXT,
    "purchase_price" REAL,
    "purchase_odometer" INTEGER,
    "sale_price" REAL,
    "mot_date" TEXT,
    "service_date" TEXT,
    "tax_date" TEXT,
    "image_url" TEXT,
    "date_purchased" TEXT,
    "date_sold" TEXT
);

-- CreateTable
CREATE TABLE "car_usage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "car_id" INTEGER NOT NULL,
    "datetime" DATETIME NOT NULL,
    "granularity" TEXT NOT NULL,
    "distance_travelled" REAL,
    "distance_unit" REAL,
    "kwh_used" REAL,
    CONSTRAINT "car_usage_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "cars" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "car_status" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "car_id" INTEGER NOT NULL,
    "datetime" DATETIME NOT NULL,
    "odometer" REAL,
    "odometer_unit" TEXT,
    "battery_percent" INTEGER,
    "battery_temp" INTEGER,
    "battery_temp_unit" TEXT,
    "estimated_range" REAL,
    "range_unit" TEXT,
    "charging_status" INTEGER,
    "charging_remaining_time" INTEGER,
    "charging_target_percent" INTEGER,
    "is_locked" INTEGER,
    "location_lat_lon" TEXT,
    CONSTRAINT "car_status_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "cars" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "entities" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "backend" TEXT,
    "url" TEXT,
    "image" TEXT,
    "location" TEXT
);

-- CreateTable
CREATE TABLE "entity_attributes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entity_id" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "entity_attributes_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "entity_usage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datetime_start" DATETIME NOT NULL,
    "datetime_end" DATETIME NOT NULL,
    "duration_seconds" INTEGER,
    "duration_minutes" INTEGER,
    "entity_id" INTEGER NOT NULL,
    "granularity" TEXT NOT NULL,
    "kwh_used" REAL NOT NULL,
    "energy_cost" REAL,
    CONSTRAINT "entity_usage_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "energy_suppliers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "tariff_name" TEXT NOT NULL,
    "tariff_type" TEXT NOT NULL DEFAULT 'import',
    "standing_charge" REAL,
    "supplier_start" DATETIME,
    "supplier_end" DATETIME
);

-- CreateTable
CREATE TABLE "energy_rates" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "supplier_id" INTEGER NOT NULL,
    "rate_type" TEXT NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "cost" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'gbp',
    CONSTRAINT "energy_rates_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "energy_suppliers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "carbon_intensity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datetime_start" DATETIME NOT NULL,
    "datetime_end" DATETIME NOT NULL,
    "postcode" TEXT NOT NULL,
    "intensity_forecast" INTEGER NOT NULL,
    "intensity_index" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "finance_transactions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uid" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "counter_party" TEXT NOT NULL,
    "counter_party_sub_entity" TEXT,
    "reference" TEXT,
    "amount" REAL NOT NULL,
    "balance" REAL,
    "direction" TEXT,
    "status" TEXT,
    "spending_category" TEXT,
    "notes" TEXT,
    "source" TEXT,
    "source_sub_type" TEXT,
    "one_off_cost" BOOLEAN NOT NULL DEFAULT false,
    "ignore_cost" BOOLEAN NOT NULL DEFAULT false,
    "regular_cost" BOOLEAN NOT NULL DEFAULT false,
    "essential_cost" BOOLEAN NOT NULL DEFAULT false,
    "recur_type" TEXT,
    "flex_rating" INTEGER NOT NULL DEFAULT 3,
    "data_source" TEXT NOT NULL DEFAULT 'starling',
    "agent_id" INTEGER,
    "loan_id" INTEGER,
    "insurance_id" INTEGER,
    CONSTRAINT "finance_transactions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "finance_agents" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "finance_transactions_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "finance_loans" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "finance_transactions_insurance_id_fkey" FOREIGN KEY ("insurance_id") REFERENCES "finance_insurance" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "finance_agents" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "tag" TEXT,
    "agent_uid" TEXT,
    "one_off" BOOLEAN NOT NULL DEFAULT false,
    "ignore" BOOLEAN NOT NULL DEFAULT false,
    "essential" BOOLEAN NOT NULL DEFAULT false,
    "flex_rating" INTEGER NOT NULL DEFAULT 3,
    "parent_id" INTEGER,
    CONSTRAINT "finance_agents_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "finance_agents" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "finance_tags" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "finance_tag_map" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tag_id" INTEGER NOT NULL,
    "alternative_name" TEXT NOT NULL,
    CONSTRAINT "finance_tag_map_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "finance_tags" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "finance_transaction_tags" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tag_id" INTEGER NOT NULL,
    "transaction_id" INTEGER NOT NULL,
    CONSTRAINT "finance_transaction_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "finance_tags" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "finance_transaction_tags_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "finance_transactions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "finance_rules" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reference" TEXT,
    "transaction_id" INTEGER,
    "agent_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,
    CONSTRAINT "finance_rules_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "finance_transactions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "finance_rules_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "finance_agents" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "finance_rules_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "finance_tags" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "finance_loans" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "policy_no" TEXT,
    "opening_amount" REAL,
    "amount_remaining" REAL,
    "monthly_amount" REAL,
    "interest_rate" REAL,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME,
    "dom_due" INTEGER,
    "agent_id" INTEGER,
    "status" TEXT,
    CONSTRAINT "finance_loans_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "finance_agents" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "finance_insurance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "policy_no" TEXT,
    "monthly_payment" REAL,
    "total_cost" REAL,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME,
    "dom_due" INTEGER,
    "agent_id" INTEGER,
    "status" TEXT,
    CONSTRAINT "finance_insurance_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "finance_agents" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "electricity_datetime_start_granularity_key" ON "electricity"("datetime_start", "granularity");

-- CreateIndex
CREATE UNIQUE INDEX "solar_datetime_start_time_unit_key" ON "solar"("datetime_start", "time_unit");

-- CreateIndex
CREATE UNIQUE INDEX "solar_snapshots_datetime_start_time_unit_key" ON "solar_snapshots"("datetime_start", "time_unit");

-- CreateIndex
CREATE UNIQUE INDEX "heating_datetime_granularity_key" ON "heating"("datetime", "granularity");

-- CreateIndex
CREATE UNIQUE INDEX "cooling_datetime_granularity_key" ON "cooling"("datetime", "granularity");

-- CreateIndex
CREATE UNIQUE INDEX "hot_water_datetime_granularity_key" ON "hot_water"("datetime", "granularity");

-- CreateIndex
CREATE UNIQUE INDEX "temperatures_datetime_unit_key" ON "temperatures"("datetime", "unit");

-- CreateIndex
CREATE UNIQUE INDEX "car_status_car_id_datetime_key" ON "car_status"("car_id", "datetime");

-- CreateIndex
CREATE UNIQUE INDEX "entity_usage_entity_id_datetime_start_datetime_end_granularity_key" ON "entity_usage"("entity_id", "datetime_start", "datetime_end", "granularity");

-- CreateIndex
CREATE UNIQUE INDEX "carbon_intensity_datetime_start_datetime_end_postcode_key" ON "carbon_intensity"("datetime_start", "datetime_end", "postcode");

-- CreateIndex
CREATE UNIQUE INDEX "finance_transactions_uid_key" ON "finance_transactions"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "finance_agents_name_key" ON "finance_agents"("name");

-- CreateIndex
CREATE UNIQUE INDEX "finance_tags_name_key" ON "finance_tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "finance_tag_map_alternative_name_key" ON "finance_tag_map"("alternative_name");

-- CreateIndex
CREATE UNIQUE INDEX "finance_transaction_tags_tag_id_transaction_id_key" ON "finance_transaction_tags"("tag_id", "transaction_id");
