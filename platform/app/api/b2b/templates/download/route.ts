import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "csv";

  let fileName = "modelo_importacao_questoes.csv";
  let contentType = "text/csv; charset=utf-8";

  if (type === "docx") {
    fileName = "modelo_importacao_questoes.docx";
    contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  } else if (type === "xlsx") {
    fileName = "modelo_importacao_questoes.xlsx";
    contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }

  const filePath = path.join(process.cwd(), "public", "templates", "b2b", fileName);
  if (!fs.existsSync(filePath)) {
    return new NextResponse("Template não encontrado", { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
