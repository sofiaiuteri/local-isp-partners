// Shared Claude helpers for the agents (files starting with "_" aren't routes on Vercel).
import Anthropic from "@anthropic-ai/sdk";

export const client = new Anthropic();
export const MODEL = "claude-opus-5-5";
// Refusal fallback: if a safety classifier declines, the API re-runs on a fallback model automatically.
export const FALLBACK = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" };

export const nullable = (type) => ({ anyOf: [{ type }, { type: "null" }] });

const textOf = (msg) => msg.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();

/** Research with live web search; returns the model's notes. */
export async function webResearch({ system, prompt, maxUses = 8, effort = "medium" }) {
  const messages = [{ role: "user", content: prompt }];
  let final = null;
  // Server-side web search can pause long turns (pause_turn); resume until the model finishes.
  for (let turn = 0; turn < 4; turn++) {
    final = await client.beta.messages
      .stream({
        model: MODEL,
        max_tokens: 32000,
        system,
        output_config: { effort },
        tools: [{ type: "web_search_20260209", name: "web_search", max_uses: maxUses }],
        messages,
        ...FALLBACK,
      })
      .finalMessage();
    if (final.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: final.content });
  }
  if (!final) throw new Error("No response from the research model.");
  if (final.stop_reason === "refusal") throw new Error("The request was declined.");
  const notes = textOf(final);
  if (!notes) throw new Error("Research came back empty.");
  return notes;
}

/** One call that must return JSON matching `schema`. */
export async function structured({ system, prompt, schema, effort = "low" }) {
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    ...(system ? { system } : {}),
    output_config: { effort, format: { type: "json_schema", schema } },
    messages: [{ role: "user", content: prompt }],
    ...FALLBACK,
  });
  if (response.stop_reason === "refusal") throw new Error("The request was declined.");
  return JSON.parse(textOf(response));
}

/** Shared request guard + error mapping for every agent route. */
export async function handle(request, run) {
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Send JSON." }, { status: 400 }); }
  if (!process.env.DEMO_CODE || String(body?.code || "").trim() !== process.env.DEMO_CODE)
    return Response.json({ error: "That access code isn't right." }, { status: 401 });
  try {
    return await run(body);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError)
      return Response.json({ error: "Too many requests right now. Try again in a minute." }, { status: 429 });
    if (err instanceof Anthropic.APIError)
      return Response.json({ error: `AI service error (${err.status}).` }, { status: 502 });
    return Response.json({ error: err.message || "Something went wrong." }, { status: 500 });
  }
}
