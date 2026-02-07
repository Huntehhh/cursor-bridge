import { Hono } from "hono";
import type { AppState } from "../index.js";
import { defaultConfig, saveConfig } from "../config.js";
import { createClient, detectKeyType } from "../client.js";

export function uiRoutes(state: AppState, app: Hono) {
  // Gift page (first run) or status page (configured)
  app.get("/", (c) => {
    if (state.config) {
      return c.html(statusPage(state.config.localToken, state.config.port));
    }
    return c.html(giftPage());
  });

  // Setup API — receives key from gift page, hot-wires the proxy
  app.post("/api/setup", async (c) => {
    try {
      const body = await c.req.json<{ key: string }>();
      const key = body.key?.trim();

      if (!key || !key.startsWith("sk-ant-")) {
        return c.json(
          { error: "Key must start with sk-ant-oat or sk-ant-api" },
          400
        );
      }

      const keyType = detectKeyType(key);
      const config = defaultConfig(key, state.port);
      saveConfig(config);

      // Hot-swap state — proxy routes will pick this up on next request
      state.config = config;
      state.client = createClient(key);

      return c.json({
        success: true,
        keyType,
        localToken: config.localToken,
        port: config.port,
        baseUrl: `http://localhost:${config.port}/v1`,
      });
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : "Setup failed" },
        500
      );
    }
  });

  app.get("/api/status", (c) => {
    return c.json({
      configured: !!state.config,
      port: state.port,
    });
  });
}

// ── Gift Page HTML ──

function giftPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>You got a gift!</title>
<script>
// Inline confetti (no CDN — API key is entered on this page)
!function(t,e){var n=function(){var t=Math.PI/180,e=Math.random;function n(t){return t[Math.floor(e()*t.length)]}function r(t,r,o){var a=r||60,c=o||1,l=t*t/a,i={x:e()*l-l/2,y:-e()*l*3,tiltAngle:e()*Math.PI,color:n(["#26ccff","#a25afd","#ff5e7e","#88ff5a","#fcff42","#ffd700","#ff6633"]),shape:n(["circle","square"]),tick:0,totalTicks:200,decay:.94+e()*.02,drift:0,gravity:3,x:0,y:0,wobble:e()*10,scalar:c,tiltSin:0,tiltCos:0,random:e()+.2,wobbleSpeed:.1+e()*.1};return i}function o(t){t.x+=Math.cos(t.wobble)*t.drift,t.y+=t.gravity,t.wobble+=t.wobbleSpeed,t.gravity*=1.01,t.tiltAngle+=.1,t.tiltSin=Math.sin(t.tiltAngle),t.tiltCos=Math.cos(t.tiltAngle),t.random-=.01,t.tick++}return function(t){t=t||{};var e=t.particleCount||50,a=t.spread||50,c=t.origin||{x:.5,y:.5},l=document.createElement("canvas");l.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999",document.body.appendChild(l);var i=l.getContext("2d"),s=[];l.width=window.innerWidth,l.height=window.innerHeight;for(var d=0;d<e;d++){var u=r(a);u.x=c.x*l.width,u.y=c.y*l.height,s.push(u)}!function t(){i.clearRect(0,0,l.width,l.height);for(var e=s.length-1;e>=0;e--){var n=s[e];o(n);var r=n.tick/n.totalTicks;if(!(r>=1)){i.save(),i.globalAlpha=1-r,i.fillStyle=n.color,i.translate(n.x,n.y),"circle"===n.shape?(i.beginPath(),i.arc(0,0,5*n.scalar,0,2*Math.PI),i.fill()):i.fillRect(-3*n.scalar,-3*n.scalar,6*n.scalar,6*n.scalar),i.restore()}else s.splice(e,1)}s.length>0?requestAnimationFrame(t):(i.clearRect(0,0,l.width,l.height),l.remove())}()}}();window.confetti=n}(window);
<\/script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    min-height: 100vh;
    background: #0a0a1a;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #e0e0e0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow-x: hidden;
  }

  /* ── Scene 1: Gift Box ── */
  #scene-gift {
    text-align: center;
    cursor: pointer;
    transition: opacity 0.6s;
  }
  #scene-gift.hidden { opacity: 0; pointer-events: none; position: absolute; }

  .gift-wrap {
    position: relative;
    width: 200px;
    height: 200px;
    margin: 0 auto 32px;
    animation: float 3s ease-in-out infinite;
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-12px); }
  }

  .gift-box {
    position: absolute;
    bottom: 0;
    width: 200px;
    height: 140px;
    background: linear-gradient(135deg, #c0392b, #e74c3c);
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(231, 76, 60, 0.3);
  }
  .gift-box::after {
    content: '';
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 32px;
    height: 100%;
    background: linear-gradient(135deg, #f1c40f, #f39c12);
    border-radius: 2px;
  }

  .gift-lid {
    position: absolute;
    top: 0;
    width: 220px;
    height: 50px;
    left: -10px;
    background: linear-gradient(135deg, #a93226, #c0392b);
    border-radius: 8px;
    transition: all 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    z-index: 2;
  }
  .gift-lid::after {
    content: '';
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 36px;
    height: 100%;
    background: linear-gradient(135deg, #d4ac0d, #f1c40f);
    border-radius: 2px;
  }
  .gift-lid.open {
    transform: translateY(-120px) rotate(-25deg) scale(0.8);
    opacity: 0;
  }

  .bow {
    position: absolute;
    top: -20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 3;
    font-size: 48px;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
  }

  .tag {
    position: absolute;
    bottom: -8px;
    right: -24px;
    background: #fef9e7;
    color: #2c3e50;
    padding: 6px 14px;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 600;
    transform: rotate(8deg);
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    z-index: 4;
  }

  .click-hint {
    font-size: 15px;
    color: #7f8c8d;
    letter-spacing: 1px;
    animation: pulse 2s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }

  /* ── Scene 2: Setup ── */
  #scene-setup {
    text-align: center;
    max-width: 520px;
    padding: 24px;
    opacity: 0;
    transform: translateY(40px);
    transition: all 0.8s ease-out;
    position: absolute;
    pointer-events: none;
  }
  #scene-setup.visible {
    opacity: 1;
    transform: translateY(0);
    position: relative;
    pointer-events: all;
  }

  .setup-title {
    font-size: 36px;
    font-weight: 700;
    margin-bottom: 8px;
    background: linear-gradient(135deg, #3498db, #2ecc71);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .setup-subtitle {
    font-size: 16px;
    color: #95a5a6;
    margin-bottom: 36px;
    line-height: 1.5;
  }

  .key-input-group {
    position: relative;
    margin-bottom: 16px;
  }
  .key-input {
    width: 100%;
    padding: 16px 20px;
    font-size: 15px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    background: #1a1a2e;
    border: 2px solid #2c3e50;
    border-radius: 12px;
    color: #ecf0f1;
    outline: none;
    transition: border-color 0.3s;
  }
  .key-input:focus { border-color: #3498db; }
  .key-input::placeholder { color: #4a5568; }

  .activate-btn {
    width: 100%;
    padding: 16px;
    font-size: 17px;
    font-weight: 600;
    background: linear-gradient(135deg, #2ecc71, #27ae60);
    color: white;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s;
    letter-spacing: 0.5px;
  }
  .activate-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(46,204,113,0.3); }
  .activate-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  .error-msg {
    color: #e74c3c;
    font-size: 14px;
    margin-top: 12px;
    min-height: 20px;
  }

  /* ── Scene 3: Done ── */
  #scene-done {
    text-align: center;
    max-width: 520px;
    padding: 24px;
    opacity: 0;
    transform: translateY(40px);
    transition: all 0.8s ease-out;
    position: absolute;
    pointer-events: none;
  }
  #scene-done.visible {
    opacity: 1;
    transform: translateY(0);
    position: relative;
    pointer-events: all;
  }

  .checkmark {
    font-size: 64px;
    margin-bottom: 16px;
    animation: pop 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }
  @keyframes pop {
    0% { transform: scale(0); }
    100% { transform: scale(1); }
  }

  .done-title {
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 24px;
    color: #2ecc71;
  }

  .config-steps {
    text-align: left;
    background: #1a1a2e;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
  }
  .config-steps h3 {
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #7f8c8d;
    margin-bottom: 16px;
  }
  .step {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 14px;
    font-size: 14px;
    line-height: 1.5;
  }
  .step-num {
    background: #2c3e50;
    color: #3498db;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .copy-field {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #0a0a1a;
    padding: 8px 12px;
    border-radius: 8px;
    margin-top: 6px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 13px;
    word-break: break-all;
  }
  .copy-btn {
    background: #2c3e50;
    border: none;
    color: #ecf0f1;
    padding: 4px 10px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    flex-shrink: 0;
    transition: background 0.2s;
  }
  .copy-btn:hover { background: #3498db; }

  .done-footer {
    font-size: 15px;
    color: #7f8c8d;
    margin-top: 20px;
  }
</style>
</head>
<body>

<!-- Scene 1: Gift Box -->
<div id="scene-gift" onclick="openGift()">
  <div class="gift-wrap">
    <div class="bow">🎀</div>
    <div class="gift-lid" id="lid"></div>
    <div class="gift-box"></div>
    <div class="tag">From: Hunter</div>
  </div>
  <div class="click-hint">click to open</div>
</div>

<!-- Scene 2: Setup -->
<div id="scene-setup">
  <div class="setup-title">CursorBridge</div>
  <div class="setup-subtitle">
    Use Claude in Cursor with your subscription.<br>
    Same models. Fraction of the cost.
  </div>
  <div class="key-input-group">
    <input
      class="key-input"
      id="key-input"
      type="password"
      placeholder="sk-ant-api-..."
      spellcheck="false"
      autocomplete="off"
    >
  </div>
  <button class="activate-btn" id="activate-btn" onclick="activate()">
    Activate
  </button>
  <div class="error-msg" id="error-msg"></div>
  <div style="margin-top:20px; font-size:13px; color:#4a5568;">
    Get your key at <a href="https://console.anthropic.com/settings/keys" target="_blank" style="color:#3498db;">console.anthropic.com</a> &rarr; API Keys
  </div>
</div>

<!-- Scene 3: Done -->
<div id="scene-done">
  <div class="checkmark">&#10003;</div>
  <div class="done-title">You're all set!</div>

  <div class="config-steps">
    <h3>Cursor Settings</h3>
    <div class="step">
      <span class="step-num">1</span>
      <div>Open <strong>Cursor Settings &rarr; Models</strong></div>
    </div>
    <div class="step">
      <span class="step-num">2</span>
      <div>
        Paste this as your <strong>OpenAI API Key</strong>:
        <div class="copy-field">
          <span id="token-display"></span>
          <button class="copy-btn" onclick="copyText('token-display')">Copy</button>
        </div>
      </div>
    </div>
    <div class="step">
      <span class="step-num">3</span>
      <div>Toggle ON <strong>"Override OpenAI Base URL"</strong></div>
    </div>
    <div class="step">
      <span class="step-num">4</span>
      <div>
        Set the <strong>Base URL</strong> to:
        <div class="copy-field">
          <span id="url-display"></span>
          <button class="copy-btn" onclick="copyText('url-display')">Copy</button>
        </div>
      </div>
    </div>
    <div class="step">
      <span class="step-num">5</span>
      <div>Click <strong>Verify</strong> &mdash; green checkmark means it's working</div>
    </div>
  </div>

  <div class="done-footer">Start CursorBridge before Cursor. That's it. Go build something.</div>
</div>

<script>
function openGift() {
  const lid = document.getElementById('lid');
  lid.classList.add('open');

  // Confetti burst
  setTimeout(() => {
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });
    confetti({ particleCount: 80, spread: 100, origin: { y: 0.5 }, startVelocity: 45 });
  }, 300);

  // Transition to setup
  setTimeout(() => {
    document.getElementById('scene-gift').classList.add('hidden');
    setTimeout(() => {
      document.getElementById('scene-setup').classList.add('visible');
      document.getElementById('key-input').focus();
    }, 200);
  }, 1000);
}

async function activate() {
  const btn = document.getElementById('activate-btn');
  const input = document.getElementById('key-input');
  const errorEl = document.getElementById('error-msg');
  const key = input.value.trim();

  errorEl.textContent = '';

  if (!key) {
    errorEl.textContent = 'Paste your Anthropic API key above';
    return;
  }
  if (!key.startsWith('sk-ant-')) {
    errorEl.textContent = 'Key should start with sk-ant-api or sk-ant-oat';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Activating...';

  try {
    const res = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Setup failed');
    }

    // Show done screen
    document.getElementById('token-display').textContent = data.localToken;
    document.getElementById('url-display').textContent = data.baseUrl;

    document.getElementById('scene-setup').classList.remove('visible');
    document.getElementById('scene-setup').style.display = 'none';

    setTimeout(() => {
      document.getElementById('scene-done').classList.add('visible');
      // Victory confetti
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }, 300);

  } catch (err) {
    errorEl.textContent = err.message;
    btn.disabled = false;
    btn.textContent = 'Activate';
  }
}

function copyText(elementId) {
  const text = document.getElementById(elementId).textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = event.target;
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy', 1500);
  });
}

// Enter key to activate
document.getElementById('key-input')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') activate();
});
</script>
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
