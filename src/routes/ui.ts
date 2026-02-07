import { Hono } from "hono";
import type { AppState } from "../index.js";

export function uiRoutes(state: AppState, app: Hono) {
  // Gift page (first run) or status page (configured)
  app.get("/", (c) => {
    if (state.config) {
      return c.html(statusPage(state.config.localToken, state.config.port));
    }
    return c.html(giftPage());
  });

  app.get("/api/status", (c) => {
    return c.json({
      configured: !!state.config,
      port: state.port,
    });
  });
}

// ── Gift Page HTML (v2.1 — tryskippy.com full-page redesign) ──

function giftPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>An Invitation from Skippy the Magnificent</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<script>
// Inline confetti — gold palette, slower decay, no CDN
!function(){function r(){return Math.random()}function n(a){return a[Math.floor(r()*a.length)]}window.confetti=function(o){o=o||{};var count=o.particleCount||80,spread=o.spread||60,origin=o.origin||{x:.5,y:.5},colors=o.colors||["#c4a35a","#b8953f","#d4c08a","#f5f0e8","#1a1816","#8b7d5e","#e8d5a0"],startV=o.startVelocity||30,decay=o.decay||.006,cv=document.createElement("canvas");cv.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999";document.body.appendChild(cv);var ctx=cv.getContext("2d"),ps=[];cv.width=window.innerWidth;cv.height=window.innerHeight;for(var i=0;i<count;i++){var angle=(r()*spread-spread/2)*Math.PI/180-Math.PI/2,v=startV+r()*20;ps.push({x:origin.x*cv.width,y:origin.y*cv.height,vx:Math.cos(angle)*v,vy:Math.sin(angle)*v,color:n(colors),size:r()*6+2,shape:n(["circle","rect","line"]),rot:r()*Math.PI*2,rotV:(r()-.5)*.2,life:1,decay:decay+r()*decay,wobble:r()*10,wobbleV:.03+r()*.05,gravity:.12})}!function t(){ctx.clearRect(0,0,cv.width,cv.height);for(var j=ps.length-1;j>=0;j--){var p=ps[j];p.vy+=p.gravity;p.x+=p.vx+Math.sin(p.wobble)*1.5;p.y+=p.vy;p.wobble+=p.wobbleV;p.rot+=p.rotV;p.vx*=.98;p.life-=p.decay;if(p.life<=0){ps.splice(j,1);continue}ctx.save();ctx.globalAlpha=p.life;ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.fillStyle=p.color;if(p.shape==="circle"){ctx.beginPath();ctx.arc(0,0,p.size,0,Math.PI*2);ctx.fill()}else if(p.shape==="rect"){ctx.fillRect(-p.size,-p.size/2,p.size*2,p.size)}else{ctx.strokeStyle=p.color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-p.size,0);ctx.lineTo(p.size,0);ctx.stroke()}ctx.restore()}ps.length>0?requestAnimationFrame(t):(ctx.clearRect(0,0,cv.width,cv.height),cv.remove())}()}}();
<\/script>
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  :root {
    --cream: #FAFAF8;
    --cream-warm: #f5f0e8;
    --ink: #1a1816;
    --ink-light: #4a4540;
    --gold: #c4a35a;
    --gold-dark: #b8953f;
    --gold-light: #d4c08a;
    --ghost: #d0cec8;
    --muted: #8b8580;
    --green: #27ae60;
    --red: #c0392b;
    --serif: 'Instrument Serif', Georgia, 'Times New Roman', serif;
    --sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --mono: 'SF Mono', 'Fira Code', ui-monospace, monospace;
  }

  html { scroll-behavior: smooth; }

  body {
    background: var(--cream);
    font-family: var(--sans);
    color: var(--ink);
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
  }

  /* ── Grain overlay ── */
  body::after {
    content: '';
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    opacity: .025;
    pointer-events: none;
    z-index: 9998;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }

  /* ── Nav bar ── */
  .nav {
    position: fixed;
    top: 0; left: 0; right: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 48px;
    z-index: 100;
    background: rgba(250,250,248,0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(208,206,200,0.4);
  }
  .nav-brand {
    font-family: var(--serif);
    font-size: 20px;
    color: var(--ink);
    text-decoration: none;
  }
  .nav-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 24px;
    font-family: var(--sans);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink);
    background: transparent;
    border: 1px solid var(--ghost);
    border-radius: 100px;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .nav-btn:hover {
    color: var(--gold-dark);
    border-color: var(--gold);
    box-shadow: 0 2px 12px rgba(196,163,90,0.12);
  }

  /* ── Small caps label ── */
  .label {
    font-family: var(--sans);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 20px;
  }
  .label .gold-dash {
    display: inline-block;
    width: 24px;
    height: 1px;
    background: var(--gold);
    vertical-align: middle;
    margin-right: 10px;
  }

  /* ── Gold shimmer ── */
  @keyframes shimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  .shimmer {
    background: linear-gradient(90deg, var(--gold-dark) 0%, var(--gold-light) 25%, var(--gold) 50%, var(--gold-light) 75%, var(--gold-dark) 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 3s ease-in-out infinite;
  }

  /* ── Ghost button ── */
  .ghost-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 16px 40px;
    font-family: var(--sans);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink);
    background: transparent;
    border: 1px solid var(--ghost);
    border-radius: 100px;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    text-decoration: none;
  }
  .ghost-btn:hover {
    color: var(--gold-dark);
    border-color: var(--gold);
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(196,163,90,0.12);
  }
  .ghost-btn svg {
    width: 14px; height: 14px;
    transition: transform 0.3s;
  }
  .ghost-btn:hover svg { transform: translateX(3px); }

  /* ── Sections ── */
  .section {
    padding: 120px 48px;
    position: relative;
  }
  .section-cream { background: var(--cream); }
  .section-warm { background: var(--cream-warm); }
  .section-inner {
    max-width: 1080px;
    margin: 0 auto;
  }

  /* ── Fade-up reveal ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(28px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .reveal {
    opacity: 0;
    transform: translateY(28px);
    transition: all 0.9s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .reveal.visible {
    opacity: 1;
    transform: translateY(0);
  }

  /* ── Section 1: Hero ── */
  .hero {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding-top: 80px;
  }
  .hero-inner {
    max-width: 620px;
  }
  .hero-headline {
    font-family: var(--serif);
    font-size: clamp(3.2rem, 8vw, 5.5rem);
    font-weight: 400;
    line-height: 1.05;
    margin-bottom: 32px;
    letter-spacing: -0.01em;
  }
  .hero-headline em { font-style: italic; }
  .hero-body {
    font-size: 16px;
    line-height: 1.75;
    color: var(--ink-light);
    max-width: 500px;
    margin-bottom: 44px;
  }

  /* ── Warm radial glow ── */
  .glow {
    position: absolute;
    top: 15%; right: 5%;
    width: 600px; height: 600px;
    background: radial-gradient(circle, rgba(196,163,90,0.08) 0%, transparent 70%);
    pointer-events: none;
  }

  /* ── Section 2: What This Is (split layout) ── */
  .split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
    align-items: center;
  }
  .split-text .section-headline {
    font-family: var(--serif);
    font-size: clamp(2rem, 4vw, 3rem);
    font-weight: 400;
    line-height: 1.15;
    margin-bottom: 20px;
  }
  .split-text .section-body {
    font-size: 15px;
    line-height: 1.75;
    color: var(--ink-light);
  }
  .split-text .aside-skippy {
    font-family: var(--serif);
    font-style: italic;
    font-size: 14px;
    color: var(--gold-dark);
    margin-top: 16px;
  }

  /* Mock terminal window */
  .mock-terminal {
    background: var(--ink);
    border-radius: 16px;
    padding: 28px;
    box-shadow: 0 20px 60px rgba(26,24,22,0.12);
  }
  .mock-terminal-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .dot { width: 10px; height: 10px; border-radius: 50%; }
  .dot-red { background: #ff5f56; }
  .dot-yellow { background: #ffbd2e; }
  .dot-green { background: #27c93f; }
  .mock-terminal-title {
    flex: 1;
    text-align: center;
    font-family: var(--sans);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.3);
  }
  .mock-terminal pre {
    font-family: var(--mono);
    font-size: 13px;
    line-height: 1.8;
    color: rgba(255,255,255,0.7);
    white-space: pre;
    overflow-x: auto;
  }
  .mock-terminal .hl-gold { color: var(--gold); }
  .mock-terminal .hl-green { color: #27c93f; }
  .mock-terminal .hl-muted { color: rgba(255,255,255,0.3); }

  /* ── Section 3: Auto-Setup ── */
  .setup-section {
    text-align: center;
  }
  .setup-headline {
    font-family: var(--serif);
    font-size: clamp(2rem, 5vw, 3.2rem);
    font-weight: 400;
    line-height: 1.15;
    margin-bottom: 40px;
  }

  /* Terminal card for walkthrough steps */
  .terminal-card {
    text-align: left;
    background: var(--ink);
    border-radius: 16px;
    padding: 32px;
    max-width: 600px;
    margin: 0 auto 28px;
    min-height: 300px;
    box-shadow: 0 20px 60px rgba(26,24,22,0.12);
  }
  .terminal-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .terminal-title {
    flex: 1;
    text-align: center;
    font-family: var(--sans);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.3);
  }

  /* Individual step rows */
  .setup-step {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 18px;
    opacity: 0;
    transform: translateX(-10px);
    transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .setup-step.visible {
    opacity: 1;
    transform: translateX(0);
  }
  .setup-step:last-child { margin-bottom: 0; }

  .step-icon {
    width: 22px; height: 22px;
    flex-shrink: 0;
    margin-top: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  @keyframes spin { to { transform: rotate(360deg); } }
  .spinner {
    width: 18px; height: 18px;
    border: 2px solid rgba(196,163,90,0.2);
    border-top-color: var(--gold);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  .check-icon { color: var(--green); font-size: 18px; line-height: 1; }
  .error-icon { color: var(--red); font-size: 18px; line-height: 1; }

  .step-content { flex: 1; min-width: 0; }
  .step-text {
    font-family: var(--mono);
    font-size: 13px;
    color: rgba(255,255,255,0.85);
    line-height: 1.5;
  }
  .step-skippy {
    font-family: var(--serif);
    font-style: italic;
    font-size: 12px;
    color: var(--gold);
    margin-top: 4px;
    opacity: 0;
    transition: opacity 0.4s;
  }
  .step-skippy.visible { opacity: 1; }
  .step-detail {
    font-family: var(--mono);
    font-size: 11px;
    color: rgba(255,255,255,0.35);
    margin-top: 2px;
  }
  .sub-badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 100px;
    font-family: var(--sans);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background: rgba(196,163,90,0.15);
    color: var(--gold);
    margin-left: 8px;
  }

  /* Try Again button */
  .retry-btn {
    display: none;
    margin: 20px auto 0;
    padding: 12px 32px;
    font-family: var(--sans);
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background: var(--ink);
    color: var(--cream);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 100px;
    cursor: pointer;
    transition: all 0.3s;
  }
  .retry-btn:hover {
    background: var(--gold-dark);
    border-color: var(--gold);
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(184,149,63,0.2);
  }
  .retry-btn.show { display: inline-block; }

  /* ── Section 4: How It Works ── */
  .hidden-section {
    opacity: 0;
    transform: translateY(40px);
    transition: all 1.2s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: none;
  }
  .hidden-section.revealed {
    opacity: 1;
    transform: translateY(0);
    pointer-events: all;
  }

  .how-headline {
    font-family: var(--serif);
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 400;
    margin-bottom: 48px;
    text-align: center;
  }

  .steps-row {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    gap: 0;
    max-width: 640px;
    margin: 0 auto;
  }
  .step-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
    max-width: 180px;
  }
  .step-circle {
    width: 52px; height: 52px;
    border-radius: 50%;
    border: 1px solid var(--ghost);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--serif);
    font-size: 20px;
    color: var(--ink);
    margin-bottom: 16px;
    transition: all 0.3s;
  }
  .step-circle.filled {
    background: var(--ink);
    border-color: var(--ink);
    color: var(--cream);
  }
  .step-connector {
    width: 48px;
    height: 1px;
    background: var(--ghost);
    margin-top: 26px;
    flex-shrink: 0;
  }
  .step-label {
    font-family: var(--serif);
    font-size: 18px;
    font-style: italic;
    margin-bottom: 8px;
  }
  .step-desc {
    font-size: 13px;
    color: var(--muted);
    line-height: 1.5;
    text-align: center;
  }

  /* ── Section 5: Config Card ── */
  .config-card {
    text-align: left;
    background: white;
    border: 1px solid var(--ghost);
    border-radius: 16px;
    padding: 36px;
    max-width: 560px;
    margin: 0 auto;
    box-shadow: 0 4px 24px rgba(26,24,22,0.04);
  }
  .config-card h3 {
    font-family: var(--sans);
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--muted);
    margin-bottom: 24px;
  }
  .config-step {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    margin-bottom: 18px;
    font-size: 14px;
    line-height: 1.5;
    color: var(--ink-light);
  }
  .config-step:last-child { margin-bottom: 0; }
  .config-num {
    width: 26px; height: 26px;
    border-radius: 50%;
    border: 1px solid var(--ghost);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
    color: var(--ink);
    flex-shrink: 0;
  }
  .config-step strong { color: var(--ink); font-weight: 600; }

  .copy-field {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--cream);
    border: 1px solid var(--ghost);
    padding: 10px 14px;
    border-radius: 8px;
    margin-top: 8px;
    font-family: var(--mono);
    font-size: 12px;
    color: var(--ink);
    word-break: break-all;
  }
  .copy-btn {
    background: var(--ink);
    border: none;
    color: var(--cream);
    padding: 5px 14px;
    border-radius: 6px;
    cursor: pointer;
    font-family: var(--sans);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    flex-shrink: 0;
    transition: background 0.2s;
  }
  .copy-btn:hover { background: var(--gold-dark); }

  /* ── Section 6: Footer Quote ── */
  .footer-quote {
    text-align: center;
    padding: 80px 48px 100px;
    border-top: 1px solid rgba(208,206,200,0.5);
  }
  .footer-quote blockquote {
    font-family: var(--serif);
    font-style: italic;
    font-size: 18px;
    color: var(--gold-dark);
    line-height: 1.5;
    margin-bottom: 12px;
    max-width: 480px;
    margin-left: auto;
    margin-right: auto;
  }
  .footer-quote cite {
    font-family: var(--sans);
    font-style: normal;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted);
  }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .nav { padding: 16px 24px; }
    .section { padding: 80px 24px; }
    .hero { padding-top: 100px; }
    .split {
      grid-template-columns: 1fr;
      gap: 48px;
    }
    .steps-row { flex-direction: column; align-items: center; gap: 20px; }
    .step-connector { width: 1px; height: 24px; margin: 0; }
    .terminal-card { padding: 24px; min-height: 260px; }
    .footer-quote { padding: 60px 24px 80px; }
  }
</style>
</head>
<body>

<!-- Nav Bar -->
<nav class="nav">
  <a href="#" class="nav-brand">CursorBridge</a>
  <a href="#setup" class="nav-btn" onclick="startSetupScroll(event)">Accept Invite</a>
</nav>

<!-- Section 1: Hero -->
<section class="section section-cream hero" id="hero">
  <div class="glow"></div>
  <div class="hero-inner">
    <div class="label reveal"><span class="gold-dash"></span> An invitation from Skippy the Magnificent</div>
    <h1 class="hero-headline reveal">
      You're welcome.<br><em class="shimmer">Trust the awesomeness.</em>
    </h1>
    <p class="hero-body reveal">
      I'm a bridge between your Claude subscription and Cursor.
      Same models. Same output. Zero extra cost.
      Happy birthday, Josh.
    </p>
    <button class="ghost-btn reveal" onclick="startSetupScroll(event)">
      Accept Invitation
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    </button>
  </div>
</section>

<!-- Section 2: What This Is -->
<section class="section section-warm" id="what">
  <div class="section-inner">
    <div class="split">
      <div class="split-text reveal">
        <div class="label"><span class="gold-dash"></span> The Gift</div>
        <h2 class="section-headline">Claude Opus 4.6<br>in Cursor.</h2>
        <p class="section-body">
          Your Claude Max subscription, routed through a local proxy that speaks OpenAI.
          Cursor thinks it's talking to OpenAI. It's actually talking to Claude.
          Same $200/month you're already paying.
        </p>
        <p class="aside-skippy">
          I do things. <em>Real things.</em> Even a monkey could use this bridge. Probably.
        </p>
      </div>
      <div class="mock-terminal reveal">
        <div class="mock-terminal-header">
          <div class="dot dot-red"></div>
          <div class="dot dot-yellow"></div>
          <div class="dot dot-green"></div>
          <div class="mock-terminal-title">Proxy Flow</div>
        </div>
        <pre>
  <span class="hl-muted">Your editor</span>             <span class="hl-muted">Local proxy</span>           <span class="hl-muted">Anthropic</span>

  <span class="hl-gold">Cursor IDE</span>    <span class="hl-green">&rarr;</span>    <span class="hl-gold">CursorBridge</span>    <span class="hl-green">&rarr;</span>    <span class="hl-gold">Claude API</span>
  <span class="hl-muted">(OpenAI format)</span>     <span class="hl-muted">(localhost:4101)</span>     <span class="hl-muted">(your sub)</span>

  <span class="hl-muted">&#x250C;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2510;</span>
  <span class="hl-muted">&#x2502;</span> gpt-4 request <span class="hl-green">&rarr;</span> translated <span class="hl-green">&rarr;</span> claude response <span class="hl-muted">&#x2502;</span>
  <span class="hl-muted">&#x2514;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2518;</span></pre>
      </div>
    </div>
  </div>
</section>

<!-- Section 3: Auto-Setup / LMGTFY -->
<section class="section section-cream setup-section" id="setup">
  <div class="section-inner">
    <div class="label reveal"><span class="gold-dash"></span> Zero Effort Setup</div>
    <h2 class="setup-headline reveal">Sit back. I'll handle this.</h2>

    <div class="terminal-card reveal" id="terminal">
      <div class="terminal-header">
        <div class="dot dot-red"></div>
        <div class="dot dot-yellow"></div>
        <div class="dot dot-green"></div>
        <div class="terminal-title">CursorBridge Auto-Setup</div>
      </div>
      <div id="steps-container"></div>
    </div>

    <button class="retry-btn" id="retry-btn" onclick="retrySetup()">Try Again</button>
  </div>
</section>

<!-- Section 4: How It Works (hidden until setup complete) -->
<section class="section section-warm hidden-section" id="how-it-works">
  <div class="section-inner">
    <div class="label" style="text-align:center"><span class="gold-dash"></span> How It Works</div>
    <h2 class="how-headline">Simple as it should be.</h2>

    <div class="steps-row">
      <div class="step-item">
        <div class="step-circle">1</div>
        <div class="step-label">Copy</div>
        <div class="step-desc">Grab your token and base URL below</div>
      </div>
      <div class="step-connector"></div>
      <div class="step-item">
        <div class="step-circle">2</div>
        <div class="step-label">Paste</div>
        <div class="step-desc">Drop them into Cursor Settings &rarr; Models</div>
      </div>
      <div class="step-connector"></div>
      <div class="step-item">
        <div class="step-circle filled">3</div>
        <div class="step-label">Build</div>
        <div class="step-desc">You're done. Go build something.</div>
      </div>
    </div>
  </div>
</section>

<!-- Section 5: Config Card (hidden until setup complete) -->
<section class="section section-cream hidden-section" id="config-section">
  <div class="section-inner" style="max-width:600px; margin: 0 auto;">
    <div class="label" style="text-align:center"><span class="gold-dash"></span> Your Credentials</div>

    <div class="config-card">
      <h3>Cursor Settings</h3>
      <div class="config-step">
        <span class="config-num">1</span>
        <div>Open <strong>Cursor Settings &rarr; Models</strong></div>
      </div>
      <div class="config-step">
        <span class="config-num">2</span>
        <div>
          Paste this as your <strong>OpenAI API Key</strong>:
          <div class="copy-field">
            <span id="token-display" style="flex:1"></span>
            <button class="copy-btn" onclick="copyText('token-display', this)">Copy</button>
          </div>
        </div>
      </div>
      <div class="config-step">
        <span class="config-num">3</span>
        <div>Toggle ON <strong>"Override OpenAI Base URL"</strong></div>
      </div>
      <div class="config-step">
        <span class="config-num">4</span>
        <div>
          Set the <strong>Base URL</strong> to:
          <div class="copy-field">
            <span id="url-display" style="flex:1"></span>
            <button class="copy-btn" onclick="copyText('url-display', this)">Copy</button>
          </div>
        </div>
      </div>
      <div class="config-step">
        <span class="config-num">5</span>
        <div>Click <strong>Verify</strong> &mdash; green checkmark means it's working</div>
      </div>
    </div>
  </div>
</section>

<!-- Section 6: Footer Quote -->
<div class="footer-quote hidden-section" id="footer-quote">
  <blockquote>&ldquo;Somewhere, a caveman is proud of how far you've come. I am not that caveman.&rdquo;</blockquote>
  <cite>&mdash; Skippy the Magnificent</cite>
</div>

<script>
// ── Intersection Observer for scroll reveals ──
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// ── Accept Invitation / Nav button ──
let setupStarted = false;

function startSetupScroll(e) {
  e.preventDefault();

  // Initial confetti burst
  confetti({ particleCount: 120, spread: 90, origin: { x: 0.5, y: 0.45 }, startVelocity: 35, decay: 0.005 });
  setTimeout(() => {
    confetti({ particleCount: 60, spread: 120, origin: { x: 0.3, y: 0.5 }, startVelocity: 25, decay: 0.005 });
    confetti({ particleCount: 60, spread: 120, origin: { x: 0.7, y: 0.5 }, startVelocity: 25, decay: 0.005 });
  }, 200);

  // Smooth scroll to setup section
  setTimeout(() => {
    document.getElementById('setup').scrollIntoView({ behavior: 'smooth' });
    // Start auto-setup once scrolled into view (only once)
    if (!setupStarted) {
      setupStarted = true;
      setTimeout(startAutoSetup, 1200);
    }
  }, 500);
}

// ── Auto-Setup SSE Stream ──

function startAutoSetup() {
  const container = document.getElementById('steps-container');
  container.innerHTML = '';
  const stepEls = {};
  let hasError = false;

  document.getElementById('retry-btn').classList.remove('show');

  const source = new EventSource('/api/auto-setup/stream');

  source.onmessage = function(e) {
    const step = JSON.parse(e.data);
    let el = stepEls[step.id];

    if (!el) {
      el = document.createElement('div');
      el.className = 'setup-step';
      el.innerHTML = buildStepHTML(step);
      container.appendChild(el);
      stepEls[step.id] = el;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => el.classList.add('visible'));
      });
    } else {
      el.innerHTML = buildStepHTML(step);
    }

    // Show skippy commentary with slight delay
    if (step.skippy) {
      setTimeout(() => {
        const skipEl = el.querySelector('.step-skippy');
        if (skipEl) skipEl.classList.add('visible');
      }, 300);
    }

    // Handle completion
    if (step.id === 'complete' && step.status === 'done') {
      source.close();
      try {
        const info = JSON.parse(step.detail);
        document.getElementById('token-display').textContent = info.localToken;
        document.getElementById('url-display').textContent = info.baseUrl;
      } catch {}

      // ── Massive 5-wave victory confetti (1000+ particles) ──
      // Wave 1: Center burst
      confetti({ particleCount: 300, spread: 120, origin: { x: 0.5, y: 0.35 }, startVelocity: 50, decay: 0.004 });
      // Wave 2: Left
      setTimeout(() => {
        confetti({ particleCount: 150, spread: 100, origin: { x: 0.15, y: 0.4 }, startVelocity: 40, decay: 0.004 });
      }, 150);
      // Wave 3: Right
      setTimeout(() => {
        confetti({ particleCount: 150, spread: 100, origin: { x: 0.85, y: 0.4 }, startVelocity: 40, decay: 0.004 });
      }, 150);
      // Wave 4: Top-left rain
      setTimeout(() => {
        confetti({ particleCount: 200, spread: 140, origin: { x: 0.25, y: 0.1 }, startVelocity: 30, decay: 0.003 });
      }, 300);
      // Wave 5: Top-right rain
      setTimeout(() => {
        confetti({ particleCount: 200, spread: 140, origin: { x: 0.75, y: 0.1 }, startVelocity: 30, decay: 0.003 });
      }, 300);

      // Reveal hidden sections
      setTimeout(() => {
        document.getElementById('how-it-works').classList.add('revealed');
      }, 1000);
      setTimeout(() => {
        document.getElementById('config-section').classList.add('revealed');
      }, 1300);
      setTimeout(() => {
        document.getElementById('footer-quote').classList.add('revealed');
      }, 1600);
      // Auto-scroll to How It Works
      setTimeout(() => {
        document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' });
      }, 1800);
    }

    // Handle errors
    if (step.status === 'error') {
      source.close();
      hasError = true;
      document.getElementById('retry-btn').classList.add('show');
    }
  };

  source.onerror = function() {
    source.close();
    if (!hasError) {
      const el = document.createElement('div');
      el.className = 'setup-step visible';
      el.innerHTML = buildStepHTML({
        id: 'connection',
        status: 'error',
        label: 'Connection lost',
        skippy: "Even I can't fix a dead connection. Refresh and try again.",
      });
      container.appendChild(el);
      document.getElementById('retry-btn').classList.add('show');
    }
  };
}

function retrySetup() {
  setupStarted = true;
  startAutoSetup();
}

function buildStepHTML(step) {
  let icon = '';
  if (step.status === 'running') {
    icon = '<div class="spinner"></div>';
  } else if (step.status === 'done') {
    icon = '<span class="check-icon">&#10003;</span>';
  } else if (step.status === 'error') {
    icon = '<span class="error-icon">&#10007;</span>';
  }

  let detailHtml = '';
  if (step.detail && step.id === 'read_token' && step.status === 'done') {
    const sub = step.detail.charAt(0).toUpperCase() + step.detail.slice(1);
    detailHtml = '<span class="sub-badge">' + sub + '</span>';
  } else if (step.detail && step.status === 'error') {
    detailHtml = '<div class="step-detail">' + escapeHtml(step.detail) + '</div>';
  }

  return '<div class="step-icon">' + icon + '</div>' +
    '<div class="step-content">' +
      '<div class="step-text">' + escapeHtml(step.label) + detailHtml + '</div>' +
      (step.skippy ? '<div class="step-skippy">' + escapeHtml(step.skippy) + '</div>' : '') +
    '</div>';
}

function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function copyText(elementId, btn) {
  const text = document.getElementById(elementId).textContent;
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    btn.style.background = 'var(--green)';
    setTimeout(() => { btn.textContent = orig; btn.style.background = ''; }, 1500);
  });
}
<\/script>
</body>
</html>`;
}

function statusPage(localToken: string, port: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CursorBridge</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    min-height: 100vh;
    background: #0a0a1a;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #e0e0e0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .card {
    max-width: 480px;
    padding: 40px;
    text-align: center;
  }
  .status-dot {
    width: 12px; height: 12px;
    background: #2ecc71;
    border-radius: 50%;
    display: inline-block;
    margin-right: 8px;
    animation: blink 2s infinite;
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  h1 { font-size: 28px; margin-bottom: 8px; }
  .subtitle { color: #7f8c8d; margin-bottom: 32px; }
  .info { text-align: left; background: #1a1a2e; border-radius: 12px; padding: 20px; font-size: 14px; }
  .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #2c3e50; }
  .info-row:last-child { border: none; }
  .label { color: #7f8c8d; }
  .value { font-family: 'SF Mono', monospace; color: #3498db; }
</style>
</head>
<body>
<div class="card">
  <h1><span class="status-dot"></span> CursorBridge</h1>
  <p class="subtitle">Proxy is running</p>
  <div class="info">
    <div class="info-row"><span class="label">Port</span><span class="value">${port}</span></div>
    <div class="info-row"><span class="label">Token</span><span class="value">${localToken}</span></div>
    <div class="info-row"><span class="label">Base URL</span><span class="value">http://localhost:${port}/v1</span></div>
  </div>
</div>
</body>
</html>`;
}
