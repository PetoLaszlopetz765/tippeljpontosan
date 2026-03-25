import * as XLSX from "xlsx";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

function toDelegateName(modelName: string) {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

function toSheetName(modelName: string) {
  // Excel sheet rules: max 31 chars, avoid invalid chars.
  return modelName.replace(/[\\/?*\[\]:]/g, "_").slice(0, 31) || "Sheet";
}

export async function createFullBackupWorkbookBuffer() {
  const workbook = XLSX.utils.book_new();
  const models = Prisma.dmmf.datamodel.models;

  for (const model of models) {
    const delegateName = toDelegateName(model.name);
    const delegate = (prisma as any)[delegateName];

    if (!delegate || typeof delegate.findMany !== "function") {
      const sheet = XLSX.utils.json_to_sheet([{ info: `A(z) ${model.name} modellhez nincs elérhető delegate.` }]);
      XLSX.utils.book_append_sheet(workbook, sheet, toSheetName(model.name));
      continue;
    }

    const hasIdField = model.fields.some((field) => field.name === "id");
    const rows = await delegate.findMany(
      hasIdField
        ? { orderBy: { id: "asc" } }
        : undefined
    );

    const sheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ info: "Nincs adat" }]);
    XLSX.utils.book_append_sheet(workbook, sheet, toSheetName(model.name));
  }

  const fileBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
  return fileBuffer;
}
