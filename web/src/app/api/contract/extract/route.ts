import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

const PROMPT = `You are reading a rental/lease contract for a Philippine rental app.
Extract the basic details and reply with ONLY a JSON object (no prose, no code fences) with these keys:

{
  "renter_name": string | null,        // the tenant / lessee full name
  "renter_phone": string | null,       // E.164 like +639171234567, else null
  "renter_email": string | null,
  "amount_php": number | null,          // rent amount in PESOS (not centavos), numbers only
  "frequency": "monthly" | "weekly" | "biweekly" | "quarterly" | null,
  "due_day": number | null,             // day rent is due: 1-31 for monthly/quarterly; 0-6 (Sun-Sat) for weekly/biweekly
  "start_date": string | null,          // YYYY-MM-DD
  "payment_instructions": string | null // e.g. GCash number / bank details, if present
}

Use null for anything not clearly stated. Do not guess. Return only the JSON object.`;

type Extracted = {
  renter_name: string | null;
  renter_phone: string | null;
  renter_email: string | null;
  amount_php: number | null;
  frequency: "monthly" | "weekly" | "biweekly" | "quarterly" | null;
  due_day: number | null;
  start_date: string | null;
  payment_instructions: string | null;
};

export async function POST(request: NextRequest) {
  // Only signed-in lessors may use this.
  await requireUser();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { configured: false, error: "Auto-read isn't set up yet." },
      { status: 200 },
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a file." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is larger than 10 MB." }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: "Upload a PDF, PNG, JPG, or WebP." },
      { status: 400 },
    );
  }

  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  const isPdf = file.type === "application/pdf";
  const docBlock: Anthropic.ContentBlockParam = isPdf
    ? {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data },
      }
    : {
        type: "image",
        source: {
          type: "base64",
          media_type: file.type as "image/png" | "image/jpeg" | "image/webp",
          data,
        },
      };

  const client = new Anthropic({ apiKey });
  try {
    const resp = await client.messages.create({
      model: process.env.CONTRACT_AI_MODEL || "claude-opus-5-5",
      max_tokens: 2048,
      output_config: { effort: "low" },
      messages: [{ role: "user", content: [docBlock, { type: "text", text: PROMPT }] }],
    });

    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    const parsed = parseJson(text);
    if (!parsed) {
      return NextResponse.json(
        { error: "Couldn't read that file. Please fill the form manually." },
        { status: 200 },
      );
    }
    return NextResponse.json({ ok: true, fields: parsed satisfies Extracted });
  } catch (err) {
    const message =
      err instanceof Anthropic.APIError ? err.message : "AI request failed.";
    return NextResponse.json({ error: message }, { status: 200 });
  }
}

/** Tolerant JSON parse: strips code fences and grabs the first {...} block. */
function parseJson(text: string): Extracted | null {
  let s = text.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(s.slice(start, end + 1)) as Extracted;
  } catch {
    return null;
  }
}
