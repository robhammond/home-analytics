-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Supplier" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "supplier" TEXT NOT NULL,
    "tariff_name" TEXT NOT NULL,
    "tariff_type" TEXT NOT NULL DEFAULT 'incoming',
    "standing_charge" REAL,
    "supplier_start" DATETIME,
    "supplier_end" DATETIME
);
INSERT INTO "new_Supplier" ("id", "standing_charge", "supplier", "supplier_end", "supplier_start", "tariff_name") SELECT "id", "standing_charge", "supplier", "supplier_end", "supplier_start", "tariff_name" FROM "Supplier";
DROP TABLE "Supplier";
ALTER TABLE "new_Supplier" RENAME TO "Supplier";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
