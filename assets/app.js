// Shared logic: scoring, outreach drafts, pipeline state.
(function () {
  const STAGES = ["Researched", "Contacted", "Replied", "Call booked", "Onboarding", "Live"];

  const TYPE_POINTS = {
    "Fixed wireless": 30, "Rural telco": 25, "Hybrid": 25, "Co-op fiber": 20, "Local fiber": 15
  };

  function slug(s) {
    return String(s).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  // Fit score: how likely this ISP has customers it can't serve and the means to sell + install.
  function score(isp) {
    const why = [];
    const sig = (isp.signals || []).join(" | ").toLowerCase();
    const tp = TYPE_POINTS[isp.type] ?? 15;
    why.push([tp, isp.type + " network"]);
    if (/wait ?list|availab|check (your )?address|line[- ]of[- ]sight|not (yet )?available|can't|cannot|out of range|coverage/.test(sig))
      why.push([20, "Has addresses its own network can't reach yet"]);
    if (/mountain|terrain|ridge|valley|hill|appalach|blue ridge|hollow/.test(sig) || ["Southwest VA/Appalachia", "Rockbridge/Bath/Highland area"].includes(isp.region))
      why.push([15, "Terrain makes towers and fiber expensive"]);
    if (/business|commercial|enterprise/.test(sig))
      why.push([10, "Already sells to businesses (backup line upsell)"]);
    if (/install|technician|field/.test(sig))
      why.push([10, "Has its own install crew"]);
    if (/grant|bead|vati|rdof|reconnect|arpa/.test(sig))
      why.push([10, "Mid build-out, needs a fill-in for the hardest addresses"]);
    if (isp.est_customers == null || isp.est_customers < 10000)
      why.push([5, "Small enough that a turnkey program matters"]);
    const total = Math.min(100, why.reduce((a, w) => a + w[0], 0));
    return { total, why };
  }

  function firstName(leader) {
    if (!leader) return null;
    const n = String(leader).split(",")[0].trim().split(/\s+/);
    if (!n.length) return null;
    const f = /^(dr|mr|ms|mrs)\.?$/i.test(n[0]) ? n[1] : n[0];
    return f || null;
  }

  function areaPhrase(isp) {
    const c = isp.counties_served || [];
    if (c.length === 0) return isp.county ? isp.county : isp.hq_town;
    if (c.length === 1) return c[0];
    if (c.length === 2) return c[0] + " and " + c[1];
    return c[0] + ", " + c[1] + " and the surrounding counties";
  }

  function partnerUrl(isp) {
    return "partner.html?isp=" + slug(isp.name);
  }

  function draft(isp) {
    const fn = firstName(isp.leader);
    const hi = isp.greeting || (fn ? "Hi " + fn + "," : "Hi there,");
    const hook = isp.opener || "";
    const subject = "The addresses in " + (isp.counties_served?.[0] || isp.county || "your area") + " you can't get to yet";
    // Sales emails stay at 4 or 5 sentences. People skim.
    const body =
`${hi}

${hook}

We're piloting a Virginia partner program for the homes your network can't reach yet: you offer Starlink, keep the customer, and earn on the install and every month after, with no fees or minimums.

Here's an estimate for ${isp.name}: [partner link]

Worth a 15-minute call next week?

Starlink Local Partners, Virginia`;
    return { subject, body };
  }

  // Pipeline state lives in localStorage so the demo remembers what you've done.
  const KEY = "slp-stages-v1";
  function loadStages() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
  function saveStages(s) { localStorage.setItem(KEY, JSON.stringify(s)); }
  function stageOf(isp, s) { return s[slug(isp.name)] || "Researched"; }

  // ISPs researched live by the agent are kept in this browser alongside the built-in list.
  const LIVE = "slp-live-isps-v1";
  function loadLive() { try { return JSON.parse(localStorage.getItem(LIVE)) || []; } catch { return []; } }
  function addLive(isp) {
    const list = loadLive().filter(i => slug(i.name) !== slug(isp.name));
    list.push({ ...isp, live: true, researched_at: new Date().toISOString() });
    localStorage.setItem(LIVE, JSON.stringify(list));
  }
  function allIsps() {
    const base = window.ISPS || [];
    const names = new Set(base.map(i => slug(i.name)));
    return base.concat(loadLive().filter(i => !names.has(slug(i.name))));
  }

  // Replies analyzed by the reply agent, keyed by ISP slug.
  const REPLIES = "slp-replies-v1";
  function loadReplies() { try { return JSON.parse(localStorage.getItem(REPLIES)) || {}; } catch { return {}; } }
  function saveReplies(r) { localStorage.setItem(REPLIES, JSON.stringify(r)); }

  // Partner portal state (signed agreement, checklist, customers), keyed by ISP slug.
  const PORTAL = "slp-portal-v1";
  function loadPortal(id) { try { return (JSON.parse(localStorage.getItem(PORTAL)) || {})[id] || null; } catch { return null; } }
  function savePortal(id, state) {
    let all = {}; try { all = JSON.parse(localStorage.getItem(PORTAL)) || {}; } catch {}
    all[id] = state; localStorage.setItem(PORTAL, JSON.stringify(all));
  }
  function allPortals() { try { return JSON.parse(localStorage.getItem(PORTAL)) || {}; } catch { return {}; } }

  // Sample pipeline so a first-time visitor sees the motion in progress. Clearly labeled everywhere it shows.
  const SAMPLE = "slp-sample";
  function isSample() { return localStorage.getItem(SAMPLE) === "1"; }
  function clearDemo() { [KEY, REPLIES, PORTAL, SAMPLE].forEach(k => localStorage.removeItem(k)); }
  function loadSample() {
    const id = n => slug(n);
    const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const stages = {};
    ["MGW (Mountain Grove-Williamsville Telephone / Lingo)", "Scott County Telephone Cooperative (SCTC)", "Bee Online Advantage (Craig-Botetourt Electric Cooperative)",
     "RURALBAND (Prince George Electric Cooperative)", "NeuBeam (Declaration Networks Group)", "EMPOWER Broadband (Mecklenburg Electric Cooperative)"].forEach(n => stages[id(n)] = "Contacted");
    stages[id("B2X Online, Inc.")] = "Replied";
    stages[id("GigaBeam Networks")] = "Replied";
    stages[id("Wave2Net")] = "Replied";
    stages[id("Fastlink Communications LLC")] = "Call booked";
    stages[id("Piedmont Broadband")] = "Live";
    saveStages(stages);
    const r = (reply, out) => ({ reply: "[Sample reply, written for the demo] " + reply, out, at: new Date().toISOString() });
    saveReplies({
      [id("B2X Online, Inc.")]: r("We get asked about Starlink every week by folks past the ridges. Who bills the customer, us or Starlink? And who do they call when it breaks?", {
        category: "Question", summary: "Interested in practical details: who bills the customer and who handles support.",
        concerns: ["Billing ownership", "Support responsibility"], next_step: "Answer both questions and offer a 15-minute call.", suggested_stage: "Call booked",
        reply_subject: "Re: The addresses you can't get to yet",
        reply_body: "Hi Warren,\n\nGreat questions. You'd keep the customer relationship, and first-line support stays with your team the way it works today. Starlink handles the network, hardware warranty and replacements, and partners get a dedicated support line. Exact billing setup is something Starlink would set in the final terms, so I'd like to walk you through it on a quick call.\n\nWould 15 minutes next week work?\n\nStarlink Local Partners, Virginia" }),
      [id("GigaBeam Networks")]: r("We've spent years building fiber-fed wireless out here. Why would we help Starlink get into our area?", {
        category: "Objection", summary: "Worried the program helps a competitor into their service area.",
        concerns: ["Channel conflict"], next_step: "Explain the program only covers addresses they can't reach, and that they can move customers onto their own network later.", suggested_stage: "Replied",
        reply_subject: "Re: The addresses you can't get to yet",
        reply_body: "Hi Michael,\n\nThat's a fair concern. The program only covers addresses your network can't reach today, plus backup lines for your business customers. Anyone you can serve stays on GigaBeam. And if your network reaches them later, you can move them over.\n\nHappy to talk it through if useful.\n\nStarlink Local Partners, Virginia" }),
      [id("Wave2Net")]: r("Not a good time, we're in the middle of our fiber build. Check back in the spring.", {
        category: "Not now", summary: "Busy with a fiber build; asked to reconnect in the spring.",
        concerns: [], next_step: "Thank them and set a reminder for March.", suggested_stage: "Replied",
        reply_subject: "Re: The addresses you can't get to yet", reply_body: "Hi Rudy,\n\nUnderstood, and good luck with the build. I'll check back in March.\n\nStarlink Local Partners, Virginia" }),
    });
    let all = {}; try { all = JSON.parse(localStorage.getItem(PORTAL)) || {}; } catch {}
    all[id("Piedmont Broadband")] = {
      applied: { name: "Richard and Russell Pate", title: "Owners" }, signed: { name: "Richard and Russell Pate", title: "Owners", date: today },
      slot: "Training booked", ship: "Sperryville, VA", shipped: true, practice: true, fee: 250, monthly: 15,
      customers: [
        { who: "Sample customer, F.T. Valley Rd", type: "Residential", status: "Active" },
        { who: "Sample customer, Hawlin Rd", type: "Residential", status: "Active" },
        { who: "Sample business, Main St", type: "Business backup", status: "Active" },
        { who: "Sample customer, Woodward Rd", type: "Residential", status: "Quoted" },
      ],
    };
    localStorage.setItem(PORTAL, JSON.stringify(all));
    localStorage.setItem(SAMPLE, "1");
  }

  // Small banner + toggle shown on pages that read pipeline state.
  function sampleBar(el, onChange) {
    if (!el) return;
    const draw = () => {
      el.innerHTML = isSample()
        ? `<span>Showing a <b>sample pipeline</b> made up for the demo. Replies and customers marked "sample" are not real.</span><button class="btn sm" data-x="clear">Clear sample</button>`
        : `<span>No outreach has gone out yet, so the pipeline is empty.</span><button class="btn sm solid" data-x="load">Load sample pipeline</button>`;
      el.querySelector("button").onclick = e => { e.target.dataset.x === "load" ? loadSample() : clearDemo(); onChange ? onChange() : location.reload(); };
    };
    draw();
  }

  window.SLP = { STAGES, slug, score, draft, partnerUrl, areaPhrase, firstName, loadStages, saveStages, stageOf, loadLive, addLive, allIsps,
    loadReplies, saveReplies, loadPortal, savePortal, allPortals, isSample, loadSample, clearDemo, sampleBar };
})();
