import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * One structured answer from the assistant.
 *
 * Two providers, in the order production is configured for — the same order
 * as /api/shape-idea, for the same reason: DeepSeek (JSON mode) is what the
 * site runs on today, and the Anthropic SDK (Claude Opus 5.5, structured
 * outputs) takes over when that key is set. Either way the caller gets a
 * parsed object and the model's name, and validates the shape itself —
 * a schema the provider promises is a schema the caller still checks.
 *
 * Every call spends money, so callers gate it behind consume_ai_credit()
 * (migration 0017) before coming here.
 */

export type JsonSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required: string[];
  additionalProperties: false;
};

export type GeneratedJson = { data: unknown; model: string };

/** No provider is configured. The caller falls back to something honest. */
export class AiUnavailable extends Error {
  constructor() {
    super("No assistant is configured");
    this.name = "AiUnavailable";
  }
}

/** The assistant declined. Not an outage — a different input is needed. */
export class AiRefused extends Error {
  constructor() {
    super("The assistant declined this one");
    this.name = "AiRefused";
  }
}

export function aiConfigured(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY || process.env.ANTHROPIC_API_KEY);
}

export async function generateJson(args: {
  system: string;
  user: string;
  schema: JsonSchema;
  /** For the provider without schema support: the keys, in words. */
  schemaHint: string;
}): Promise<GeneratedJson> {
  if (process.env.DEEPSEEK_API_KEY) {
    const model = "deepseek-chat";
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        max_tokens: 2048,
        messages: [
          {
            role: "system",
            content: `${args.system}\n\nRespond with ONLY a JSON object with exactly these keys:\n${args.schemaHint}`,
          },
          { role: "user", content: args.user },
        ],
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) {
      throw new Error(`DeepSeek answered ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = json.choices?.[0]?.message?.content ?? "";
    return { data: JSON.parse(text) as unknown, model };
  }

  if (process.env.ANTHROPIC_API_KEY) {
    const model = "claude-opus-5-5";
    const client = new Anthropic();
    const response = await client.beta.messages.create({
      model,
      max_tokens: 16000,
      // A safety decline on this model is re-run on a fallback model inside
      // the same call, so a flyer about, say, a harm-reduction drop-in does
      // not come back empty.
      betas: ["server-side-fallback-2026-06-01"],
      fallbacks: [{ model: "claude-opus-4-8" }],
      system: args.system,
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: args.schema },
      },
      messages: [{ role: "user", content: args.user }],
    });
    if (response.stop_reason === "refusal") throw new AiRefused();
    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") {
      throw new Error("The assistant returned no text");
    }
    return { data: JSON.parse(block.text) as unknown, model: response.model };
  }

  throw new AiUnavailable();
}
