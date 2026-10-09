import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

const PROMPT = `You are a document checker for a Philippine rental app. A user uploaded a photo they claim is a valid ID.
Look at the image and reply with ONLY a JSON object (no prose, no code fences) with these keys:

{
  "looks_like_id": boolean,            // true only if this clearly looks like an official ID card/document
  "has_photo": boolean,                // is there a photo of a person on it?
  "has_name": boolean,                 // is a person's full name printed on it?
  "id_type": string | null,            // e.g. "Philippine government ID", "Employee ID", "Driver's License", "Passport", "Student ID", or null if unclear
  "reason": string                     // one short sentence a non-technical person can read
}

Be practical, not a forensic expert — you are only sanity-checking that the upload is an ID with a photo and a name, not detecting forgery. Use your best judgement. Return only the JSON object.`;

type IdCheck = {
  looks_like_id: boolean;
  has_photo: boolean;
  has_name: boolean;
  id_type: string | null;
  reason: string;
};

export async function POST(request: NextRequest) {
  await requireUser();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Feature dormant until the key is added in Vercel — not an error.
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
      max_tokens: 1024,
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
      return NextResponse.json({ configured: true, ok: false }, { status: 200 });
    }
    return NextResponse.json({ configured: true, ok: true, check: parsed });
  } catch {
    // Never block sign-up on an AI hiccup.
    return NextResponse.json({ configured: true, ok: false }, { status: 200 });
  }
}

/** Tolerant JSON parse: strips code fences and grabs the first {...} block. */
function parseJson(text: string): IdCheck | null {
  let s = text.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(s.slice(start, end + 1)) as IdCheck;
  } catch {
    return null;
  }
}
