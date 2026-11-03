// Reply-handling agent: reads an ISP owner's reply to outreach, sorts it, and drafts the response.
import { structured, handle } from "./_claude.js";

export const config = { maxDuration: 120 };

const STAGES = ["Researched", "Contacted", "Replied", "Call booked", "Onboarding", "Live"];
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["category", "summary", "concerns", "next_step", "suggested_stage", "reply_subject", "reply_body"],
  properties: {
    category: { type: "string", enum: ["Interested", "Question", "Objection", "Not now", "Not interested", "Wrong person", "Unsubscribe"] },
    summary: { type: "string" },
    concerns: { type: "array", items: { type: "string" } },
    next_step: { type: "string" },
    suggested_stage: { type: "string", enum: STAGES },
    reply_subject: { type: "string" },
    reply_body: { type: "string" },
  },
};

const SYSTEM = `You help the Starlink Local Partners team handle replies from small, independent internet providers (rural WISPs, telephone co-ops, small fiber companies) who were invited to become local partners.

The program as proposed (Starlink would set final terms): the ISP offers Starlink only to addresses its own network can't reach and as a backup line for its business customers; it keeps the customer relationship, earns its own install fee plus a monthly share per active subscriber; no fees, no minimums, no exclusivity, 30 days' notice to leave; it can move customers onto its own network later. Partners get a dedicated support line, a short training and a demo kit.

Read the ISP's reply and:
- Sort it into one category.
- Summarize what they said in one sentence, and list their specific concerns, if any.
- Recommend the next step and the pipeline stage they should move to. Unsubscribe or a clear no means no further outreach.
- Draft the reply. Answer their actual questions and concerns honestly, especially about channel conflict. Don't promise anything outside the program description above; if they ask about exact payouts, say final numbers come from Starlink and offer a call. Keep it short and warm, write like a person, and sign it "Starlink Local Partners, Virginia". No em dashes. If no reply should be sent (unsubscribe, hard no), write a one-line polite acknowledgment or leave the body empty.`;

export function POST(request) {
  return handle(request, async (body) => {
    const reply = String(body?.reply || "").trim().slice(0, 6000);
    if (reply.length < 2) return Response.json({ error: "Paste the ISP's reply first." }, { status: 400 });
    const isp = body?.isp || {};
    const context = [
      `ISP: ${isp.name || "unknown"}${isp.hq_town ? ` (${isp.hq_town})` : ""}`,
      isp.type && `Type: ${isp.type}`,
      isp.leader && `Contact: ${isp.leader}`,
      Array.isArray(isp.signals) && isp.signals.length && `What we know:\n- ${isp.signals.slice(0, 8).join("\n- ")}`,
      body?.sent && `Our email to them:\n${String(body.sent).slice(0, 4000)}`,
    ].filter(Boolean).join("\n");
    const out = await structured({
      system: SYSTEM,
      effort: "medium",
      schema: SCHEMA,
      prompt: `${context}\n\n<their_reply>\n${reply}\n</their_reply>`,
    });
    return Response.json(out);
  });
}
