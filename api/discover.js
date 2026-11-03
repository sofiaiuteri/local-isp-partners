// Discovery agent: finds the small, independent ISPs serving a county, region or state.
// Returns a short list the console can then research one by one with /api/research.
import { webResearch, structured, handle, nullable } from "./_claude.js";

export const config = { maxDuration: 300 };

const TYPES = ["Fixed wireless", "Rural telco", "Co-op fiber", "Local fiber", "Hybrid"];
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["area", "isps"],
  properties: {
    area: { type: "string" },
    isps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "website", "hq_town", "type", "why_listed", "source", "verified"],
        properties: {
          name: { type: "string" },
          website: nullable("string"),
          hq_town: nullable("string"),
          type: { type: "string", enum: TYPES },
          why_listed: { type: "string" },
          source: { type: "string" },
          verified: { type: "boolean" },
        },
      },
    },
  },
};

const SYSTEM = `You find small, independent internet service providers for a Starlink team that wants to sign them up as local partners.

Given an area (a county, a region or a state), use web search to find the small ISPs that actually serve it: fixed wireless ISPs, rural telephone companies and co-ops, electric co-op broadband subsidiaries, and small local fiber builders. Good sources are state broadband office grant awards (VATI, BEAD, ReConnect), county broadband pages, WISPA and NTCA member lists, and the companies' own websites.

Leave out national and large regional carriers (Comcast/Xfinity, Charter/Spectrum, Cox, Verizon, AT&T, T-Mobile, Lumen/CenturyLink, Brightspeed, Frontier, Windstream/Kinetic, Shentel/Glo Fiber, Altice/Optimum, Mediacom, TDS) and satellite companies.

List only companies you confirmed are real and currently operating. Aim for 5 to 10, smallest and most rural first. If fewer than 5 serve the area itself, add small providers from neighboring counties and say which county they serve. For each, note the HQ town, network type, a one-sentence reason it's on the list (for example "won a 2024 VATI grant for 600 homes in the county" or "WISP whose coverage map covers the western half of the county"), and the URL that shows it.`;

export function POST(request) {
  return handle(request, async (body) => {
    const area = String(body?.area || "").trim().slice(0, 120);
    if (area.length < 3) return Response.json({ error: "Enter a county, region or state." }, { status: 400 });
    const exclude = (Array.isArray(body?.exclude) ? body.exclude : []).slice(0, 60).map(String);
    const notes = await webResearch({
      system: SYSTEM,
      prompt: `Area: ${area}${exclude.length ? `\nAlready on our list, skip these: ${exclude.join(", ")}` : ""}`,
      maxUses: 10,
    });
    const out = await structured({
      schema: SCHEMA,
      prompt: `Convert these notes into the structured list. Keep names, towns and URLs exactly as written and add nothing new. Keep each why_listed to one plain factual sentence about the company, with no remarks about the research (no "not confirmed", "believed", "placeholder"). Put uncertainty only in the fields: hq_town is null if unknown, and verified is false if the notes say the company or its coverage of this area still needs checking. Use one source URL. Include every small provider the notes name, including leads still to check (set verified to false for those). Leave out only large carriers and companies the notes say have closed. Replace em dashes with commas or periods.\n\n<notes>\n${notes}\n</notes>`,
    });
    // Skip companies already on the list, matching loosely ("B2X Online" vs "B2X Online, Inc.").
    const norm = (n) => n.toLowerCase().replace(/\(.*?\)/g, " ").replace(/\b(inc|llc|corp|co|company|the|cooperative|coop)\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
    const known = exclude.map(norm).filter(Boolean);
    out.isps = out.isps.filter((i) => { const n = norm(i.name); return n && !known.some((k) => k.startsWith(n) || n.startsWith(k)); });
    return Response.json(out);
  });
}
