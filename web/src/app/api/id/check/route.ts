import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { classifyId } from "@/lib/id-check";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

export async function POST(request: NextRequest) {
  await requireUser();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ configured: false }, { status: 200 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a file." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is larger than 20 MB." }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: "Upload a PDF, PNG, JPG, or WebP." },
      { status: 400 },
    );
  }

  const verdict = await classifyId(Buffer.from(await file.arrayBuffer()), file.type);
  if (!verdict) {
    return NextResponse.json({ configured: true, ok: false }, { status: 200 });
  }
  return NextResponse.json({ configured: true, ok: true, verdict });
}
