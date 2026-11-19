-- CreateEnum
CREATE TYPE "MedicineStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VariantStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AttributeDataType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'SELECT');

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "parentId" UUID,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "categoryId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "activeIngredient" VARCHAR(500) NOT NULL,
    "manufacturer" VARCHAR(255) NOT NULL,
    "registrationNumber" VARCHAR(100),
    "description" TEXT,
    "usageInformation" TEXT,
    "storageInformation" TEXT,
    "isPrescriptionRequired" BOOLEAN NOT NULL DEFAULT false,
    "status" "MedicineStatus" NOT NULL DEFAULT 'DRAFT',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),

    CONSTRAINT "medicines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicine_images" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "medicineId" UUID NOT NULL,
    "medicineVariantId" UUID,
    "bucketName" VARCHAR(100) NOT NULL,
    "objectKey" VARCHAR(500) NOT NULL,
    "publicUrl" TEXT,
    "fileName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medicine_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicine_variants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "medicineId" UUID NOT NULL,
    "sku" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "price" DECIMAL(18,2) NOT NULL,
    "status" "VariantStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),

    CONSTRAINT "medicine_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variant_attributes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(150) NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "dataType" "AttributeDataType" NOT NULL DEFAULT 'TEXT',
    "unit" VARCHAR(50),
    "isFilterable" BOOLEAN NOT NULL DEFAULT false,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "variant_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variant_attribute_options" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "variantAttributeId" UUID NOT NULL,
    "value" VARCHAR(255) NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "variant_attribute_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variant_attribute_values" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "medicineVariantId" UUID NOT NULL,
    "variantAttributeId" UUID NOT NULL,
    "variantAttributeOptionId" UUID,
    "textValue" TEXT,
    "numberValue" DECIMAL(18,4),
    "booleanValue" BOOLEAN,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "variant_attribute_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "username" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "fullName" VARCHAR(255) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "admin_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parentId_idx" ON "categories"("parentId");

-- CreateIndex
CREATE INDEX "categories_isActive_deletedAt_sortOrder_idx" ON "categories"("isActive", "deletedAt", "sortOrder");

-- CreateIndex
CREATE INDEX "categories_slug_idx" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "medicines_slug_key" ON "medicines"("slug");

-- CreateIndex
CREATE INDEX "medicines_categoryId_idx" ON "medicines"("categoryId");

-- CreateIndex
CREATE INDEX "medicines_status_deletedAt_isFeatured_idx" ON "medicines"("status", "deletedAt", "isFeatured");

-- CreateIndex
CREATE INDEX "medicines_status_deletedAt_publishedAt_idx" ON "medicines"("status", "deletedAt", "publishedAt");

-- CreateIndex
CREATE INDEX "medicines_name_idx" ON "medicines"("name");

-- CreateIndex
CREATE INDEX "medicines_activeIngredient_idx" ON "medicines"("activeIngredient");

-- CreateIndex
CREATE INDEX "medicines_manufacturer_idx" ON "medicines"("manufacturer");

-- CreateIndex
CREATE INDEX "medicine_images_medicineId_isPrimary_sortOrder_idx" ON "medicine_images"("medicineId", "isPrimary", "sortOrder");

-- CreateIndex
CREATE INDEX "medicine_images_medicineVariantId_isPrimary_idx" ON "medicine_images"("medicineVariantId", "isPrimary");

-- CreateIndex
CREATE INDEX "medicine_images_objectKey_idx" ON "medicine_images"("objectKey");

-- CreateIndex
CREATE UNIQUE INDEX "medicine_variants_sku_key" ON "medicine_variants"("sku");

-- CreateIndex
CREATE INDEX "medicine_variants_medicineId_status_deletedAt_idx" ON "medicine_variants"("medicineId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "medicine_variants_price_idx" ON "medicine_variants"("price");

-- CreateIndex
CREATE INDEX "medicine_variants_sku_idx" ON "medicine_variants"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "variant_attributes_code_key" ON "variant_attributes"("code");

-- CreateIndex
CREATE INDEX "variant_attributes_isActive_isFilterable_sortOrder_idx" ON "variant_attributes"("isActive", "isFilterable", "sortOrder");

-- CreateIndex
CREATE INDEX "variant_attributes_code_idx" ON "variant_attributes"("code");

-- CreateIndex
CREATE INDEX "variant_attribute_options_variantAttributeId_isActive_sortO_idx" ON "variant_attribute_options"("variantAttributeId", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "variant_attribute_options_variantAttributeId_value_key" ON "variant_attribute_options"("variantAttributeId", "value");

-- CreateIndex
CREATE INDEX "variant_attribute_values_variantAttributeId_variantAttribut_idx" ON "variant_attribute_values"("variantAttributeId", "variantAttributeOptionId");

-- CreateIndex
CREATE INDEX "variant_attribute_values_variantAttributeId_textValue_idx" ON "variant_attribute_values"("variantAttributeId", "textValue");

-- CreateIndex
CREATE INDEX "variant_attribute_values_variantAttributeId_numberValue_idx" ON "variant_attribute_values"("variantAttributeId", "numberValue");

-- CreateIndex
CREATE INDEX "variant_attribute_values_variantAttributeId_booleanValue_idx" ON "variant_attribute_values"("variantAttributeId", "booleanValue");

-- CreateIndex
CREATE UNIQUE INDEX "variant_attribute_values_medicineVariantId_variantAttribute_key" ON "variant_attribute_values"("medicineVariantId", "variantAttributeId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_accounts_username_key" ON "admin_accounts"("username");

-- CreateIndex
CREATE UNIQUE INDEX "admin_accounts_email_key" ON "admin_accounts"("email");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicines" ADD CONSTRAINT "medicines_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_images" ADD CONSTRAINT "medicine_images_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_images" ADD CONSTRAINT "medicine_images_medicineVariantId_fkey" FOREIGN KEY ("medicineVariantId") REFERENCES "medicine_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_variants" ADD CONSTRAINT "medicine_variants_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_attribute_options" ADD CONSTRAINT "variant_attribute_options_variantAttributeId_fkey" FOREIGN KEY ("variantAttributeId") REFERENCES "variant_attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_attribute_values" ADD CONSTRAINT "variant_attribute_values_medicineVariantId_fkey" FOREIGN KEY ("medicineVariantId") REFERENCES "medicine_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_attribute_values" ADD CONSTRAINT "variant_attribute_values_variantAttributeId_fkey" FOREIGN KEY ("variantAttributeId") REFERENCES "variant_attributes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_attribute_values" ADD CONSTRAINT "variant_attribute_values_variantAttributeOptionId_fkey" FOREIGN KEY ("variantAttributeOptionId") REFERENCES "variant_attribute_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

