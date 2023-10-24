/*
  Warnings:

  - You are about to drop the `Api` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Api";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "apis" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_api_credentials" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "api_id" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "api_credentials_api_id_fkey" FOREIGN KEY ("api_id") REFERENCES "apis" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_api_credentials" ("api_id", "id", "key", "value") SELECT "api_id", "id", "key", "value" FROM "api_credentials";
DROP TABLE "api_credentials";
ALTER TABLE "new_api_credentials" RENAME TO "api_credentials";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
