-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "auditLogs" JSONB NOT NULL DEFAULT '[]';
