import Anthropic from "@anthropic-ai/sdk";

export type IdVerdict = {
  looks_like_id: boolean; // is this clearly an ID card/document at all?
  is_clear: boolean; // are the photo AND the full name clearly readable?
  is_government_id: boolean; // issued by a government agency (not a company/school)?
  id_type: string | null; // e.g. "Driver's License", "Company ID"
  reason: string; // one short, friendly sentence
};

const PROMPT = `You are verifying an uploaded ID for a Philippine rental app. Look at the image and reply with ONLY a JSON object (no prose, no code fences):

{
  "looks_like_id": boolean,        // true only if this is clearly an ID card or ID document
  "is_clear": boolean,             // true only if BOTH a photo of a person AND the person's full name are clearly readable
  "is_government_id": boolean,     // true only if issued by a GOVERNMENT agency
  "id_type": string | null,        // e.g. "Philippine National ID", "Driver's License", "Passport", "UMID", "SSS ID", "PhilHealth ID", "Postal ID", "Voter's ID", "PRC ID", "Company ID", "Student ID", or null if not an ID
  "reason": string                 // one short, friendly sentence a non-technical person can read
}

Government-issued IDs include: Philippine National ID / PhilSys, Driver's License (LTO), Passport (DFA), UMID, SSS, GSIS, PhilHealth, Pag-IBIG, Postal ID, Voter's ID (COMELEC), PRC ID, TIN ID, Senior Citizen ID, PWD ID, Police/NBI clearance.
NOT government IDs: company / employee IDs, student / school IDs, gym or club membership cards, bank cards.

Be strict but fair. If it is blurry, cropped, or the name/photo can't be read, set is_clear to false. Return only the JSON object.`;

/** Tolerant JSON parse: strips code fences and grabs the first {...} block. */
function parseVerdict(text: string): IdVerdict | null {
  let s = text.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(s.slice(start, end + 1)) as IdVerdict;
  } catch {
    return null;
  }
}

/**
 * Asks Claude to classify an uploaded ID. Returns null when the feature isn't
 * configured (no API key) or the model errors/can't be parsed — callers treat
 * null as "couldn't verify" (never a hard failure).
 */
export async function classifyId(
  data: Buffer,
  mimeType: string,
): Promise<IdVerdict | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const b64 = data.toString("base64");
  const isPdf = mimeType === "application/pdf";
  const docBlock: Anthropic.ContentBlockParam = isPdf
    ? {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: b64 },
      }
    : {
        type: "image",
        source: {
          type: "base64",
          media_type: mimeType as "image/png" | "image/jpeg" | "image/webp",
          data: b64,
        },
      };

  const client = new Anthropic({ apiKey });
  try {
    const resp = await client.messages.create({
      // Cheap + plenty for this sanity check. Override with ID_CHECK_MODEL.
      model: process.env.ID_CHECK_MODEL || "claude-haiku-5-5",
      max_tokens: 1024,
      output_config: { effort: "low" },
      messages: [{ role: "user", content: [docBlock, { type: "text", text: PROMPT }] }],
    });
    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    return parseVerdict(text);
  } catch {
    return null;
  }
}
