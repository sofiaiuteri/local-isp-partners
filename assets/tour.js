// Guided tour: a small card that walks a first-time visitor across pages, highlighting one thing per step.
(function () {
  const KEY = "slp-tour";
  const STEPS = [
    { page: "index.html", el: ".landing-hero h1", title: "The problem",
      text: "Small ISPs each have homes they can't reach. They're too small for a reseller program and too many to sign by hand. Here's how agents could do it." },
    { page: "index.html", el: ".case", title: "Proof it already happens",
      text: "Piedmont Broadband already installs Starlink at homes it can't reach, but gets paid once. A program makes that recurring." },
    { page: "console.html", el: "#map", title: "Partner Console",
      text: "17 real Virginia ISPs on a terrain map. Brighter dots are better fits. A sample pipeline is loaded." },
    { page: "console.html", el: "#openDiscover", title: "Discovery agent",
      text: "Name any county or state and the agent finds its small providers, skipping the big carriers." },
    { page: "console.html", el: "#rows", click: "#lFcc", title: "The official FCC list",
      text: "All 32 small Virginia providers from FCC data. One click researches any of them. The agent also finds ones the FCC misses." },
    { page: "console.html#piedmont-broadband", el: "#detail", title: "Research, score, draft",
      text: "Each ISP gets a sourced profile, a fit score and a short email that opens with something true about them. A person approves before sending." },
    { page: "console.html#b2x-online-inc", el: "#rout", title: "Reply agent",
      text: "Paste an owner's reply. The agent sorts it, flags concerns and drafts an honest answer, even to \"isn't Starlink my competitor?\"" },
    { page: "partner.html?isp=piedmont-broadband", el: ".p-hero h1", title: "What the ISP owner sees",
      text: "The email links to a page made for them: their county and the homes they can't serve." },
    { page: "partner.html?isp=piedmont-broadband#estimate", el: ".calc", title: "Their estimate",
      text: "Owners move the sliders to see what their out-of-range homes could earn, with no towers to build." },
    { page: "portal.html?isp=piedmont-broadband", el: ".p-main", title: "Self-serve onboarding",
      text: "Partners sign, book training, get a demo kit and track earnings without a salesperson." },
    { page: "dashboard.html", el: "#liveFunnel", title: "Pipeline dashboard",
      text: "Everything rolls up here, from researched to live, plus how every reply was sorted." },
    { page: "dashboard.html", el: ".model", title: "The national picture",
      text: "Starting from 1,458 small US providers, change any rate to see what a rollout could deliver. The pilot replaces these guesses with real numbers." },
    { page: "memo.html", el: ".tldr", title: "The plan",
      text: "The memo covers why this has been hard, the offer and a six-week pilot. Thanks for taking the tour!" },
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
