/*
  Warnings:

  - A unique constraint covering the columns `[api_id,key]` on the table `api_credentials` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[entity_id,key]` on the table `entity_attributes` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "api_credentials_api_id_key_key" ON "api_credentials"("api_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "entity_attributes_entity_id_key_key" ON "entity_attributes"("entity_id", "key");
