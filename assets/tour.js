// Guided tour: a small card that walks a first-time visitor across pages, highlighting one thing per step.
(function () {
  const KEY = "slp-tour";
  const STEPS = [
    { page: "index.html", el: ".landing-hero h1", title: "The problem",
      text: "Thousands of small ISPs each have homes their towers and fiber can't reach. Too small for a reseller program, too many to sign one sales call at a time. This tour shows how agents could do it, in about two minutes." },
    { page: "index.html", el: ".case", title: "Proof it already happens",
      text: "Piedmont Broadband in Rappahannock County already installs Starlink for homes it can't reach. It just gets paid once. A partner program turns that into recurring revenue for them and new customers for Starlink." },
    { page: "console.html", el: "#map", title: "Partner Console",
      text: "17 real Virginia ISPs, researched from public sources and placed on a terrain map. Brighter dots are better fits. The sample pipeline is loaded, so some are already in progress." },
    { page: "console.html", el: "#openDiscover", title: "Discovery agent",
      text: "Type any county or state and the agent searches grant records, county pages and company sites for the small providers there, skipping the big carriers. Pick the ones worth a full profile." },
    { page: "console.html", el: "#rows", click: "#lFcc", title: "The official FCC list",
      text: "The FCC list shows all 32 small Virginia providers in federal broadband data, with homes covered and counties. One click researches any of them. The agent also finds ISPs the FCC data misses, like Piedmont Broadband." },
    { page: "console.html#piedmont-broadband", el: "#detail", title: "Research, score, draft",
      text: "Every ISP gets a sourced profile, a fit score with the reasons behind it, and an email that opens with something true about their business. A person approves before anything sends." },
    { page: "console.html#b2x-online-inc", el: "#rout", title: "Reply agent",
      text: "When an owner writes back, paste the reply. The agent sorts it, pulls out their concerns and drafts an honest answer, including the hard one: isn't Starlink my competitor?" },
    { page: "partner.html?isp=piedmont-broadband", el: ".p-hero h1", title: "What the ISP owner sees",
      text: "The link in the email opens a page made for them: their county, their terrain, and a pitch about the homes they can't serve, not a generic reseller program." },
    { page: "partner.html?isp=piedmont-broadband#estimate", el: ".calc", title: "Their estimate",
      text: "Owners move the sliders to match their business and see what the homes on their waitlist could earn them, with no towers to build." },
    { page: "portal.html?isp=piedmont-broadband", el: ".p-main", title: "Self-serve onboarding",
      text: "After signing up, partners sign the agreement, book training, get a demo kit, quote customers and track earnings, all without a salesperson. In the sample, Piedmont has three active customers." },
    { page: "dashboard.html", el: "#liveFunnel", title: "Pipeline dashboard",
      text: "Everything above rolls up here: researched, contacted, replied, call, onboarding, live, plus how the agent sorted every reply." },
    { page: "dashboard.html", el: ".model", title: "The national picture",
      text: "Starting from the FCC count of 1,458 small US providers, change any rate to see what a rollout could deliver. The Virginia pilot's job is to replace these guesses with real numbers." },
    { page: "memo.html", el: ".tldr", title: "The plan",
      text: "The memo covers why this has been hard, the offer I'd make small ISPs, and a six-week Virginia pilot. Thanks for taking the tour!" },
  ];

  const file = p => p.split(/[?#]/)[0] || "index.html";
  const isp = p => (p.split("?")[1] || "").split("#")[0].match(/isp=([^&]+)/)?.[1] || null;
  const here = () => {
    const f = location.pathname.split("/").pop() || "index.html";
    return { f, isp: new URLSearchParams(location.search).get("isp"), hash: location.hash.slice(1) };
  };
  const onPage = s => { const h = here(); return file(s.page) === h.f && (!isp(s.page) || isp(s.page) === h.isp); };

  function go(n) {
    if (n < 0) return;
    if (n >= STEPS.length) return end();
    sessionStorage.setItem(KEY, String(n));
    const s = STEPS[n];
    const target = new URL(s.page, location.href);
    const sameDoc = target.pathname === location.pathname && target.search === location.search;
    if (sameDoc && target.hash === location.hash) return show(n);
    location.href = target.href;
    if (sameDoc) location.reload(); // console reads its hash only on load
  }
  function end() {
    sessionStorage.removeItem(KEY);
    document.querySelector(".tour-card")?.remove();
    document.querySelectorAll(".tour-hl").forEach(e => e.classList.remove("tour-hl"));
  }
  function show(n) {
    const s = STEPS[n];
    document.querySelectorAll(".tour-hl").forEach(e => e.classList.remove("tour-hl"));
    if (s.click) document.querySelector(s.click)?.click();
    else if (document.querySelector("#lOurs") && !document.querySelector("#lOurs").classList.contains("on")) document.querySelector("#lOurs").click();
    const el = document.querySelector(s.el);
    if (el) { el.classList.add("tour-hl"); el.scrollIntoView({ behavior: "smooth", block: "center" }); }
    let card = document.querySelector(".tour-card");
    if (!card) { card = document.createElement("div"); card.className = "tour-card"; document.body.appendChild(card); }
    card.innerHTML = `<div class="tour-top"><span>${n + 1} / ${STEPS.length}</span><button class="tour-x" aria-label="End tour">End tour</button></div>
      <h4>${s.title}</h4><p>${s.text}</p>
      <div class="tour-nav">${n ? '<button class="btn sm" data-t="back">Back</button>' : ""}<button class="btn sm solid" data-t="next">${n === STEPS.length - 1 ? "Finish" : "Next"}</button></div>`;
    card.querySelector(".tour-x").onclick = end;
    card.querySelector('[data-t="next"]').onclick = () => go(n + 1);
    card.querySelector('[data-t="back"]')?.addEventListener("click", () => go(n - 1));
  }

  window.SLPTour = {
    start() { if (window.SLP && !SLP.isSample()) SLP.loadSample(); sessionStorage.setItem(KEY, "0"); go(0); },
  };
  window.addEventListener("load", () => {
    // ?tour=1 starts the tour (a link you can send); ?tour=N jumps to step N.
    const t = new URLSearchParams(location.search).get("tour");
    if (t) {
      if (window.SLP && !SLP.isSample()) SLP.loadSample();
      const i = Math.min(Math.max((+t || 1) - 1, 0), STEPS.length - 1);
      sessionStorage.setItem(KEY, String(i));
      if (!onPage(STEPS[i])) return go(i);
    }
    const n = sessionStorage.getItem(KEY);
    if (n === null) return;
    const i = +n;
    if (STEPS[i] && onPage(STEPS[i])) setTimeout(() => show(i), 350);
  });
})();
