-- CreateTable
CREATE TABLE "Food" (
    "id" SERIAL NOT NULL,
    "tacoId" INTEGER,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "kcal" DOUBLE PRECISION,
    "proteinG" DOUBLE PRECISION,
    "carbsG" DOUBLE PRECISION,
    "fatG" DOUBLE PRECISION,
    "fiberG" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Food_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Food_tacoId_key" ON "Food"("tacoId");

-- CreateIndex
CREATE UNIQUE INDEX "Food_normalizedName_key" ON "Food"("normalizedName");
