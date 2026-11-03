// Live ISP research agent: researches one small ISP on the web and returns a profile
// in the same shape as data/isps.js. Two passes, like SponsorFlow's lib/research.ts:
// (1) Claude researches with web search and writes notes, (2) a second call turns the
// notes into validated JSON.
import { webResearch, structured, handle, nullable } from "./_claude.js";

export const config = { maxDuration: 300 };

const REGIONS = [
  "Shenandoah Valley", "Southwest VA/Appalachia", "Southside", "Northern Neck/Middle Peninsula",
  "Eastern Shore", "Piedmont", "Rockbridge/Bath/Highland area", "Hampton Roads", "Northern Virginia", "Outside Virginia",
];
const TYPES = ["Fixed wireless", "Rural telco", "Co-op fiber", "Local fiber", "Hybrid"];

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["found", "name", "website", "hq_town", "county", "region", "lat", "lng", "type", "counties_served",
    "est_customers", "customers_source", "leader", "signals", "opener", "sources"],
  properties: {
    found: { type: "boolean" },
    name: { type: "string" },
    website: nullable("string"),
    hq_town: { type: "string" },
    county: { type: "string" },
    region: { type: "string", enum: REGIONS },
    lat: nullable("number"),
    lng: nullable("number"),
    type: { type: "string", enum: TYPES },
    counties_served: { type: "array", items: { type: "string" } },
    est_customers: nullable("number"),
    customers_source: nullable("string"),
    leader: nullable("string"),
    signals: { type: "array", items: { type: "string" } },
    opener: { type: "string" },
    sources: { type: "array", items: { type: "string" } },
  },
};

const SYSTEM = `You research small, independent internet service providers (fixed wireless ISPs, rural telcos and telephone co-ops, electric co-op broadband subsidiaries, small local fiber builders) for a Starlink team evaluating them as local partners. A partner would offer Starlink to homes its own network can't reach, and as a backup line for its business customers.

Research the ISP the user names. Use web search, starting with the company's own website, then state broadband grant records, local news and trade press. Everything you report will be shown to the ISP's potential business partner, so record only facts you actually saw in a source. If the company can't be found, or isn't an ISP, say so plainly.

Record:
- Official name, website, HQ town, county and state, and the approximate latitude and longitude of the HQ town.
- Network type: fixed wireless, rural telco, co-op fiber, local fiber, or hybrid.
- Counties (and independent cities) served.
- Customer or subscriber count, only if a source states one, and which source.
- The owner, CEO or general manager, with title, if publicly listed.
- Signals relevant to a Starlink partnership, each a short factual sentence: an availability checker or waitlist; statements about line of sight, terrain or addresses they can't serve; business customers; their own install crew; recent grants (BEAD, VATI, ReConnect, RDOF, ARPA) and the build areas; anything they already say about Starlink or satellite.
- An opening line for a partnership email: one short, warm sentence (under 25 words) in second person ("you") about something specific and true about this company, like a milestone, a build, or how it started. Write like a person, not a marketer. No em dashes.
- The URLs you used.`;

export function POST(request) {
  return handle(request, async (body) => {
    const query = String(body?.query || "").trim().slice(0, 200);
    if (query.length < 3) return Response.json({ error: "Enter an ISP name or website." }, { status: 400 });
    const notes = await webResearch({ system: SYSTEM, prompt: `ISP to research: ${query}` });
    const isp = await structured({
      schema: SCHEMA,
      prompt: `Convert these research notes about "${query}" into the structured format. Keep every fact and URL exactly as the notes have them and add nothing new. Use null where the notes don't have a value. Set found to false if the notes say the company couldn't be found or isn't an ISP. Pick the closest region (use "Outside Virginia" for other states) and network type. Replace any em dashes with commas or periods. Leave out remarks about the research process or confidence, since the profile is shown to the company's potential partner.\n\n<notes>\n${notes}\n</notes>`,
    });
    if (!isp.found) return Response.json({ error: `Couldn't find an ISP matching "${query}".` }, { status: 404 });
    delete isp.found;
    if (isp.website && !/^https?:\/\//i.test(isp.website)) isp.website = "https://" + isp.website;
    return Response.json({ isp });
  });
}
