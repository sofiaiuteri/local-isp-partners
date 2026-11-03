# Local ISP Partners

A working concept for signing up the long tail of small internet providers as satellite-internet partners, with AI agents doing the research, outreach and onboarding work that doesn't scale by hand.

About 1,500 small, independent ISPs serve rural America (1,458 fixed-broadband providers covering 25,000 homes or fewer in FCC data). Each one has a list of homes its towers or fiber can't reach. They're too small for a traditional reseller program and too many to sign one sales call at a time. This prototype shows how an agent-driven program could reach them county by county, starting with a Virginia pilot.

> Independent concept by Sofia Iuteri. Not affiliated with or endorsed by SpaceX or Starlink. ISP details come from public sources; program terms and earnings figures are illustrative.

## What's in it

| Page | What it does |
|---|---|
| **Overview** (`index.html`) | The problem, a Virginia case study, and a 2-minute guided tour |
| **Memo** (`memo.html`) | Why small ISPs have been hard to sign, a three-tier partner offer, and a six-week pilot plan |
| **Partner Console** (`console.html`) | 17 researched Virginia ISPs on a terrain map, fit scores with reasons, editable outreach drafts, pipeline board |
| **Partner page** (`partner.html?isp=…`) | Personalized page an ISP owner sees: their county, an earnings estimate, straight answers on channel conflict, short sign-up |
| **Partner portal** (`portal.html?isp=…`) | Self-serve onboarding: sign the agreement, book training, demo kit, quote customers, track earnings |
| **Dashboard** (`dashboard.html`) | Live pipeline funnel plus a national rollout model with adjustable rates |

## The agents

All three run on Claude (Opus 5.5) through serverless functions in `api/`:

- **Discovery** (`api/discover.js`): give it a county or state and it finds the small providers serving it from grant records, county pages and company sites, skipping national carriers.
- **Research** (`api/research.js`): profiles one ISP with live web search (coverage, network type, grants, leadership, signals relevant to a partnership), then converts the notes into validated JSON. Every fact links to its source.
- **Reply handling** (`api/reply.js`): reads an ISP owner's reply, sorts it (interested, question, objection, not now…), pulls out concerns and drafts an honest answer.

A person approves every message before it would be sent.

## Stack

Static HTML, CSS and vanilla JavaScript, Leaflet with Esri terrain tiles, and Vercel serverless functions using the Anthropic SDK. Pipeline, replies and portal state live in the browser's `localStorage`, so each visitor gets their own sandbox. A "Load sample pipeline" button fills in a clearly labeled example.

## Run locally

```bash
npm install
# .env.local needs ANTHROPIC_API_KEY and DEMO_CODE (the access code the live agents ask for)
npm run dev   # http://localhost:3000
```

## Author

Sofia Iuteri, Washington and Lee University
