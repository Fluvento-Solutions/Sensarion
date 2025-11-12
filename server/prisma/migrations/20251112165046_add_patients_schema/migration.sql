-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" JSONB NOT NULL,
    "birthDate" DATE NOT NULL,
    "tags" TEXT[],
    "vitalsLatest" JSONB,
    "allergies" JSONB NOT NULL DEFAULT '[]',
    "medications" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientNote" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "text" TEXT NOT NULL,

    CONSTRAINT "PatientNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Encounter" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "location" TEXT,
    "reason" TEXT,
    "summary" TEXT,

    CONSTRAINT "Encounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Patient_practiceId_idx" ON "Patient"("practiceId");

-- CreateIndex
CREATE INDEX "Patient_practiceId_updatedAt_idx" ON "Patient"("practiceId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "PatientNote_patientId_createdAt_idx" ON "PatientNote"("patientId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Encounter_patientId_date_idx" ON "Encounter"("patientId", "date" DESC);

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientNote" ADD CONSTRAINT "PatientNote_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
