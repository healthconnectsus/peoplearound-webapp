import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/projects";

/**
 * POST /api/shape-idea — turn a free-form "brain dump" (typed or dictated)
 * into a structured project draft via Claude. Returns
 * { title, description, category, state, tip } ready to prefill the form.
 */

// Structured-output schema: Claude's response is validated against this,
// so the client can trust the shape without defensive parsing.
const SHAPE_SCHEMA = {
  type: "object" as const,
  properties: {
    title: {
      type: "string",
      description:
        "A clear, inviting one-sentence project title, max 140 characters, in the same language the user wrote in.",
    },
    description: {
      type: "string",
      description:
        "A friendly 2-5 sentence description: what the idea is, why it matters, and what kind of collaborators or help would move it forward. Written in first person, in the user's language.",
    },
    category: {
      type: "string",
      enum: [...CATEGORIES],
      description: "The best-fitting category for this project.",
    },
    state: {
      type: "string",
      enum: ["idea", "active"],
      description:
        "'idea' if this is still just a concept looking for people; 'active' if the user says they have already started building it.",
    },
    tip: {
      type: "string",
      description:
        "One short, encouraging suggestion for a detail that would make the post even stronger (e.g. a missing where/when/what-help-is-needed). Empty string if the idea is already complete.",
    },
  },
  required: ["title", "description", "category", "state", "tip"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You shape rough, spoken-style idea descriptions into clear neighborhood project posts for Peoplearound, a hyperlocal app where people share ideas/projects and neighbors join to build them together.

Rules:
- Preserve the user's intent and every concrete detail (places, times, skills needed). Never invent facts they didn't say.
- Write in the same language the user used.
- The description should sound like the user talking to their neighbors: warm, direct, first person. No corporate tone, no hype.
- If the input is vague, still produce the best possible draft from what's there, and use the tip field to suggest the single most useful missing detail.`;

export async function POST(request: Request) {
  // Only signed-in users may burn API tokens.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Every call spends real Claude API money — 20 shapes per user per day,
  // enforced in the database (migration 0017). Fails open if the RPC is
  // missing so the feature keeps working pre-migration.
  const { data: allowed, error: creditError } = await supabase.rpc(
    "consume_ai_credit",
  );
  if (!creditError && allowed === false) {
    return NextResponse.json(
      { error: "You've reached today's limit for AI shaping — the manual form still works!" },
      { status: 429 },
    );
  }

  if (!process.env.DEEPSEEK_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI assist is not configured yet." },
      { status: 503 },
    );
  }

  let raw: string;
  try {
    const body = await request.json();
    raw = String(body.idea ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!raw || raw.length < 10) {
    return NextResponse.json(
      { error: "Tell us a bit more first — a sentence or two is plenty." },
      { status: 400 },
    );
  }

  // DeepSeek first (OpenAI-compatible API, JSON mode); Anthropic as the
  // fallback provider when only that key is configured.
  if (process.env.DEEPSEEK_API_KEY) {
    try {
      const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          response_format: { type: "json_object" },
          max_tokens: 2048,
          messages: [
            {
              role: "system",
              content:
                SYSTEM_PROMPT +
                `\n\nRespond with ONLY a JSON object with exactly these keys:\n` +
                `"title" (string, ≤140 chars), "description" (string, 2–5 sentences), ` +
                `"category" (one of: ${CATEGORIES.join(", ")}), ` +
                `"state" ("idea" or "active"), ` +
                `"tip" (string, one short suggestion, or "" if complete).`,
            },
            {
              role: "user",
              content: `Here's my rough idea, please shape it into a project post:\n\n${raw.slice(0, 4000)}`,
            },
          ],
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) {
        console.error("shape-idea DeepSeek error:", res.status, await res.text());
        return NextResponse.json(
          { error: "The assistant hit a snag — please try again." },
          { status: 502 },
        );
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = data.choices?.[0]?.message?.content ?? "";
      const draft = JSON.parse(text) as {
        title?: unknown;
        description?: unknown;
        category?: unknown;
        state?: unknown;
        tip?: unknown;
      };
      // Coerce into DB-safe, schema-valid shape.
      return NextResponse.json({
        title: String(draft.title ?? "").slice(0, 140),
        description: String(draft.description ?? "").slice(0, 4000),
        category: (CATEGORIES as readonly string[]).includes(String(draft.category))
          ? String(draft.category)
          : "community",
        state: draft.state === "active" ? "active" : "idea",
        tip: String(draft.tip ?? ""),
      });
    } catch (err) {
      console.error("shape-idea DeepSeek failure:", err);
      return NextResponse.json(
        { error: "The assistant hit a snag — please try again." },
        { status: 502 },
      );
    }
  }

  const anthropic = new Anthropic();
  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      output_config: {
        format: {
          type: "json_schema",
          schema: SHAPE_SCHEMA,
        },
      },
      messages: [
        {
          role: "user",
          content: `Here's my rough idea, please shape it into a project post:\n\n${raw.slice(0, 4000)}`,
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json(
        { error: "Couldn't shape that one — try rephrasing your idea." },
        { status: 422 },
      );
    }

    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") {
      return NextResponse.json(
        { error: "Something went wrong — please try again." },
        { status: 502 },
      );
    }

    const draft = JSON.parse(block.text) as {
      title: string;
      description: string;
      category: string;
      state: "idea" | "active";
      tip: string;
    };
    // Belt-and-suspenders: keep within DB constraints.
    draft.title = draft.title.slice(0, 140);
    draft.description = draft.description.slice(0, 4000);

    return NextResponse.json(draft);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "The assistant is busy right now — try again in a moment." },
        { status: 429 },
      );
    }
    if (err instanceof Anthropic.APIError) {
      console.error("shape-idea API error:", err.status, err.message);
      return NextResponse.json(
        { error: "The assistant hit a snag — please try again." },
        { status: 502 },
      );
    }
    throw err;
  }
}
