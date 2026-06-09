import { NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import { parsePortfolioPDF } from "@/lib/claude";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "no file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await pdfParse(buffer);
    const holdings = await parsePortfolioPDF(parsed.text);

    return NextResponse.json({ holdings, pageCount: parsed.numpages });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "PDF parsing failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
