-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('SHIRT', 'HOODIE', 'JACKET', 'PANTS', 'SHORTS', 'JEANS', 'COAT', 'SHOES', 'ACCESSORY');

-- AlterTable
ALTER TABLE "clothing_items" ADD COLUMN     "framedUrl" TEXT,
ADD COLUMN     "type" "ItemType" NOT NULL DEFAULT 'SHIRT';

-- CreateTable
CREATE TABLE "sections" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ClothingItemToSection" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_ClothingItemToSection_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "sections_userId_name_key" ON "sections"("userId", "name");

-- CreateIndex
CREATE INDEX "_ClothingItemToSection_B_index" ON "_ClothingItemToSection"("B");

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClothingItemToSection" ADD CONSTRAINT "_ClothingItemToSection_A_fkey" FOREIGN KEY ("A") REFERENCES "clothing_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClothingItemToSection" ADD CONSTRAINT "_ClothingItemToSection_B_fkey" FOREIGN KEY ("B") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Accessed only through Prisma (bypasses RLS); block the public REST API.
ALTER TABLE "sections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_ClothingItemToSection" ENABLE ROW LEVEL SECURITY;

-- Backfill types for existing items from their category and name.
UPDATE "clothing_items" SET "type" = CASE
  WHEN "category" = 'SHOES' THEN 'SHOES'
  WHEN "category" = 'ACCESSORIES' THEN 'ACCESSORY'
  WHEN "category" = 'OUTERWEAR' AND "name" ~* '(coat|parka|trench|puffer|overcoat)' THEN 'COAT'
  WHEN "category" = 'OUTERWEAR' THEN 'JACKET'
  WHEN "category" = 'TOPS' AND "name" ~* '(hoodie|sweatshirt|zip-up)' THEN 'HOODIE'
  WHEN "category" = 'TOPS' AND "name" ~* '(jacket|blazer)' THEN 'JACKET'
  WHEN "category" = 'TOPS' THEN 'SHIRT'
  WHEN "category" = 'BOTTOMS' AND "name" ~* '(short|jorts)' THEN 'SHORTS'
  WHEN "category" = 'BOTTOMS' AND "name" ~* '(jean|denim)' THEN 'JEANS'
  ELSE 'PANTS'
END::"ItemType";
