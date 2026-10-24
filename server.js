'use strict';
// ملف مجمّع تلقائياً — اللعبة كاملة في ملف واحد (للرفع على Render أو أي استضافة Node)
// QRCode for JavaScript — Copyright (c) 2009 Kazuhiko Arase — MIT License
const __FILES = {"public/common.js":"/* أدوات مشتركة: الاتصال، الوقت، الأصوات، الاحتفال */\nwindow.Q = (() => {\n  const esc = s => String(s ?? '').replace(/[&<>\"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;' }[c]));\n  let offset = 0;\n  const setServerNow = t => { offset = t - Date.now(); };\n  const serverNow = () => Date.now() + offset;\n  const remaining = endsAt => (endsAt ? Math.max(0, endsAt - serverNow()) : 0);\n  const SHAPES = ['▲', '◆', '●', '■'];\n  const COLORS = ['#ff4d6d', '#3a86ff', '#ffbe0b', '#06d6a0', '#f72585', '#8338ec', '#fb8500', '#00b4d8', '#e63946', '#2ec4b6', '#ff9f1c', '#9b5de5', '#43aa8b', '#f15bb5', '#4cc9f0', '#b5179e'];\n\n  // ---------- الاتصال ----------\n  function rid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }\n  function connect(role, onEvent) {\n    const key = 'fq_cid_' + role;\n    let cid = sessionStorage.getItem(key);\n    if (!cid) { cid = rid(); sessionStorage.setItem(key, cid); }\n    let es = null, retry = null;\n    function open() {\n      clearTimeout(retry);\n      if (es) es.close();\n      const token = role === 'player' ? (localStorage.getItem('fq_token') || '') : '';\n      es = new EventSource(`/events?role=${role}&cid=${encodeURIComponent(cid)}&token=${encodeURIComponent(token)}`);\n      ['state', 'pick', 'kicked', 'react'].forEach(ev => es.addEventListener(ev, e => { try { onEvent(ev, JSON.parse(e.data)); } catch (err) { console.error(err); } }));\n      es.onopen = () => onEvent('open');\n      es.onerror = () => { es.close(); onEvent('offline'); retry = setTimeout(open, 1500); };\n    }\n    document.addEventListener('visibilitychange', () => { if (!document.hidden && (!es || es.readyState === 2)) open(); });\n    open();\n    async function api(type, payload = {}) {\n      try {\n        const r = await fetch('/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cid, type, ...payload }) });\n        return await r.json();\n      } catch (e) { return { ok: false, msg: 'ما قدرت أوصل للسيرفر' }; }\n    }\n    return { api, reconnect: open };\n  }\n\n  // ---------- الأصوات ----------\n  let ctx = null, muted = false;\n  function ac() {\n    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }\n    if (ctx.state === 'suspended') ctx.resume();\n    return ctx;\n  }\n  function tone(freq, dur = 0.15, type = 'sine', vol = 0.2, delay = 0) {\n    if (muted) return;\n    const c = ac(); if (!c) return;\n    const t = c.currentTime + delay;\n    const o = c.createOscillator(), g = c.createGain();\n    o.type = type; o.frequency.setValueAtTime(freq, t);\n    g.gain.setValueAtTime(0.0001, t);\n    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);\n    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);\n    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.05);\n  }\n  const sfx = {\n    tick: () => tone(880, 0.08, 'square', 0.05),\n    start: () => { tone(523, 0.12, 'triangle'); tone(659, 0.12, 'triangle', 0.2, 0.1); tone(784, 0.22, 'triangle', 0.2, 0.2); },\n    correct: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'triangle', 0.18, i * 0.09)),\n    wrong: () => { tone(240, 0.3, 'sawtooth', 0.1); tone(180, 0.4, 'sawtooth', 0.1, 0.15); },\n    action: () => { tone(1200, 0.06, 'square', 0.07); tone(1600, 0.09, 'square', 0.07, 0.06); },\n    boom: () => { tone(110, 0.5, 'sawtooth', 0.25); tone(60, 0.7, 'square', 0.15, 0.05); },\n    freeze: () => [2100, 1800, 1500, 1200].forEach((f, i) => tone(f, 0.12, 'sine', 0.1, i * 0.07)),\n    fanfare: () => [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.24, 'triangle', 0.18, i * 0.13)),\n    pop: () => tone(660, 0.07, 'sine', 0.12),\n  };\n\n  // ---------- قصاصات الاحتفال ----------\n  function confetti(ms = 3500) {\n    const cv = document.getElementById('confetti'); if (!cv) return;\n    const c = cv.getContext('2d');\n    const W = (cv.width = innerWidth), H = (cv.height = innerHeight);\n    const cols = ['#ff4d6d', '#3a86ff', '#ffbe0b', '#06d6a0', '#f72585', '#ffd166', '#ffffff'];\n    const ps = Array.from({ length: 240 }, () => ({ x: Math.random() * W, y: -20 - Math.random() * H * 0.6, w: 6 + Math.random() * 8, h: 8 + Math.random() * 10,\n      vx: -2 + Math.random() * 4, vy: 2 + Math.random() * 4, r: Math.random() * 6, vr: -0.2 + Math.random() * 0.4, c: cols[(Math.random() * cols.length) | 0] }));\n    const end = performance.now() + ms;\n    cv.style.display = 'block';\n    (function f(t) {\n      c.clearRect(0, 0, W, H);\n      ps.forEach(p => {\n        p.x += p.vx; p.y += p.vy; p.vy = Math.min(p.vy + 0.04, 6); p.r += p.vr;\n        if (t < end && p.y > H + 20) { p.y = -20; p.x = Math.random() * W; p.vy = 2 + Math.random() * 3; }\n        c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.c; c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); c.restore();\n      });\n      if (t < end || ps.some(p => p.y < H + 20)) requestAnimationFrame(f);\n      else { c.clearRect(0, 0, W, H); cv.style.display = 'none'; }\n    })(performance.now());\n  }\n\n  function toast(text, kind = '') {\n    let box = document.getElementById('toasts');\n    if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }\n    const el = document.createElement('div');\n    el.className = 'toast ' + kind; el.textContent = text;\n    box.appendChild(el);\n    setTimeout(() => el.classList.add('out'), 2600);\n    setTimeout(() => el.remove(), 3100);\n  }\n\n  return { esc, setServerNow, serverNow, remaining, SHAPES, COLORS, connect, sfx, tone,\n    setMuted: m => (muted = m), isMuted: () => muted, unlockAudio: ac, confetti, toast };\n})();\n","public/host.html":"<!doctype html>\n<html lang=\"ar\" dir=\"rtl\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<title>تحدي العائلة 🎉</title>\n<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n<link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n<link href=\"https://fonts.googleapis.com/css2?family=Cairo:wght@500;700;800;900&display=swap\" rel=\"stylesheet\">\n<link rel=\"stylesheet\" href=\"/style.css\">\n</head>\n<body class=\"host\">\n<canvas id=\"confetti\"></canvas>\n<div id=\"app\"></div>\n<div id=\"controls\"></div>\n<script src=\"/common.js\"></script>\n<script src=\"/host.js\"></script>\n</body>\n</html>\n","public/host.js":"/* شاشة التلفاز */\n(() => {\n  const { esc, SHAPES, sfx, COLORS } = Q;\n  const app = document.getElementById('app');\n  const ctrl = document.getElementById('controls');\n  let S = null, lastKey = '', ipIdx = 0, lastTick = null, offline = false;\n  let draft = [];\n  try { draft = JSON.parse(localStorage.getItem('fq_names') || '[]').map(d => typeof d === 'string' ? { name: d, avatar: null } : d); } catch (e) {}\n\n  const net = Q.connect('host', (ev, data) => {\n    if (ev === 'offline') { offline = true; showOffline(); }\n    if (ev === 'open') { offline = false; showOffline(); }\n    if (ev === 'react') floatReact(data);\n    if (ev === 'state') {\n      Q.setServerNow(data.serverNow);\n      const prev = S; S = data;\n      transitions(prev, S);\n      render();\n    }\n  });\n  setInterval(() => { fetch('/ping', { cache: 'no-store' }).catch(() => {}); }, 4 * 60 * 1000); // يبقي السيرفر صاحي أونلاين\n  const api = (t, p) => net.api(t, p).then(r => { if (!r.ok && r.msg) Q.toast(r.msg, 'bad'); return r; });\n\n  function showOffline() {\n    let b = document.getElementById('offb');\n    if (offline && !b) { b = document.createElement('div'); b.id = 'offb'; b.className = 'banner-off'; b.textContent = '⚠️ انقطع الاتصال بالسيرفر... تأكد إن البرنامج شغال'; document.body.appendChild(b); }\n    if (!offline && b) b.remove();\n  }\n\n  // ---------- مساعدات ----------\n  const idx = id => S.players.findIndex(p => p.id === id);\n  const col = id => COLORS[Math.max(0, idx(id)) % COLORS.length];\n  const player = id => S.players.find(p => p.id === id) || { name: '؟' };\n  const first = n => esc([...(n || '?')][0]);\n  const avatar = (p, cls = '') => `<div class=\"avatar ${cls}\" style=\"--c:${col(p.id)}\">${p.avatar || first(p.name)}</div>`;\n  const CATS = { proverb: ['📜 أمثال', 'cat-proverb'], riddle: ['🧩 لغز', 'cat-riddle'] };\n  const catBadge = c => { const x = CATS[c]; return x ? `<span class=\"cat ${x[1]}\">${x[0]}</span>` : ''; };\n  const qBadges = q => q ? lvBadge(q.level) + catBadge(q.cat) + (q.golden ? '<span class=\"gold-badge\">🌟 ×2</span>' : '') : '';\n  const animals = () => (S && S.animals) || ['🦁', '🐼', '🐯', '🐸', '🐵', '🦊', '🐨', '🐰', '🐻', '🐷'];\n  const freeAnimal = (skip) => animals().find(a => !draft.some((d, i) => i !== skip && d.avatar === a)) || animals()[0];\n\n  // ردود فعل طايرة من الجوالات\n  function floatReact(d) {\n    const el = document.createElement('div');\n    el.className = 'react-float';\n    el.style.left = (8 + Math.random() * 84) + 'vw';\n    el.style.setProperty('--rot', (Math.random() * 30 - 15) + 'deg');\n    el.innerHTML = `<div class=\"e\">${esc(d.e)}</div><div class=\"who\">${esc(d.avatar || '')} ${esc(d.name)}</div>`;\n    document.body.appendChild(el);\n    setTimeout(() => el.remove(), 3300);\n    sfx.pop();\n  }\n  const sum = o => Object.values(o || {}).reduce((a, b) => a + b, 0);\n  const A = k => S.actionsMeta[k];\n  const LEVELS = { easy: ['سهل', 'lv-easy'], medium: ['متوسط', 'lv-medium'], hard: ['صعب', 'lv-hard'] };\n  const lvBadge = l => { const x = LEVELS[l]; return x ? `<span class=\"lv ${x[1]}\">${x[0]}</span>` : ''; };\n  const medal = r => (r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : `#${r}`);\n\n  // ---------- الأصوات حسب الانتقالات ----------\n  function transitions(prev, st) {\n    if (!prev) return;\n    if (prev.phase !== st.phase) {\n      lastTick = null;\n      if (st.phase === 'actions') sfx.start();\n      if (st.phase === 'answer') {\n        const fx = (st.round && st.round.effects) || [];\n        if (fx.some(e => e.type === 'bomb' && e.kind !== 'blocked')) sfx.boom();\n        else if (fx.some(e => e.type === 'freeze' && e.kind !== 'blocked')) sfx.freeze();\n        else sfx.pop();\n      }\n      if (st.phase === 'reveal') sfx.correct();\n      if (st.phase === 'scoreboard') sfx.pop();\n      if (st.phase === 'final') { sfx.fanfare(); setTimeout(() => Q.confetti(7000), 1500); }\n    } else if (st.phase === 'actions' && sum(st.round && st.round.actionCounts) > sum(prev.round && prev.round.actionCounts)) sfx.action();\n    else if (st.phase === 'answer' && (st.round.effects || []).length > ((prev.round && prev.round.effects) || []).length) {\n      const e = st.round.effects[st.round.effects.length - 1];\n      if (e.type === 'bomb' && e.kind !== 'blocked') sfx.boom(); else if (e.type === 'freeze' && e.kind !== 'blocked') sfx.freeze(); else sfx.action();\n    }\n    else if (st.phase === 'answer' && (st.round ? st.round.answered.length : 0) > (prev.round ? prev.round.answered.length : 0)) sfx.pop();\n    else if (st.phase === 'lobby' && st.players.filter(p => p.connected).length > prev.players.filter(p => p.connected).length) sfx.pop();\n  }\n\n  // ---------- العرض ----------\n  function render() {\n    const key = S.phase + ':' + S.qIndex;\n    const fresh = key !== lastKey;\n    lastKey = key;\n    document.body.dataset.phase = S.phase;\n    if (S.phase === 'setup') { if (fresh) { app.innerHTML = rSetup(); renderChips(); setTimeout(() => { const i = document.getElementById('nameIn'); if (i) i.focus(); }, 50); } }\n    else {\n      const f = { lobby: rLobby, actions: rActions, answer: rAnswer, reveal: rReveal, scoreboard: rScore, final: rFinal }[S.phase];\n      app.innerHTML = `<div class=\"screen ${fresh ? 'in' : ''}\">${f()}</div>`;\n      if (S.phase === 'scoreboard' && fresh) countUp();\n    }\n    renderControls();\n    tickLoop(true);\n  }\n\n  // إعداد اللاعبين\n  function rSetup() {\n    return `<div class=\"screen in\">\n      <div class=\"hero a-pop\"><div class=\"logo\">🎉</div><h1 class=\"title grad-text\">تحدي العائلة</h1>\n        <p class=\"sub\">${S.total} سؤال · ثقافة وأمثال وألغاز · أكشنات وستريك وجولة ذهبية!</p></div>\n      <div class=\"card setup-card a-rise\" style=\"--d:2\">\n        <h2>👥 مين بيلعب الليلة؟ <span class=\"muted\" style=\"font-size:1rem\">(اضغط على صورة الحيوان عشان تغيّرها)</span></h2>\n        <form id=\"addForm\" class=\"add-row\"><input id=\"nameIn\" maxlength=\"16\" placeholder=\"اكتب اسم اللاعب واضغط Enter\" autocomplete=\"off\">\n          <button class=\"btn btn-pink\" type=\"submit\">➕ إضافة</button></form>\n        <div id=\"chips\" class=\"chips\"></div>\n        <div class=\"row\" style=\"margin-top:.4rem\"><span class=\"muted\" id=\"cnt\"></span>\n          <button class=\"btn btn-big btn-green\" data-act=\"toLobby\">التالي: ربط الجوالات 📱</button></div>\n      </div></div>`;\n  }\n  function renderChips() {\n    const box = document.getElementById('chips'); if (!box) return;\n    draft.forEach((d, i) => { if (!d.avatar) d.avatar = freeAnimal(i); });\n    box.innerHTML = draft.length ? draft.map((d, i) => `<div class=\"chip\"><div class=\"avatar\" title=\"اضغط لتغيير الشخصية\" data-act=\"ava\" data-i=\"${i}\" style=\"--c:${COLORS[i % COLORS.length]}\">${d.avatar}</div>${esc(d.name)}<button class=\"x\" data-act=\"rm\" data-i=\"${i}\">✖</button></div>`).join('')\n      : `<div class=\"empty-hint\">ما في لاعبين للحين… أضف الأسماء وحدة وحدة ✍️</div>`;\n    document.getElementById('cnt').textContent = draft.length ? `${draft.length} لاعب` : '';\n    localStorage.setItem('fq_names', JSON.stringify(draft));\n  }\n\n  // الانتظار + الباركود\n  function rLobby() {\n    const local = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(location.hostname);\n    const ips = local ? (S.ips || []) : [];\n    if (ipIdx >= ips.length) ipIdx = 0;\n    const ip = ips.length ? ips[ipIdx].ip : location.hostname;\n    const url = local ? `http://${ip}:${S.port}/play` : `${location.origin}/play`;\n    const con = S.players.filter(p => p.connected).length;\n    const legend = S.actionOrder.map((k, i) => `<div class=\"legend-item a-rise\" style=\"--d:${i}\"><span class=\"ic\">${A(k).icon}</span><div><b>${esc(A(k).name)}</b><small>${esc(A(k).desc)}</small></div></div>`).join('');\n    const C = S.config, lp = C.levelPoints;\n    return `<div class=\"lobby-grid\">\n      <div class=\"card qr-card a-pop\">\n        <h2>📱 امسح الباركود</h2>\n        <div class=\"qr-wrap\"><img class=\"qr\" src=\"/qr.svg?t=${encodeURIComponent(url)}\" alt=\"QR\"></div>\n        <div class=\"url\">${esc(url)}</div>\n        ${!local ? `<p class=\"hint\">افتح الرابط من أي جوال فيه إنترنت 🌐</p>` : ips.length ? `<p class=\"hint\">لازم كل الجوالات تكون على نفس شبكة الواي فاي 📶</p>` : `<p class=\"hint\" style=\"color:#ff8fa3\">⚠️ ما لقيت شبكة! تأكد إن الجهاز متصل بالواي فاي</p>`}\n        ${ips.length > 1 ? `<div class=\"ip-switch\">${ips.map((x, i) => `<button class=\"${i === ipIdx ? 'on' : ''}\" data-act=\"ip\" data-i=\"${i}\">${esc(x.ip)}</button>`).join('')}</div><p class=\"hint\">إذا ما اشتغل الباركود جرّب عنوان ثاني</p>` : ''}\n      </div>\n      <div class=\"card players-card a-rise\" style=\"--d:1\">\n        <h2>اللاعبين <span class=\"pill\">${con} / ${S.players.length} متصلين</span></h2>\n        <div class=\"lobby-players\">${S.players.map(p => `<div class=\"lp ${p.connected ? 'on' : ''}\">${avatar(p)}<div><div class=\"lp-name\">${esc(p.name)}</div>\n          <div class=\"lp-st\">${p.connected ? '✅ جاهز' : p.claimed ? '📴 انقطع' : '⏳ ينتظر'}</div></div>\n          ${p.claimed ? `<button class=\"x\" title=\"فك الربط\" data-act=\"kick\" data-id=\"${p.id}\">✖</button>` : ''}</div>`).join('')}</div>\n        <div class=\"rules\">\n          <span>✅ سهل ${lp.easy} · متوسط ${lp.medium} · صعب ${lp.hard}</span><span>🔥 الستريك يزيدها حتى +${C.streakBonus[C.streakBonus.length - 1]}%</span>\n          <span>🚀 الأسرع +${C.speedBonus[0]}</span><span>🦸 الوحيد اللي جاوب صح +${C.soloBonus}</span><span>🌟 آخر ${C.goldenCount} أسئلة نقاطها ×2</span>\n          <span>♻️ كل ${S.config.restoreEvery} صح ورا بعض = ترجع أكشن</span><span>🎲 المخاطرة قبل ما يطلع السؤال · الباقي أثناء الإجابة</span><span>⚡ حدك ${S.config.maxActionsPerRound} أكشن بالسؤال</span><span>🎯 كل أكشن مرة وحدة</span>\n        </div>\n        <div class=\"legend\">${legend}</div>\n        <div class=\"row\">\n          <button class=\"btn btn-ghost\" data-act=\"toSetup\">✏️ تعديل الأسماء</button>\n          <button class=\"btn btn-big btn-green\" data-act=\"start\">ابدأ اللعبة 🚀</button>\n        </div>\n      </div></div>`;\n  }\n\n  function qHead() {\n    const low = S.phase === 'answer';\n    return `<div class=\"q-head\">\n      <div class=\"q-num\">سؤال ${S.qIndex + 1} <small>/ ${S.total}</small> ${qBadges(S.question)}</div>\n      ${S.endsAt && S.phase === 'actions' ? `<div class=\"timer-badge ${low ? 'js-low' : ''}\" data-timer>–</div>` : ''}\n    </div>${S.endsAt && S.phase === 'actions' ? '<div class=\"bar\" data-bar></div>' : ''}`;\n  }\n\n  function strip(mode) {\n    const r = S.round || {};\n    return `<div class=\"strip\">${S.players.map(p => {\n      let cls = p.connected ? '' : 'off', badge = '';\n      if (mode === 'actions') {\n        const n = (r.actionCounts || {})[p.id] || 0;\n        if (n) badge += `<span class=\"badge\">⚡×${n}</span>`;\n        if ((r.ready || []).includes(p.id)) cls += ' done';\n      } else if (mode === 'answer') {\n        if ((r.answered || []).includes(p.id)) { cls += ' done'; badge += '<span class=\"badge\">✔</span>'; }\n      }\n      if (mode === 'answer' && (r.frozen || []).includes(p.id)) cls += ' frozen';\n      return `<div class=\"sp ${cls}\">${avatar(p)}${esc(p.name)}<span class=\"ice\">🧊</span>${badge}</div>`;\n    }).join('')}</div>`;\n  }\n\n  function rActions() {\n    return `${qHead()}\n      <div class=\"action-time\">\n        ${S.question.golden ? '<div class=\"golden-strip\">🌟 جولة ذهبية: كل النقاط ×2 🌟</div>' : ''}\n        <div class=\"bolt\">🎲</div>\n        <h2 class=\"title grad-text\">تخاطر ولا لا؟</h2>\n        <p>السؤال ${S.qIndex + 1} ${qBadges(S.question)} بيطلع بعد شوي… اللي يبي يخاطر يقرر الحين من جواله!</p>\n        <p style=\"font-size:1.25rem\">🎲 المخاطرة: صح = +${S.config.riskBonus} · غلط = −${S.config.riskPenalty}</p>\n      </div>\n      ${strip('actions')}`;\n  }\n\n  function fxList(list) {\n    if (!list || !list.length) return `<div class=\"fx-empty\">ما أحد استخدم أكشن هالمرة 😇</div>`;\n    return list.map((e, i) => `<div class=\"fx ${e.kind} a-slide\" style=\"--d:${i}\"><span class=\"ic\">${e.icon}</span><span>${esc(e.text)}</span></div>`).join('');\n  }\n\n  function optsHtml(withWho) {\n    const q = S.question, r = S.round || {};\n    return `<div class=\"opts\">${q.options.map((o, i) => {\n      let cls = '';\n      if (q.correct != null) cls = i === q.correct ? 'correct' : 'dim';\n      let who = '';\n      if (withWho && r.choices) {\n        const names = Object.entries(r.choices).filter(([, c]) => c === i).map(([id]) => `<span>${player(id).avatar || ''} ${esc(player(id).name)}</span>`);\n        if (names.length) who = `<div class=\"who\">${names.join('')}</div>`;\n      }\n      return `<div class=\"opt o${i} ${cls} a-pop\" style=\"--d:${i}\"><span class=\"shape\">${SHAPES[i]}</span><span class=\"otext\">${esc(o)}</span>${who}</div>`;\n    }).join('')}</div>`;\n  }\n\n  function rAnswer() {\n    const fx = S.round.effects || [];\n    return `${qHead()}\n      ${S.question.golden ? '<div class=\"golden-strip\">🌟 جولة ذهبية: كل النقاط ×2 🌟</div>' : ''}\n      <div class=\"q-text small ${S.question.golden ? 'golden' : ''}\">${esc(S.question.text)}</div>\n      <div class=\"answer-layout ${fx.length ? '' : 'full'}\">\n        ${optsHtml(false)}\n        ${fx.length ? `<div class=\"card fx-panel\"><h3>⚡ الأكشنات</h3>${fxList(fx)}</div>` : ''}\n      </div>\n      ${strip('answer')}`;\n  }\n\n  function rReveal() {\n    const r = S.round;\n    const none = S.players.filter(p => r.choices && r.choices[p.id] === undefined).map(p => esc(p.name));\n    const nCorrect = S.players.filter(p => r.results && r.results[p.id] && r.results[p.id].correct).length;\n    const fastest = (r.fastest || [])[0];\n    return `${qHead()}\n      <div class=\"q-text small ${S.question.golden ? 'golden' : ''}\">${esc(S.question.text)}</div>\n      <div class=\"reveal-title a-pop\">${nCorrect ? `🎯 ${nCorrect} من ${S.players.length} جاوبوا صح!` : '😱 ولا أحد جاوب صح!'}</div>\n      ${fastest ? `<div class=\"reveal-sub a-pop\">🚀 الأسرع: ${player(fastest).avatar || ''} ${esc(player(fastest).name)}</div>` : ''}\n      ${optsHtml(true)}\n      ${none.length ? `<div class=\"noans\">⏰ ما جاوبوا: ${none.join('، ')}</div>` : ''}`;\n  }\n\n  function rScore() {\n    const r = S.round, res = r.results || {};\n    const sorted = [...S.players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));\n    const rows = sorted.map((p, i) => {\n      const x = res[p.id] || { delta: 0, parts: [] };\n      const mv = p.lastRank == null ? 0 : p.lastRank - p.rank;\n      const mvHtml = mv > 0 ? `<div class=\"mv up\">▲${mv}</div>` : mv < 0 ? `<div class=\"mv down\">▼${-mv}</div>` : `<div class=\"mv same\">–</div>`;\n      const d = x.delta, dcls = d > 0 ? 'pos' : d < 0 ? 'neg' : 'zero';\n      const lbl = x.correct ? (x.frozen ? '🧊' : '✅') : x.answered ? '❌' : '⏰';\n      const extras = x.parts.filter(pt => !pt.label.startsWith('إجابة صح') && !pt.label.startsWith('ستريك')).map(pt => (pt.label.match(/[\\u{1F300}-\\u{1FAFF}\\u2600-\\u27BF]/u) || [''])[0]).join('');\n      const inv = S.actionOrder.map(k => `<span class=\"${p.actions[k] ? '' : 'used'}\" title=\"${esc(A(k).name)}\">${A(k).icon}</span>`).join('');\n      const used = (r.used || {})[p.id] || [];\n      const ract = used.length ? used.map(u => `<span>${A(u.type).icon} ${esc(A(u.type).name)}${u.targetName ? ' ← ' + esc(u.targetName) : ''}</span>`).join('') : '<span class=\"none\">—</span>';\n      return `<div class=\"rr r${p.rank} a-slide\" style=\"--d:${i}\">\n        <div class=\"rk\">${medal(p.rank)}</div>${mvHtml}${avatar(p)}\n        <div class=\"nm\">${esc(p.name)} ${p.streak >= 2 ? `<span class=\"streak\">🔥${p.streak}</span>` : ''} ${p.restoreTokens ? `<span class=\"rt\">♻️×${p.restoreTokens}</span>` : ''}<div class=\"inv\" title=\"الأكشنات الباقية\">${inv}</div></div>\n        <div class=\"ract\">${ract}</div>\n        <div class=\"delta ${dcls}\">${d > 0 ? '+' : ''}${d}<small>${lbl} ${extras}</small></div>\n        <div class=\"sc\" data-from=\"${p.score - d}\" data-to=\"${p.score}\">${p.score}</div></div>`;\n    }).join('');\n    const isLast = S.qIndex + 1 >= S.total;\n    const nextGolden = !isLast && S.qIndex + 1 === S.total - S.config.goldenCount;\n    const q = S.question;\n    const restoreEarned = S.players.filter(p => res[p.id] && res[p.id].earnedRestore).map(p => esc(p.name));\n    return `<div class=\"score-head\"><h2 class=\"title\">🏆 الترتيب <span class=\"muted\" style=\"font-size:1.3rem\">بعد سؤال ${S.qIndex + 1} من ${S.total}</span></h2></div>\n      <div class=\"score-layout\">\n        <div class=\"ranks\"><div class=\"col-head\"><span>المركز</span><span></span><span></span><span>اللاعب</span><span>أكشنات هالسؤال</span><span style=\"text-align:center\">النقاط</span><span style=\"text-align:end\">المجموع</span></div>${rows}</div>\n        <div class=\"side\">\n          <div class=\"correct-box a-rise\"><small>الإجابة الصحيحة</small><div>${SHAPES[q.correct]} ${esc(q.options[q.correct])}</div></div>\n          ${restoreEarned.length ? `<div class=\"fx restore a-rise\">♻️ <span>${restoreEarned.join('، ')} وصل ستريك ${S.config.restoreEvery}! يقدر يرجّع أكشن من الجوال</span></div>` : ''}\n          <div class=\"card fx-panel\"><h3>⚡ أكشنات هالجولة</h3>${fxList(r.effects)}</div>\n          ${isLast ? `<div class=\"fx restore\">🏁 هذا كان آخر سؤال! اضغط للنتيجة النهائية</div>` : ''}\n          ${nextGolden ? `<div class=\"golden-strip\">🌟 جاية الجولة الذهبية! آخر ${S.config.goldenCount} أسئلة ×2</div>` : ''}\n        </div>\n      </div>`;\n  }\n\n  function countUp() {\n    document.querySelectorAll('.sc[data-to]').forEach(el => {\n      const from = +el.dataset.from, to = +el.dataset.to; if (from === to) return;\n      const t0 = performance.now(), dur = 1200;\n      el.textContent = from;\n      (function f(t) { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(from + (to - from) * e); if (k < 1) requestAnimationFrame(f); })(t0);\n    });\n  }\n\n  function rFinal() {\n    const sorted = [...S.players].sort((a, b) => b.score - a.score);\n    const top = sorted.slice(0, 3);\n    const pod = i => { const p = top[i]; if (!p) return '<div class=\"pod\"></div>';\n      return `<div class=\"pod p${i + 1}\">${i === 0 ? '<div class=\"crown\">👑</div>' : ''}${avatar(p)}<div class=\"pn\">${esc(p.name)}</div><div class=\"ps\">${p.score} نقطة</div><div class=\"block\">${i + 1}</div></div>`; };\n    const by = f => [...S.players].sort((a, b) => f(b) - f(a))[0];\n    const mc = by(p => p.correct), ms = by(p => p.bestStreak), mu = by(p => p.used);\n    return `<h1 class=\"title grad-text a-pop\">🎉 الفائز ${top[0] ? esc(top[0].name) : ''}! 🎉</h1>\n      <div class=\"podium\">${pod(1)}${pod(0)}${pod(2)}</div>\n      <div class=\"stats a-rise\" style=\"--d:20\">\n        ${mc ? `<div class=\"stat\"><small>🎯 أكثر إجابات صح</small><b>${esc(mc.name)} (${mc.correct})</b></div>` : ''}\n        ${ms ? `<div class=\"stat\"><small>🔥 أطول ستريك</small><b>${esc(ms.name)} (${ms.bestStreak})</b></div>` : ''}\n        ${mu && mu.used ? `<div class=\"stat\"><small>⚡ ملك الأكشنات</small><b>${esc(mu.name)} (${mu.used})</b></div>` : ''}\n      </div>\n      ${sorted.length > 3 ? `<div class=\"rest\">${sorted.slice(3).map(p => `<span class=\"sp\">${avatar(p)} #${p.rank} ${esc(p.name)} · ${p.score}</span>`).join('')}</div>` : ''}\n      <div class=\"row\" style=\"justify-content:center\">\n        <button class=\"btn btn-big btn-pink\" data-act=\"rematch\">🔁 جولة جديدة بنفس اللاعبين</button>\n        <button class=\"btn btn-ghost\" data-act=\"toSetup\">👥 لاعبين جدد</button>\n      </div>`;\n  }\n\n  // ---------- أزرار التحكم ----------\n  function renderControls() {\n    const labels = { actions: 'اعرض السؤال الحين ⏭️', answer: 'اكشف الإجابة ✅', reveal: 'اعرض الترتيب 🏆', scoreboard: S.qIndex + 1 >= S.total ? 'النتيجة النهائية 🏁' : 'السؤال التالي ⬅️' };\n    const lbl = labels[S.phase];\n    const inGame = ['actions', 'answer', 'reveal', 'scoreboard'].includes(S.phase);\n    ctrl.innerHTML = `\n      ${lbl ? `<button class=\"btn ${S.phase === 'scoreboard' ? 'btn-green btn-big' : 'btn-blue'}\" data-act=\"next\">${lbl}</button>` : ''}\n      ${S.phase === 'lobby' ? `<button class=\"btn btn-green btn-big\" data-act=\"start\">ابدأ اللعبة 🚀</button>` : ''}\n      <button class=\"btn btn-ghost icon\" data-act=\"mute\" title=\"الصوت\">${Q.isMuted() ? '🔇' : '🔊'}</button>\n      <button class=\"btn btn-ghost icon\" data-act=\"fs\" title=\"ملء الشاشة\">⛶</button>\n      ${inGame ? `<button class=\"btn btn-ghost icon\" data-act=\"abort\" title=\"إيقاف اللعبة\">⏹</button>` : ''}\n      ${lbl ? `<span class=\"keyhint\">(أو زر المسافة)</span>` : ''}`;\n  }\n\n  // ---------- المؤقت ----------\n  let raf = null;\n  function tickLoop(kick) {\n    if (kick && raf) return;\n    raf = requestAnimationFrame(tickLoop.bind(null, false));\n    if (!S) return;\n    const ms = Q.remaining(S.endsAt);\n    const total = S.phase === 'actions' ? S.config.riskSeconds * 1000 : S.config.revealSeconds * 1000;\n    const sec = Math.ceil(ms / 1000);\n    document.querySelectorAll('[data-timer]').forEach(el => { el.textContent = sec; el.classList.toggle('low', S.phase === 'answer' && sec <= 5); });\n    document.querySelectorAll('[data-bar]').forEach(el => el.style.setProperty('--p', Math.max(0, Math.min(1, ms / total)).toFixed(4)));\n  }\n\n  // ---------- الأحداث ----------\n  document.addEventListener('submit', e => {\n    if (e.target.id !== 'addForm') return;\n    e.preventDefault();\n    const inp = document.getElementById('nameIn');\n    const v = inp.value.trim().slice(0, 16);\n    if (!v) return;\n    if (draft.some(d => d.name === v)) { Q.toast('الاسم موجود 😅', 'bad'); return; }\n    if (draft.length >= S.config.maxPlayers) { Q.toast(`الحد الأقصى ${S.config.maxPlayers} لاعب`, 'bad'); return; }\n    draft.push({ name: v, avatar: null }); inp.value = ''; sfx.pop(); renderChips(); inp.focus();\n  });\n  document.addEventListener('click', e => {\n    Q.unlockAudio();\n    const b = e.target.closest('[data-act]'); if (!b) return;\n    const act = b.dataset.act;\n    switch (act) {\n      case 'rm': draft.splice(+b.dataset.i, 1); renderChips(); break;\n      case 'ava': {\n        const i = +b.dataset.i, list = animals();\n        let k = list.indexOf(draft[i].avatar);\n        for (let n = 0; n < list.length; n++) { k = (k + 1) % list.length; if (!draft.some((d, j) => j !== i && d.avatar === list[k])) break; }\n        draft[i].avatar = list[k]; sfx.pop(); renderChips(); break;\n      }\n      case 'toLobby': {\n        const inp = document.getElementById('nameIn');\n        if (inp && inp.value.trim() && !draft.some(d => d.name === inp.value.trim())) draft.push({ name: inp.value.trim().slice(0, 16), avatar: null });\n        if (!draft.length) { Q.toast('أضف لاعب واحد على الأقل ✍️', 'bad'); return; }\n        renderChips(); api('host:setPlayers', { names: draft }); break;\n      }\n      case 'toSetup': draft = S.players.map(p => ({ name: p.name, avatar: p.avatar })); localStorage.setItem('fq_names', JSON.stringify(draft)); api('host:toSetup'); break;\n      case 'start':\n        if (!S.players.some(p => p.connected) && !confirm('ولا لاعب متصل بالجوال! تبي تبدأ على أي حال؟')) return;\n        api('host:start'); break;\n      case 'kick': if (confirm('تفك ربط هالجوال؟ (يقدر يختار الاسم من جديد)')) api('host:kick', { id: b.dataset.id }); break;\n      case 'ip': ipIdx = +b.dataset.i; render(); break;\n      case 'next': api('host:next'); break;\n      case 'rematch': api('host:rematch'); break;\n      case 'abort': if (confirm('توقف اللعبة وترجع لشاشة الانتظار؟')) api('host:abort'); break;\n      case 'mute': Q.setMuted(!Q.isMuted()); renderControls(); break;\n      case 'fs': if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); else document.exitFullscreen(); break;\n    }\n  });\n  document.addEventListener('keydown', e => {\n    if (!S || e.target.tagName === 'INPUT') return;\n    if ([' ', 'Enter', 'ArrowLeft'].includes(e.key) && ['actions', 'answer', 'reveal', 'scoreboard'].includes(S.phase)) { e.preventDefault(); Q.unlockAudio(); api('host:next'); }\n    if (e.key === 'f' || e.key === 'F') document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();\n  });\n})();\n","public/play.html":"<!doctype html>\n<html lang=\"ar\" dir=\"rtl\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover\">\n<title>تحدي العائلة 📱</title><meta name=\"theme-color\" content=\"#2a0f5c\">\n<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n<link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n<link href=\"https://fonts.googleapis.com/css2?family=Cairo:wght@500;700;800;900&display=swap\" rel=\"stylesheet\">\n<link rel=\"stylesheet\" href=\"/style.css\">\n</head>\n<body class=\"phone\">\n<canvas id=\"confetti\"></canvas>\n<div id=\"app\"></div>\n<script src=\"/common.js\"></script>\n<script src=\"/play.js\"></script>\n</body>\n</html>\n","public/play.js":"/* صفحة الجوال */\n(() => {\n  const { esc, SHAPES, sfx, COLORS } = Q;\n  const app = document.getElementById('app');\n  let S = null, mode = 'connecting', pick = null, sheet = null, lastKey = '', alertKey = '', resultKey = '', offline = false, busy = false;\n\n  const net = Q.connect('player', (ev, data) => {\n    if (ev === 'offline') { offline = true; render(); }\n    if (ev === 'open') { offline = false; }\n    if (ev === 'pick') { if (mode !== 'pick' || JSON.stringify(pick) !== JSON.stringify(data)) { mode = 'pick'; pick = data; S = null; render(); } }\n    if (ev === 'kicked') {\n      localStorage.removeItem('fq_token'); S = null; mode = 'pick'; sheet = null;\n      Q.toast(data === 'other-device' ? 'انفتح اسمك من جوال ثاني 📱' : data === 'removed' ? 'المضيف شال اسمك' : 'المضيف فك ربط جوالك', 'bad');\n      render();\n    }\n    if (ev === 'state') {\n      Q.setServerNow(data.serverNow);\n      const prev = S; S = data; mode = 'play';\n      if (sheet && (S.phase !== 'answer' || (S.round && S.round.answered != null))) sheet = null;\n      feedback(prev, S);\n      render();\n    }\n  });\n  async function api(type, payload) {\n    if (busy) return { ok: false };\n    busy = true;\n    const r = await net.api(type, payload);\n    busy = false;\n    if (!r.ok && r.msg) { Q.toast(r.msg, 'bad'); vib(80); }\n    return r;\n  }\n  const LEVELS = { easy: ['سهل', 'lv-easy'], medium: ['متوسط', 'lv-medium'], hard: ['صعب', 'lv-hard'] };\n  const lvBadge = l => { const x = LEVELS[l]; return x ? `<span class=\"lv ${x[1]}\">${x[0]}</span>` : ''; };\n  const vib = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };\n  const A = k => S.actionsMeta[k];\n  const first = n => esc([...(n || '?')][0]);\n  const ava = (o, i) => `<div class=\"avatar\" style=\"--c:${COLORS[(i == null ? o.idx : i) % COLORS.length]}\">${o.avatar || first(o.name)}</div>`;\n  const CATS = { proverb: ['📜 أمثال', 'cat-proverb'], riddle: ['🧩 لغز', 'cat-riddle'] };\n  const qBadges = q => q ? lvBadge(q.level) + (CATS[q.cat] ? `<span class=\"cat ${CATS[q.cat][1]}\">${CATS[q.cat][0]}</span>` : '') + (q.golden ? '<span class=\"gold-badge\">🌟 ×2</span>' : '') : '';\n  const reacts = () => `<div class=\"reacts-label\">ردّ فعلك يطلع على التلفاز 📺</div><div class=\"reacts\">${(S.config.reactions || []).map(e => `<button data-act=\"react\" data-e=\"${e}\">${e}</button>`).join('')}</div>`;\n\n  // اهتزاز وأصوات للأحداث المهمة\n  function feedback(prev, st) {\n    const r = st.round;\n    if (r && r.alerts && r.alerts.length) {\n      const k = st.qIndex + ':' + r.alerts.length;\n      if (k !== alertKey) {\n        alertKey = k;\n        if (r.alerts.some(a => a.kind === 'bad')) { vib([200, 80, 200]); r.alerts.some(a => a.icon === '💣') ? sfx.boom() : sfx.freeze(); }\n        else vib(60);\n      }\n    }\n    if (r && r.result) {\n      const k = 'r' + st.qIndex;\n      if (k !== resultKey) { resultKey = k; if (r.result.correct) { vib(60); sfx.correct(); } else { vib([120, 60, 120]); sfx.wrong(); } }\n    }\n    if (prev && prev.phase !== st.phase && st.phase === 'answer') vib(40);\n    if (prev && prev.phase !== st.phase && st.phase === 'final') Q.confetti(5000);\n  }\n\n  // ---------- العرض ----------\n  function render() {\n    const key = mode + ':' + (S ? S.phase + ':' + S.qIndex : '');\n    const fresh = key !== lastKey; lastKey = key;\n    let html = '';\n    if (mode === 'connecting') html = center('⏳', 'جاري الاتصال', '<p class=\"muted\">تأكد إنك على نفس الواي فاي</p>');\n    else if (mode === 'pick') html = rPick();\n    else html = rPlay();\n    if (offline) html += `<div class=\"banner-off\">📶 انقطع الاتصال… نحاول نرجع</div>`;\n    app.className = fresh ? 'in' : '';\n    app.innerHTML = html;\n    tick(true);\n  }\n  const center = (icon, title, extra = '') => `<div class=\"ph-center a-pop\"><div class=\"big\">${icon}</div><h2>${title}<span class=\"wait-dots\"></span></h2>${extra}</div>`;\n\n  function rPick() {\n    if (!pick || !pick.players.length) return center('📺', 'انتظر المضيف يضيف الأسماء', '<p class=\"muted\">بتطلع لك الأسماء هنا تلقائي</p>');\n    return `<div class=\"ph-center\" style=\"justify-content:flex-start;padding-top:1rem\">\n      <div class=\"big a-pop\">👋</div><h2 class=\"a-pop\">مين أنت؟</h2><p class=\"muted\">اضغط على اسمك</p>\n      <div class=\"pick-list\">${pick.players.map((p, i) => `<button class=\"pick ${p.taken ? 'taken' : ''} a-rise\" style=\"--d:${i}\" data-act=\"claim\" data-id=\"${p.id}\" ${p.taken ? 'disabled' : ''}>\n        ${ava(p, i)}${esc(p.name)}${p.taken ? '<small>متصل ✅</small>' : ''}</button>`).join('')}</div></div>`;\n  }\n\n  function top() {\n    const m = S.me;\n    const inGame = !['lobby', 'setup'].includes(S.phase);\n    return `<div class=\"ph-top\">${ava(m)}\n      <div><div class=\"nm2\">${esc(m.name)}</div><div class=\"meta\">${inGame ? `المركز ${m.rank} من ${m.playersCount}` : 'جاهز للعب'}</div></div>\n      ${m.streak >= 1 && inGame ? `<span class=\"fire\">🔥${m.streak}</span>` : ''}\n      <div class=\"score\">${m.score}<small>نقطة</small></div></div>\n      <div class=\"ph-inv\">${S.actionOrder.map(k => `<span class=\"${m.actions[k] ? '' : 'used'}\" title=\"${esc(A(k).name)}\">${A(k).icon}</span>`).join('')}</div>`;\n  }\n\n  function restoreBox() {\n    const m = S.me;\n    if (!m.restoreTokens) return '';\n    const used = S.actionOrder.filter(k => !m.actions[k]);\n    if (!used.length) return `<div class=\"restore-box\"><h3>♻️ عندك رصيد إرجاع ×${m.restoreTokens} محفوظ لين تستخدم أكشن</h3></div>`;\n    return `<div class=\"restore-box\"><h3>♻️ ستريك ${S.config.restoreEvery}! رجّع أكشن واحد ${m.restoreTokens > 1 ? `(×${m.restoreTokens})` : ''}</h3>\n      <div class=\"restore-btns\">${used.map(k => `<button data-act=\"restore\" data-k=\"${k}\">${A(k).icon} ${esc(A(k).name)}</button>`).join('')}</div></div>`;\n  }\n\n  function qBar(showTimer = true) {\n    return `<div class=\"ph-q\"><span class=\"pill\">سؤال ${S.qIndex + 1} / ${S.total} ${qBadges(S.question)}</span>${showTimer && S.endsAt ? '<div class=\"ph-timer\" data-timer>–</div>' : ''}</div>`;\n  }\n\n  function rPlay() {\n    const ph = S.phase;\n    let body = '';\n    if (ph === 'lobby' || ph === 'setup') body = rLobby();\n    else if (ph === 'actions') body = rActions();\n    else if (ph === 'answer') body = rAnswer();\n    else if (ph === 'reveal' || ph === 'scoreboard') body = rResult();\n    else if (ph === 'final') body = rFinal();\n    return top() + body + (sheet ? rSheet() : '');\n  }\n\n  function rLobby() {\n    return `<div class=\"ph-center\"><div class=\"big a-pop\">🎮</div><h2>أهلاً ${esc(S.me.name)}! انتظر بداية اللعبة</h2>\n      <p class=\"muted\">هذي أكشناتك — كل واحد تقدر تستخدمه مرة وحدة:</p>\n      <div class=\"act-grid\" style=\"width:100%\">${S.actionOrder.map((k, i) => `<div class=\"act a-rise\" style=\"--d:${i}\"><span class=\"ai\">${A(k).icon}</span><span class=\"an\">${esc(A(k).name)}</span><span class=\"ad\">${esc(A(k).desc)}</span></div>`).join('')}</div>\n      <p class=\"muted\" style=\"font-size:.9rem\">🔥 كل إجابة صح ورا بعض ترفع نقاطك · ♻️ كل ${S.config.restoreEvery} صح ورا بعض ترجع أكشن</p>\n      <p class=\"muted\" style=\"font-size:.9rem\">🚀 الأسرع ياخذ زيادة · 🌟 آخر ${S.config.goldenCount} أسئلة نقاطها ×2</p>\n      <div style=\"width:100%\">${reacts()}</div>\n      <button class=\"link-btn\" data-act=\"leave\">مو أنت؟ غيّر الاسم</button></div>`;\n  }\n\n  // مرحلة المخاطرة (قبل ما يطلع السؤال)\n  function rActions() {\n    const r = S.round, m = S.me;\n    const took = r.myActions.some(a => a.type === 'risk');\n    let body;\n    if (took) body = `<div class=\"result risk\"><div class=\"em\">🎲</div><h2>خاطرت!</h2><div>صح = +${S.config.riskBonus} · غلط = −${S.config.riskPenalty}</div></div>\n      <p class=\"muted\" style=\"text-align:center\">انتظر السؤال<span class=\"wait-dots\"></span></p>`;\n    else if (!m.actions.risk) body = `<div class=\"ph-center\"><div class=\"big\">⏳</div><h2>السؤال بيطلع بعد شوي</h2><p class=\"muted\">المخاطرة مستخدمة عندك 🎲</p></div>`;\n    else if (r.ready) body = `<div class=\"ph-center\"><div class=\"big\">👍</div><h2>بدون مخاطرة — انتظر السؤال<span class=\"wait-dots\"></span></h2></div>`;\n    else body = `<div class=\"ph-center\" style=\"flex:0\"><div class=\"big\">🎲</div><h2>تبي تخاطر بهالسؤال؟</h2>\n        <p class=\"muted\">ما تشوف السؤال قبل ما تقرر!<br>صح = <b style=\"color:#08a676\">+${S.config.riskBonus}</b> · غلط = <b style=\"color:#e63950\">−${S.config.riskPenalty}</b></p></div>\n      <button class=\"btn btn-big btn-pink\" data-act=\"useAction\" data-k=\"risk\">🎲 إيه، أخاطر!</button>\n      <button class=\"btn btn-big btn-ghost\" data-act=\"ready\">لا، بدون مخاطرة</button>`;\n    return `${qBar()}${body}${restoreBox()}`;\n  }\n\n  // أزرار الأكشنات أثناء الإجابة\n  function liveActions() {\n    const r = S.round, m = S.me, mine = r.myActions;\n    const maxed = mine.length >= S.config.maxActionsPerRound;\n    const keys = S.actionOrder.filter(k => k !== 'risk');\n    const btns = keys.map(k => {\n      const chosen = mine.some(a => a.type === k), avail = m.actions[k];\n      const dis = chosen || !avail || maxed;\n      return `<button class=\"act mini ${chosen ? 'chosen' : !avail ? 'used' : ''}\" data-act=\"pickAction\" data-k=\"${k}\" ${dis ? 'disabled' : ''}>\n        <span class=\"ai\">${A(k).icon}</span><span class=\"an\">${esc(A(k).name)}</span></button>`;\n    }).join('');\n    return `<div class=\"ph-h\"><span>⚡ الأكشنات</span><span class=\"muted\" style=\"font-size:.85rem\">${mine.length} / ${S.config.maxActionsPerRound} بهالسؤال</span></div>\n      ${mine.length ? `<div class=\"chosen-line\">${mine.map(a => `${A(a.type).icon} ${esc(A(a.type).name)}${a.targetName ? ` ← ${esc(a.targetName)}` : ''}`).join(' · ')}</div>` : ''}\n      <div class=\"mini-grid\">${btns}</div>`;\n  }\n\n  function rSheet() {\n    const a = A(sheet);\n    const opp = S.opponents;\n    return `<div class=\"sheet-bg\" data-act=\"closeSheet\"><div class=\"sheet\" data-stop=\"1\">\n      <div class=\"ic\">${a.icon}</div><h3>${esc(a.name)}</h3><p class=\"muted\">${esc(a.desc)}</p>\n      ${a.target ? `<p style=\"font-weight:800\">على مين؟ 👀</p><div class=\"targets\">${opp.map(o => `<button data-act=\"useAction\" data-k=\"${sheet}\" data-t=\"${o.id}\">${ava(o)}${esc(o.name)}</button>`).join('')}</div>`\n        : `<button class=\"btn btn-big btn-pink\" data-act=\"useAction\" data-k=\"${sheet}\">استخدمه ${a.icon}</button>`}\n      <button class=\"btn btn-ghost\" data-act=\"closeSheet\">إلغاء</button></div></div>`;\n  }\n\n  function alertsHtml() {\n    const al = (S.round && S.round.alerts) || [];\n    return al.length ? `<div class=\"alerts\">${al.map(a => `<div class=\"alert ${a.kind}\"><span class=\"ic\">${a.icon}</span>${esc(a.text)}</div>`).join('')}</div>` : '';\n  }\n\n  function rAnswer() {\n    const r = S.round, q = S.question;\n    const ans = r.answered;\n    const opts = q.options.map((o, i) => {\n      const gone = r.removed.includes(i);\n      return `<button class=\"opt o${i} ${gone ? 'gone' : ''} ${ans === i ? 'picked' : ''} a-pop\" style=\"--d:${i}\" data-act=\"answer\" data-i=\"${i}\" ${ans != null || gone ? 'disabled' : ''}>\n        <span class=\"shape\">${SHAPES[i]}</span><span class=\"otext\">${esc(o)}</span></button>`;\n    }).join('');\n    return `${qBar()}${alertsHtml()}${r.frozen ? `<div class=\"frozen-note\">🧊 أنت متجمّد! تقدر تجاوب بس ما بتاخذ نقاط هالسؤال</div>` : ''}<div class=\"ph-qtext ${q.golden ? 'golden' : ''}\">${esc(q.text)}</div>\n      ${ans != null ? `<div class=\"chosen-line\">✔ تم! انتظر النتيجة<span class=\"wait-dots\"></span></div>` : ''}\n      <div class=\"ph-opts ${ans != null ? 'locked' : ''}\">${opts}</div>\n      ${ans == null ? liveActions() : reacts()}${restoreBox()}`;\n  }\n\n  function rResult() {\n    const r = S.round, x = r.result, q = S.question, m = S.me;\n    if (!x) return center('⏳', 'جاري الحساب');\n    const fz = x.correct && x.frozen;\n    const cls = fz ? 'ice' : x.correct ? 'ok' : x.answered ? 'bad' : 'none';\n    const em = fz ? '🥶' : x.correct ? (x.streak >= 3 ? '🔥' : '🎉') : x.answered ? '😬' : '⏰';\n    const title = fz ? 'صح… بس متجمّد!' : x.correct ? (x.streak >= 2 ? `صح! ستريك ${x.streak}` : 'صح!') : x.answered ? 'غلط' : 'ما جاوبت';\n    const parts = x.parts.length ? `<div class=\"parts\">${x.parts.map(p => `<div class=\"part\"><span>${esc(p.label)}</span><b class=\"${p.v > 0 ? 'pos' : p.v < 0 ? 'neg' : ''}\">${p.v > 0 ? '+' : ''}${p.v}</b></div>`).join('')}</div>` : '';\n    const lb = S.leaderboard ? `<div class=\"lb\">${S.leaderboard.map(o => `<div class=\"${o.id === m.id ? 'me' : ''}\"><span>${o.rank === 1 ? '🥇' : o.rank === 2 ? '🥈' : o.rank === 3 ? '🥉' : '#' + o.rank}</span><span>${o.avatar || ''}</span><span>${esc(o.name)}</span><span>${o.score}</span></div>`).join('')}</div>` : '';\n    return `${qBar(false)}\n      <div class=\"result ${cls}\"><div class=\"em\">${em}</div><h2>${title}</h2><div class=\"dl\">${x.delta > 0 ? '+' : ''}${x.delta}</div>\n        ${!x.correct ? `<div>الإجابة الصحيحة: <b>${SHAPES[q.correct]} ${esc(q.options[q.correct])}</b></div>` : ''}</div>\n      ${parts}${alertsHtml()}\n      <div class=\"info-row\"><div><b>${m.score}</b><small>مجموعك</small></div><div><b>#${m.rank}</b><small>ترتيبك</small></div><div><b>🔥${m.streak}</b><small>الستريك</small></div></div>\n      ${reacts()}\n      ${restoreBox()}\n      ${lb || `<p class=\"muted\" style=\"text-align:center\">شوف التلفاز 📺</p>`}`;\n  }\n\n  function rFinal() {\n    const m = S.me;\n    const md = m.rank === 1 ? '🏆' : m.rank === 2 ? '🥈' : m.rank === 3 ? '🥉' : '🎮';\n    const lb = (S.leaderboard || []).map(o => `<div class=\"${o.id === m.id ? 'me' : ''}\"><span>#${o.rank}</span><span>${o.avatar || ''}</span><span>${esc(o.name)}</span><span>${o.score}</span></div>`).join('');\n    return `<div class=\"ph-center\"><div class=\"big a-pop\" style=\"font-size:5rem\">${md}</div>\n      <h2>${m.rank === 1 ? 'مبروك! أنت البطل 👑' : `خلصت اللعبة! مركزك ${m.rank}`}</h2>\n      <div class=\"info-row\" style=\"width:100%\"><div><b>${m.score}</b><small>نقاطك</small></div><div><b>${m.correct}</b><small>إجابات صح</small></div><div><b>${m.bestStreak}</b><small>أطول ستريك</small></div></div>\n      <div class=\"lb\" style=\"width:100%\">${lb}</div><div style=\"width:100%\">${reacts()}</div><p class=\"muted\">شكراً للعب 🎉</p></div>`;\n  }\n\n  // ---------- المؤقت ----------\n  let raf = null, lastSec = null;\n  function tick(kick) {\n    if (kick && raf) return;\n    raf = requestAnimationFrame(() => tick(false));\n    if (!S || mode !== 'play') return;\n    const ms = Q.remaining(S.endsAt), sec = Math.ceil(ms / 1000);\n    document.querySelectorAll('[data-timer]').forEach(el => { el.textContent = sec; });\n    const fz = document.querySelector('[data-freeze]');\n    if (fz) {\n      const left = +fz.dataset.freeze - Q.serverNow();\n      if (left <= 0) { render(); vib(40); }\n      else { const c = fz.querySelector('[data-fcd]'); if (c) c.textContent = Math.ceil(left / 1000); }\n    }\n    if (S.phase === 'answer' && S.round && S.round.answered == null && sec <= 3 && sec > 0 && sec !== lastSec) { lastSec = sec; vib(30); }\n  }\n\n  // ---------- الأحداث ----------\n  document.addEventListener('click', async e => {\n    Q.unlockAudio();\n    const b = e.target.closest('[data-act]');\n    if (!b) return;\n    if (b.dataset.act === 'closeSheet' && e.target.closest('[data-stop]') && b.classList.contains('sheet-bg')) return;\n    const act = b.dataset.act;\n    if (act === 'claim') {\n      const r = await api('player:claim', { id: b.dataset.id });\n      if (r.ok) { localStorage.setItem('fq_token', r.token); sfx.pop(); vib(40); }\n    } else if (act === 'leave') { localStorage.removeItem('fq_token'); await api('player:leave'); mode = 'pick'; S = null; render(); }\n    else if (act === 'pickAction') { sheet = b.dataset.k; render(); }\n    else if (act === 'closeSheet') { sheet = null; render(); }\n    else if (act === 'useAction') {\n      const k = b.dataset.k; sheet = null; render();\n      const r = await api('player:action', { action: k, target: b.dataset.t || null });\n      if (r.ok) { sfx.action(); vib(50); }\n    } else if (act === 'ready') { api('player:ready'); vib(30); }\n    else if (act === 'answer') {\n      const r = await api('player:answer', { choice: +b.dataset.i });\n      if (r.ok) { vib(40); sfx.pop(); }\n    } else if (act === 'react') {\n      net.api('player:react', { e: b.dataset.e }); vib(20);\n      b.animate([{ transform: 'scale(1.4)' }, { transform: 'scale(1)' }], { duration: 250 });\n    } else if (act === 'restore') {\n      const r = await api('player:restore', { action: b.dataset.k });\n      if (r.ok) { Q.toast('♻️ رجع الأكشن!', 'good'); vib([40, 40, 40]); }\n    }\n  });\n\n  render();\n})();\n","public/style.css":"/* =====================================================================\n   تحدي العائلة — تصميم فاتح (سماء + ألوان مرحة)\n   ===================================================================== */\n:root {\n  --sky1: #7fd0ff; --sky2: #bfe9ff; --sky3: #eefaff;\n  --text: #1d2b53; --muted: #5d6f93;\n  --card: #ffffff; --card2: #f2f8ff; --line: #d5e5f5;\n  --shadow: 0 .5rem 1.4rem rgba(40, 90, 150, .14);\n  --red: #ff4d6d; --blue: #3a86ff; --yellow: #ffbe0b; --green: #06c995; --pink: #f72585; --purple: #8338ec; --orange: #fb8500;\n  --gold: #ffc53d; --navy: #1d2b53;\n  --radius: 1.4rem;\n}\n* { box-sizing: border-box; margin: 0; padding: 0; }\nhtml, body { min-height: 100%; }\nbody {\n  font-family: 'Cairo', 'Tajawal', 'Segoe UI', Tahoma, 'Geeza Pro', sans-serif; color: var(--text);\n  background:\n    radial-gradient(22vmax 9vmax at 12% 18%, rgba(255,255,255,.95), transparent 70%),\n    radial-gradient(18vmax 7vmax at 22% 14%, rgba(255,255,255,.9), transparent 70%),\n    radial-gradient(26vmax 10vmax at 78% 30%, rgba(255,255,255,.85), transparent 70%),\n    radial-gradient(20vmax 8vmax at 88% 26%, rgba(255,255,255,.8), transparent 70%),\n    radial-gradient(30vmax 12vmax at 50% 92%, rgba(255,255,255,.9), transparent 70%),\n    radial-gradient(16vmax 16vmax at 96% -4%, rgba(255,214,102,.75), transparent 70%),\n    linear-gradient(180deg, var(--sky1) 0%, var(--sky2) 45%, var(--sky3) 100%);\n  background-attachment: fixed; overflow-x: hidden; -webkit-tap-highlight-color: transparent;\n}\nbody::before { /* نقاط ملوّنة خفيفة */\n  content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 0; opacity: .5;\n  background-image:\n    radial-gradient(circle, rgba(255,77,109,.55) 2px, transparent 2.5px),\n    radial-gradient(circle, rgba(255,190,11,.6) 2px, transparent 2.5px),\n    radial-gradient(circle, rgba(6,201,149,.55) 2px, transparent 2.5px);\n  background-size: 120px 120px, 170px 170px, 210px 210px;\n  background-position: 0 0, 60px 80px, 30px 140px;\n}\nbutton { font-family: inherit; cursor: pointer; border: 0; color: inherit; }\ninput { font-family: inherit; }\n#app { position: relative; z-index: 1; }\n#confetti { position: fixed; inset: 0; pointer-events: none; z-index: 50; display: none; }\n\n/* ---------- عناصر عامة ---------- */\n.card { background: var(--card); border: 2px solid var(--line); border-radius: var(--radius); padding: 1.4rem; box-shadow: var(--shadow); }\n.btn {\n  --c: var(--purple); background: var(--c); color: #fff; font-weight: 800; font-size: 1.05rem; border-radius: 1rem; padding: .75rem 1.4rem;\n  box-shadow: 0 .35rem 0 color-mix(in srgb, var(--c) 60%, #000), 0 .6rem 1.2rem rgba(40,90,150,.2);\n  transition: transform .12s, box-shadow .12s, filter .12s; display: inline-flex; align-items: center; justify-content: center; gap: .5rem;\n}\n.btn:hover { filter: brightness(1.06); }\n.btn:active { transform: translateY(.3rem); box-shadow: 0 .05rem 0 color-mix(in srgb, var(--c) 60%, #000); }\n.btn:disabled { filter: grayscale(.5); opacity: .6; cursor: default; transform: none; }\n.btn-big { font-size: 1.35rem; padding: 1rem 2rem; border-radius: 1.2rem; }\n.btn-green { --c: #00b386; } .btn-pink { --c: var(--pink); } .btn-blue { --c: var(--blue); } .btn-orange { --c: var(--orange); }\n.btn-ghost { --c: #fff; color: var(--navy); border: 2px solid var(--line); box-shadow: 0 .3rem 0 #c9dcef; }\n.pill { display: inline-block; background: #e6f3ff; color: var(--navy); border-radius: 99px; padding: .1rem .7rem; font-size: .85em; font-weight: 800; }\n.muted { color: var(--muted); }\n.avatar {\n  --c: var(--blue); width: 2.8rem; height: 2.8rem; border-radius: 50%; display: grid; place-items: center; flex: none;\n  background: color-mix(in srgb, var(--c) 22%, #fff); border: .2rem solid var(--c);\n  font-size: 1.6rem; line-height: 1; box-shadow: 0 .25rem .6rem rgba(40,90,150,.18);\n}\n.title { font-weight: 900; letter-spacing: -.5px; }\n.grad-text { background: linear-gradient(90deg, #ff4d6d, #f72585, #8338ec, #3a86ff, #06c995); -webkit-background-clip: text; background-clip: text; color: transparent; }\n\n/* ألوان الخيارات */\n.o0 { --oc: var(--red); } .o1 { --oc: var(--blue); } .o2 { --oc: var(--yellow); } .o3 { --oc: var(--green); }\n.opt {\n  background: var(--oc); color: #fff; border-radius: var(--radius); display: flex; align-items: center; gap: 1rem; padding: 1rem 1.4rem; font-weight: 800;\n  box-shadow: 0 .45rem 0 color-mix(in srgb, var(--oc) 60%, #000), 0 .9rem 1.6rem rgba(40,90,150,.2); position: relative; transition: transform .35s, opacity .35s, filter .35s;\n}\n.o2.opt { color: #3a2a00; } .o3.opt { color: #06352a; }\n.opt .shape { width: 3rem; height: 3rem; border-radius: .9rem; background: rgba(255,255,255,.35); display: grid; place-items: center; font-size: 1.5rem; flex: none; }\n.opt.dim { opacity: .3; filter: grayscale(.7); transform: scale(.96); }\n.opt.correct { transform: scale(1.04); box-shadow: 0 0 0 .35rem #fff, 0 0 0 .6rem var(--oc), 0 1rem 2.5rem rgba(40,90,150,.35); z-index: 2; }\n.opt.correct::after { content: '✔'; position: absolute; inset-inline-end: -1rem; top: -1rem; background: #fff; color: #00a676; width: 2.6rem; height: 2.6rem; border-radius: 50%; display: grid; place-items: center; font-size: 1.4rem; font-weight: 900; box-shadow: 0 .3rem 1rem rgba(0,0,0,.2); }\n\n/* المؤقت */\n.bar { height: .7rem; border-radius: 99px; background: #dbeefc; overflow: hidden; position: relative; }\n.bar::after { content: ''; position: absolute; inset: 0; transform-origin: right; transform: scaleX(var(--p, 1)); background: linear-gradient(90deg, #ff4d6d, #ffbe0b, #06c995); border-radius: 99px; }\n.timer-badge { min-width: 4.2rem; height: 4.2rem; border-radius: 50%; display: grid; place-items: center; font-size: 2rem; font-weight: 900; background: #fff; color: var(--navy); border: .25rem solid var(--blue); box-shadow: var(--shadow); }\n.timer-badge.low { background: var(--red); color: #fff; border-color: #fff; animation: pulse .5s infinite alternate; }\n\n/* شارات */\n.lv, .cat, .gold-badge { display: inline-block; font-size: .78em; font-weight: 900; border-radius: 99px; padding: .05rem .65rem; margin-inline-start: .4rem; vertical-align: middle; }\n.lv-easy { background: #06c995; color: #fff; } .lv-medium { background: #ffbe0b; color: #3a2a00; } .lv-hard { background: #ff4d6d; color: #fff; }\n.cat-proverb { background: #8338ec; color: #fff; } .cat-riddle { background: #fb8500; color: #fff; }\n.gold-badge { background: linear-gradient(90deg, #ffd166, #ffb703); color: #4a3000; box-shadow: 0 0 0 .15rem #fff, 0 0 1rem rgba(255,183,3,.7); }\n\n/* حركات */\n@keyframes pop { 0% { transform: scale(.5); opacity: 0; } 70% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); } }\n@keyframes rise { from { transform: translateY(1.5rem); opacity: 0; } to { transform: none; opacity: 1; } }\n@keyframes slideIn { from { transform: translateX(-2rem); opacity: 0; } to { transform: none; opacity: 1; } }\n@keyframes pulse { to { transform: scale(1.08); } }\n@keyframes float { 50% { transform: translateY(-.6rem) rotate(-4deg); } }\n@keyframes shake { 0%, 100% { transform: none; } 20% { transform: translateX(-.4rem) rotate(-2deg); } 40% { transform: translateX(.4rem) rotate(2deg); } 60% { transform: translateX(-.3rem); } 80% { transform: translateX(.3rem); } }\n@keyframes glow { 50% { box-shadow: 0 0 0 .3rem rgba(255,197,61,.55), 0 0 2rem rgba(255,197,61,.5); } }\n@keyframes shine { to { background-position: 200% 0; } }\n.in .a-pop { animation: pop .55s cubic-bezier(.2,1.4,.4,1) both; animation-delay: calc(var(--d, 0) * 90ms); }\n.in .a-rise { animation: rise .55s ease-out both; animation-delay: calc(var(--d, 0) * 80ms); }\n.in .a-slide { animation: slideIn .5s ease-out both; animation-delay: calc(var(--d, 0) * 90ms); }\n\n/* تنبيهات */\n#toasts { position: fixed; top: 1rem; left: 50%; transform: translateX(-50%); z-index: 60; display: grid; gap: .5rem; width: min(92vw, 30rem); }\n.toast { background: #fff; color: var(--navy); border: 2px solid var(--line); border-radius: 1rem; padding: .8rem 1rem; font-weight: 800; text-align: center; box-shadow: var(--shadow); animation: rise .3s both; transition: opacity .4s, transform .4s; }\n.toast.bad { border-color: var(--red); } .toast.good { border-color: var(--green); }\n.toast.out { opacity: 0; transform: translateY(-1rem); }\n.banner-off { position: fixed; bottom: 1rem; left: 50%; transform: translateX(-50%); background: var(--red); color: #fff; padding: .6rem 1.2rem; border-radius: 99px; font-weight: 800; z-index: 70; }\n\n/* =====================================================================\n   شاشة التلفاز\n   ===================================================================== */\nbody.host { font-size: clamp(14px, 1.08vw, 30px); }\nbody.host #app { min-height: 100vh; padding: 2rem 2.6rem 6rem; display: flex; flex-direction: column; }\n.screen { flex: 1; display: flex; flex-direction: column; gap: 1.3rem; }\n\n/* شاشة الإعداد */\n.hero { text-align: center; margin-top: .5rem; }\n.hero .logo { font-size: 5rem; display: inline-block; animation: float 3s ease-in-out infinite; }\n.hero h1 { font-size: 4.6rem; line-height: 1.2; }\n.hero .sub { font-size: 1.4rem; color: var(--muted); font-weight: 700; }\n.setup-card { width: min(100%, 56rem); margin: 0 auto; display: flex; flex-direction: column; gap: 1.2rem; }\n.setup-card h2 { font-size: 1.7rem; }\n.add-row { display: flex; gap: .8rem; }\n.add-row input { flex: 1; font-size: 1.4rem; padding: .8rem 1.2rem; border-radius: 1rem; border: 2px solid var(--line); background: #fff; color: var(--navy); font-weight: 700; outline: none; }\n.add-row input:focus { border-color: var(--blue); box-shadow: 0 0 0 .3rem rgba(58,134,255,.25); }\n.chips { display: flex; flex-wrap: wrap; gap: .7rem; min-height: 3.4rem; }\n.chip { display: flex; align-items: center; gap: .6rem; background: var(--card2); border: 2px solid var(--line); border-radius: 99px; padding: .3rem .5rem .3rem 1rem; font-size: 1.25rem; font-weight: 800; animation: pop .4s both; }\n.chip .avatar { cursor: pointer; transition: transform .15s; }\n.chip .avatar:hover { transform: scale(1.12) rotate(-6deg); }\n.chip .x { background: #e3eef9; width: 1.9rem; height: 1.9rem; border-radius: 50%; font-size: .9rem; color: var(--navy); }\n.chip .x:hover { background: var(--red); color: #fff; }\n.empty-hint { color: var(--muted); font-size: 1.15rem; padding: .6rem 0; }\n\n/* الانتظار والباركود */\n.lobby-grid { display: grid; grid-template-columns: minmax(20rem, 28rem) 1fr; gap: 1.6rem; flex: 1; align-items: start; }\n.qr-card { text-align: center; display: flex; flex-direction: column; align-items: center; gap: .9rem; }\n.qr-card h2 { font-size: 1.8rem; }\n.qr-wrap { background: #fff; padding: 1rem; border-radius: 1.4rem; border: .3rem solid var(--blue); box-shadow: var(--shadow); }\n.qr { width: min(22rem, 34vh); height: min(22rem, 34vh); display: block; }\n.url { font-size: 1.35rem; font-weight: 900; direction: ltr; background: #e6f3ff; color: var(--navy); padding: .4rem 1rem; border-radius: .8rem; letter-spacing: .3px; word-break: break-all; }\n.hint { color: var(--muted); font-size: 1.05rem; font-weight: 600; }\n.ip-switch { display: flex; flex-wrap: wrap; gap: .4rem; justify-content: center; }\n.ip-switch button { background: #e6f3ff; padding: .25rem .7rem; border-radius: .6rem; font-size: .9rem; direction: ltr; }\n.ip-switch button.on { background: var(--yellow); color: #3a2a00; font-weight: 800; }\n.players-card h2 { font-size: 1.8rem; margin-bottom: 1rem; display: flex; align-items: center; gap: .7rem; }\n.lobby-players { display: grid; grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr)); gap: .9rem; }\n.lp { position: relative; display: flex; align-items: center; gap: .8rem; background: var(--card2); border: 2px dashed #b9d3ec; border-radius: 1.1rem; padding: .7rem 1rem; transition: all .3s; }\n.lp.on { border-style: solid; border-color: var(--green); background: #e3fbf3; }\n.lp .avatar { filter: grayscale(1); opacity: .6; transition: all .3s; }\n.lp.on .avatar { filter: none; opacity: 1; animation: pop .5s both; }\n.lp-name { font-weight: 900; font-size: 1.3rem; }\n.lp-st { font-size: .95rem; color: var(--muted); font-weight: 700; }\n.lp .x { position: absolute; top: -.6rem; inset-inline-start: -.6rem; width: 1.8rem; height: 1.8rem; border-radius: 50%; background: var(--red); color: #fff; font-size: .8rem; opacity: 0; transition: opacity .2s; }\n.lp:hover .x { opacity: 1; }\n.legend { display: grid; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); gap: .7rem; margin-top: 1.2rem; }\n.legend-item { display: flex; gap: .7rem; align-items: center; background: var(--card2); border: 2px solid var(--line); border-radius: 1rem; padding: .6rem .8rem; }\n.legend-item .ic { font-size: 1.8rem; }\n.legend-item b { display: block; font-size: 1.1rem; }\n.legend-item small { color: var(--muted); font-size: .9rem; font-weight: 600; }\n.rules { display: flex; flex-wrap: wrap; gap: .6rem; margin-top: 1rem; }\n.rules span { background: #fff6dc; border: 2px solid #ffe08a; color: #5a4300; border-radius: 99px; padding: .3rem .9rem; font-weight: 800; font-size: 1rem; }\n.row { display: flex; gap: 1rem; align-items: center; justify-content: space-between; margin-top: 1.4rem; flex-wrap: wrap; }\n\n/* شاشة السؤال */\n.q-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }\n.q-num { font-size: 1.5rem; font-weight: 900; background: #fff; border: 2px solid var(--line); box-shadow: var(--shadow); padding: .4rem 1.2rem; border-radius: 99px; }\n.q-num small { color: var(--muted); font-weight: 700; }\n.q-text { font-size: 3.2rem; font-weight: 900; text-align: center; line-height: 1.4; padding: 1.2rem 2rem; background: #fff; color: var(--navy); border-radius: 1.8rem; border: .3rem solid #fff; box-shadow: 0 .6rem 0 #b8dcf6, 0 1.2rem 2.5rem rgba(40,90,150,.2); }\n.q-text.small { font-size: 2.4rem; }\n.q-text.golden { border-color: var(--gold); box-shadow: 0 .6rem 0 #f2b52a, 0 0 2.5rem rgba(255,197,61,.6); }\n.golden-strip { align-self: center; font-size: 1.4rem; font-weight: 900; color: #4a3000; padding: .35rem 1.4rem; border-radius: 99px;\n  background: linear-gradient(90deg, #ffd166, #fff3c4, #ffd166); background-size: 200% 100%; animation: shine 2s linear infinite; box-shadow: 0 .3rem 1rem rgba(255,183,3,.5); }\n.action-time { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; text-align: center; }\n.action-time .bolt { font-size: 6.5rem; animation: float 1.6s ease-in-out infinite; filter: drop-shadow(0 .6rem 1rem rgba(40,90,150,.25)); }\n.action-time h2 { font-size: 3.6rem; }\n.action-time p { font-size: 1.5rem; color: var(--muted); font-weight: 700; }\n.answer-layout { flex: 1; display: grid; grid-template-columns: 1fr minmax(16rem, 22rem); gap: 1.4rem; align-items: stretch; }\n.answer-layout.full { grid-template-columns: 1fr; }\n.opts { display: grid; grid-template-columns: 1fr 1fr; grid-auto-rows: minmax(8.5rem, 1fr); gap: 1.4rem; align-content: stretch; max-height: 26rem; align-self: center; width: 100%; }\n.opts .opt { font-size: 2.5rem; }\n.opts .opt .shape { width: 3.6rem; height: 3.6rem; font-size: 1.8rem; }\n.opt .who { position: absolute; bottom: -1.2rem; inset-inline-start: 1rem; display: flex; gap: .3rem; flex-wrap: wrap; }\n.opt .who span { background: #fff; color: var(--navy); font-size: 1.1rem; font-weight: 800; padding: .1rem .7rem; border-radius: 99px; box-shadow: 0 .2rem .6rem rgba(0,0,0,.2); }\n.fx-panel { display: flex; flex-direction: column; gap: .6rem; }\n.fx-panel h3 { font-size: 1.4rem; }\n.fx { display: flex; gap: .7rem; align-items: center; background: var(--card2); border: 2px solid var(--line); border-inline-start: .4rem solid var(--purple); border-radius: .9rem; padding: .6rem .9rem; font-weight: 800; font-size: 1.05rem; line-height: 1.4; }\n.fx .ic { font-size: 1.6rem; }\n.fx.hit { border-inline-start-color: var(--red); background: #fff0f3; } .fx.reflected { border-inline-start-color: var(--yellow); background: #fff9e6; }\n.fx.blocked { border-inline-start-color: var(--blue); background: #eef5ff; } .fx.self { border-inline-start-color: var(--green); } .fx.restore { border-inline-start-color: var(--pink); background: #fff0f8; }\n.fx-empty { color: var(--muted); font-size: 1.1rem; font-weight: 700; }\n\n/* شريط اللاعبين */\n.strip { display: flex; flex-wrap: wrap; gap: .8rem; justify-content: center; }\n.sp { position: relative; display: flex; align-items: center; gap: .6rem; background: #fff; border: 2px solid var(--line); box-shadow: 0 .25rem .6rem rgba(40,90,150,.12); border-radius: 99px; padding: .3rem 1rem .3rem .35rem; font-weight: 800; font-size: 1.15rem; transition: all .3s; }\n.sp .avatar { width: 2.4rem; height: 2.4rem; font-size: 1.3rem; }\n.sp.done { border-color: var(--green); background: #e3fbf3; }\n.sp.off { opacity: .45; }\n.sp .badge { font-size: 1rem; background: #e6f3ff; border-radius: 99px; padding: 0 .5rem; }\n.sp.frozen { border-color: #5cc8ff; background: #e0f6ff; animation: shake .5s; }\n.sp .ice { display: none; } .sp.frozen .ice { display: inline; }\n\n/* الكشف */\n.reveal-title { text-align: center; font-size: 2rem; font-weight: 900; }\n.reveal-sub { text-align: center; font-size: 1.3rem; font-weight: 800; color: var(--muted); }\n.noans { text-align: center; color: var(--muted); font-size: 1.15rem; margin-top: .8rem; font-weight: 700; }\n\n/* لوحة الترتيب */\n.score-layout { flex: 1; display: grid; grid-template-columns: 1fr minmax(18rem, 25rem); gap: 1.6rem; align-items: start; }\n.score-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }\n.score-head h2 { font-size: 2.6rem; }\n.ranks { display: flex; flex-direction: column; gap: .65rem; }\n.rr { display: grid; grid-template-columns: 3.2rem 2.4rem 3rem minmax(9rem, 1fr) minmax(8rem, 1.2fr) 7rem 6.5rem; align-items: center; gap: .8rem; background: #fff; border: 2px solid var(--line); box-shadow: 0 .3rem .8rem rgba(40,90,150,.1); border-radius: 1.2rem; padding: .6rem 1rem; }\n.rr.r1 { background: linear-gradient(90deg, #fff4d1, #fff); border-color: var(--gold); animation: glow 2s infinite; }\n.rr.r2 { background: linear-gradient(90deg, #eef2f7, #fff); border-color: #c5d0de; }\n.rr.r3 { background: linear-gradient(90deg, #fbeadb, #fff); border-color: #e8b98f; }\n.rk { font-size: 1.8rem; font-weight: 900; text-align: center; }\n.mv { font-size: 1rem; font-weight: 900; text-align: center; }\n.mv.up { color: #08a676; } .mv.down { color: #e63950; } .mv.same { color: #9fb0c8; }\n.nm { font-size: 1.45rem; font-weight: 900; display: flex; align-items: center; gap: .45rem; flex-wrap: wrap; line-height: 1.2; }\n.nm .streak { font-size: .95rem; background: #fff1e0; border: 2px solid var(--orange); color: #8a4600; border-radius: 99px; padding: 0 .5rem; }\n.nm .rt { font-size: .95rem; background: #ffe6f2; border: 2px solid var(--pink); color: #8a0f4b; border-radius: 99px; padding: 0 .5rem; }\n.inv { display: flex; gap: .1rem; font-size: .95rem; width: 100%; margin-top: .15rem; }\n.inv span.used { filter: grayscale(1); opacity: .22; }\n.ract { display: flex; flex-wrap: wrap; gap: .3rem; }\n.ract span { background: #f0ebff; border: 1.5px solid #cdbdff; color: #3c1f8a; border-radius: 99px; padding: .05rem .55rem; font-size: .95rem; font-weight: 800; white-space: nowrap; }\n.ract .none { background: none; border: 0; color: #a8b6cc; font-weight: 700; }\n.delta { text-align: center; font-weight: 900; font-size: 1.45rem; line-height: 1.1; }\n.delta small { display: block; font-size: .8rem; font-weight: 800; color: var(--muted); }\n.delta.pos { color: #08a676; } .delta.neg { color: #e63950; } .delta.zero { color: #9fb0c8; }\n.sc { font-size: 2rem; font-weight: 900; text-align: end; font-variant-numeric: tabular-nums; }\n.side { display: flex; flex-direction: column; gap: 1rem; }\n.correct-box { background: #e3fbf3; border: 2px solid var(--green); border-radius: 1.2rem; padding: .9rem 1.1rem; }\n.correct-box small { color: #08734f; font-weight: 800; }\n.correct-box div { font-size: 1.4rem; font-weight: 900; }\n.col-head { display: grid; grid-template-columns: 3.2rem 2.4rem 3rem minmax(9rem, 1fr) minmax(8rem, 1.2fr) 7rem 6.5rem; gap: .8rem; padding: 0 1rem; color: var(--muted); font-weight: 800; font-size: .95rem; }\n\n/* النهاية */\n.screen > h1.title { text-align: center; font-size: 4rem; }\n.podium { display: flex; align-items: flex-end; justify-content: center; gap: 1.4rem; margin-top: .5rem; }\n.pod { width: 16rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: .5rem; }\n.pod .avatar { width: 6rem; height: 6rem; font-size: 3.6rem; border-width: .35rem; }\n.pod .pn { font-size: 1.8rem; font-weight: 900; }\n.pod .ps { font-size: 1.4rem; font-weight: 800; color: var(--muted); }\n.pod .block { width: 100%; border-radius: 1.2rem 1.2rem 0 0; display: grid; place-items: center; font-size: 4rem; font-weight: 900; color: #fff; box-shadow: inset 0 .5rem 0 rgba(255,255,255,.35); }\n.pod.p1 .block { height: 14rem; background: linear-gradient(180deg, #ffd166, #f8961e); }\n.pod.p2 .block { height: 10rem; background: linear-gradient(180deg, #dfe7f1, #9aa9bd); color: var(--navy); }\n.pod.p3 .block { height: 7rem; background: linear-gradient(180deg, #f4b98a, #c97a40); }\n.pod.p1 .avatar { box-shadow: 0 0 0 .4rem #fff, 0 0 2.5rem rgba(255,183,3,.9); }\n.crown { font-size: 3.4rem; animation: float 2s ease-in-out infinite; }\n.in .pod { animation: rise .8s cubic-bezier(.2,1.2,.4,1) both; }\n.in .pod.p3 { animation-delay: .3s; } .in .pod.p2 { animation-delay: .9s; } .in .pod.p1 { animation-delay: 1.6s; }\n.stats { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }\n.stat { background: #fff; border: 2px solid var(--line); box-shadow: var(--shadow); border-radius: 1.2rem; padding: .7rem 1.2rem; text-align: center; }\n.stat b { display: block; font-size: 1.35rem; } .stat small { color: var(--muted); font-size: 1rem; font-weight: 800; }\n.rest { display: flex; flex-wrap: wrap; justify-content: center; gap: .6rem; }\n\n/* ردود الفعل الطايرة */\n.react-float { position: fixed; bottom: 5rem; z-index: 45; pointer-events: none; display: flex; flex-direction: column; align-items: center; animation: flyUp 3.2s ease-out forwards; }\n.react-float .e { font-size: 4.5rem; line-height: 1; filter: drop-shadow(0 .4rem .6rem rgba(0,0,0,.2)); }\n.react-float .who { margin-top: .2rem; background: #fff; border-radius: 99px; padding: .1rem .7rem; font-weight: 900; font-size: 1.05rem; box-shadow: var(--shadow); white-space: nowrap; }\n@keyframes flyUp { 0% { transform: translateY(0) scale(.4); opacity: 0; } 12% { transform: translateY(-2rem) scale(1.15); opacity: 1; } 75% { opacity: 1; } 100% { transform: translateY(-55vh) scale(.9) rotate(var(--rot, 8deg)); opacity: 0; } }\n\n/* أزرار التحكم */\n#controls { position: fixed; bottom: 1.2rem; left: 1.4rem; z-index: 40; display: flex; gap: .7rem; align-items: center; direction: rtl; }\n#controls .icon { width: 3.2rem; height: 3.2rem; padding: 0; font-size: 1.3rem; border-radius: 50%; }\n.keyhint { color: var(--muted); font-size: .9rem; font-weight: 700; }\n\n/* =====================================================================\n   الجوال\n   ===================================================================== */\nbody.phone { font-size: 16px; }\nbody.phone #app { min-height: 100vh; min-height: 100dvh; padding: .9rem .9rem 1.6rem; display: flex; flex-direction: column; gap: .85rem; max-width: 34rem; margin: 0 auto; }\n.ph-top { display: flex; align-items: center; gap: .7rem; background: rgba(255,255,255,.95); border: 2px solid var(--line); border-radius: 1.2rem; padding: .5rem .8rem; position: sticky; top: .5rem; z-index: 5; box-shadow: var(--shadow); }\n.ph-top .nm2 { font-weight: 900; font-size: 1.1rem; line-height: 1.1; }\n.ph-top .meta { font-size: .8rem; color: var(--muted); font-weight: 800; }\n.ph-top .score { margin-inline-start: auto; text-align: center; font-weight: 900; font-size: 1.4rem; line-height: 1; }\n.ph-top .score small { display: block; font-size: .7rem; color: var(--muted); }\n.ph-top .fire { font-weight: 900; background: #fff1e0; border: 2px solid var(--orange); color: #8a4600; border-radius: 99px; padding: .05rem .5rem; font-size: .9rem; }\n.ph-inv { display: flex; justify-content: space-between; background: #fff; border: 2px solid var(--line); border-radius: 1rem; padding: .3rem .6rem; font-size: 1.35rem; }\n.ph-inv span.used { filter: grayscale(1); opacity: .22; }\n.ph-center { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; gap: .8rem; }\n.ph-center .big { font-size: 4rem; }\n.ph-center h2 { font-size: 1.6rem; font-weight: 900; }\n.pick-list { display: grid; gap: .7rem; width: 100%; }\n.pick { display: flex; align-items: center; gap: .8rem; background: #fff; border: 2px solid var(--line); box-shadow: var(--shadow); border-radius: 1.1rem; padding: .7rem 1rem; font-size: 1.3rem; font-weight: 900; text-align: start; }\n.pick:active { transform: scale(.98); }\n.pick.taken { opacity: .45; }\n.pick small { margin-inline-start: auto; font-size: .8rem; color: var(--muted); font-weight: 800; }\n.ph-q { display: flex; align-items: center; justify-content: space-between; gap: .6rem; flex-wrap: wrap; }\n.ph-q .pill { font-size: .95rem; background: #fff; border: 2px solid var(--line); }\n.ph-timer { width: 3rem; height: 3rem; border-radius: 50%; background: #fff; color: var(--navy); border: .2rem solid var(--blue); display: grid; place-items: center; font-weight: 900; font-size: 1.3rem; }\n.ph-qtext { background: #fff; color: var(--navy); border: 2px solid var(--line); box-shadow: 0 .35rem 0 #b8dcf6; border-radius: 1.1rem; padding: .8rem 1rem; font-weight: 900; font-size: 1.15rem; text-align: center; line-height: 1.55; }\n.ph-qtext.golden { border-color: var(--gold); box-shadow: 0 .35rem 0 #f2b52a, 0 0 1.2rem rgba(255,197,61,.5); }\n.ph-h { font-size: 1.1rem; font-weight: 900; display: flex; align-items: center; justify-content: space-between; }\n.act-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; }\n.act { background: #fff; border: 2px solid var(--line); box-shadow: 0 .25rem 0 #cfe2f4; border-radius: 1.1rem; padding: .65rem .6rem; display: flex; flex-direction: column; align-items: center; gap: .1rem; text-align: center; transition: transform .1s; }\n.act:active { transform: scale(.96); }\n.act .ai { font-size: 1.9rem; line-height: 1.2; }\n.act .an { font-weight: 900; font-size: 1rem; }\n.act .ad { font-size: .74rem; color: var(--muted); font-weight: 700; line-height: 1.3; }\n.act.used { opacity: .35; filter: grayscale(1); }\n.act.chosen { border-color: var(--yellow); background: #fff6dc; opacity: 1; filter: none; }\n.act:disabled { cursor: default; }\n.act-grid .act:last-child:nth-child(odd) { grid-column: span 2; }\n.mini-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: .5rem; }\n.act.mini { padding: .5rem .3rem; border-radius: .9rem; }\n.act.mini .ai { font-size: 1.5rem; } .act.mini .an { font-size: .82rem; }\n.chosen-line { background: #fff6dc; border: 2px solid #ffe08a; color: #5a4300; border-radius: 1rem; padding: .5rem .8rem; font-weight: 800; text-align: center; }\n.ph-opts { display: grid; gap: .65rem; align-content: start; }\n.ph-opts .opt { font-size: 1.25rem; min-height: 4.3rem; width: 100%; text-align: start; padding: .75rem 1rem; }\n.ph-opts .opt .shape { width: 2.5rem; height: 2.5rem; font-size: 1.15rem; }\n.ph-opts .opt:active { transform: scale(.97); }\n.ph-opts .opt.gone { opacity: .15; filter: grayscale(1); pointer-events: none; }\n.ph-opts .opt.gone .otext { text-decoration: line-through; }\n.ph-opts .opt.picked { box-shadow: 0 0 0 .3rem #fff, 0 0 0 .5rem var(--navy); }\n.ph-opts.locked .opt:not(.picked) { opacity: .35; }\n.alerts { display: grid; gap: .5rem; }\n.alert { border-radius: 1rem; padding: .55rem .9rem; font-weight: 800; background: #fff; border: 2px solid var(--line); display: flex; gap: .6rem; align-items: center; animation: pop .4s both; }\n.alert.bad { border-color: var(--red); background: #fff0f3; }\n.alert.good { border-color: var(--green); background: #e3fbf3; }\n.alert .ic { font-size: 1.4rem; }\n.frozen-note { background: #e0f6ff; border: 2px solid #5cc8ff; color: #0b4a6e; border-radius: 1rem; padding: .7rem .9rem; font-weight: 900; text-align: center; animation: pop .4s both; }\n.result { border-radius: 1.4rem; padding: 1.1rem; text-align: center; display: flex; flex-direction: column; gap: .35rem; color: #fff; animation: pop .5s both; box-shadow: var(--shadow); }\n.result.ok { background: linear-gradient(160deg, #06d6a0, #00a676); }\n.result.bad { background: linear-gradient(160deg, #ff6b86, #d61f4f); }\n.result.none { background: linear-gradient(160deg, #94a3b8, #64748b); }\n.result.ice { background: linear-gradient(160deg, #6fd3ff, #2f7fd8); }\n.result.risk { background: linear-gradient(160deg, #f72585, #8338ec); }\n.result .em { font-size: 3.4rem; line-height: 1; }\n.result h2 { font-size: 2rem; font-weight: 900; }\n.result .dl { font-size: 2.4rem; font-weight: 900; }\n.parts { display: grid; gap: .35rem; }\n.part { display: flex; justify-content: space-between; background: #fff; border: 2px solid var(--line); border-radius: .8rem; padding: .4rem .8rem; font-weight: 800; }\n.part b.pos { color: #08a676; } .part b.neg { color: #e63950; }\n.info-row { display: flex; gap: .6rem; }\n.info-row > div { flex: 1; background: #fff; border: 2px solid var(--line); border-radius: 1rem; padding: .55rem; text-align: center; }\n.info-row b { display: block; font-size: 1.5rem; font-weight: 900; }\n.info-row small { color: var(--muted); font-weight: 800; font-size: .8rem; }\n.restore-box { background: linear-gradient(160deg, #ffe0f0, #efe5ff); border: 2px solid var(--pink); border-radius: 1.2rem; padding: .8rem; display: grid; gap: .6rem; animation: glow 2s infinite; }\n.restore-box h3 { font-size: 1.05rem; font-weight: 900; text-align: center; color: #6b0f3e; }\n.restore-btns { display: flex; flex-wrap: wrap; gap: .5rem; justify-content: center; }\n.restore-btns button { background: #fff; border: 2px solid #f5b5d6; border-radius: .9rem; padding: .4rem .8rem; font-weight: 800; font-size: 1rem; }\n.sheet-bg { position: fixed; inset: 0; background: rgba(29,43,83,.45); z-index: 40; display: flex; align-items: flex-end; }\n.sheet { width: 100%; max-width: 34rem; margin: 0 auto; background: #fff; border-radius: 1.6rem 1.6rem 0 0; padding: 1.2rem 1rem 1.6rem; display: grid; gap: .8rem; text-align: center; animation: rise .25s both; box-shadow: 0 -1rem 2rem rgba(29,43,83,.2); }\n.sheet .ic { font-size: 3.4rem; }\n.sheet h3 { font-size: 1.5rem; font-weight: 900; }\n.targets { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; }\n.targets button { display: flex; align-items: center; gap: .5rem; background: var(--card2); border: 2px solid var(--line); border-radius: 1rem; padding: .5rem .7rem; font-weight: 900; font-size: 1.05rem; }\n.targets .avatar { width: 2.2rem; height: 2.2rem; font-size: 1.2rem; }\n.lb { display: grid; gap: .4rem; }\n.lb div { display: flex; gap: .6rem; align-items: center; background: #fff; border: 2px solid var(--line); border-radius: .9rem; padding: .35rem .8rem; font-weight: 800; }\n.lb div.me { background: #fff4d1; border-color: var(--gold); }\n.lb div span:last-child { margin-inline-start: auto; }\n.lb .avatar { width: 2rem; height: 2rem; font-size: 1.1rem; border-width: .15rem; }\n.reacts { display: flex; justify-content: space-between; gap: .4rem; background: #fff; border: 2px solid var(--line); border-radius: 1.1rem; padding: .4rem .5rem; }\n.reacts button { font-size: 1.7rem; background: var(--card2); border-radius: .8rem; flex: 1; padding: .25rem 0; transition: transform .1s; }\n.reacts button:active { transform: scale(1.25); }\n.reacts-label { text-align: center; color: var(--muted); font-size: .8rem; font-weight: 800; margin-bottom: -.4rem; }\n.link-btn { background: none; color: var(--muted); text-decoration: underline; font-weight: 700; font-size: .9rem; padding: .3rem; }\n.wait-dots::after { content: '...'; animation: dots 1.4s infinite steps(4); display: inline-block; width: 1.2em; text-align: start; overflow: hidden; vertical-align: bottom; }\n@keyframes dots { 0% { width: 0; } 100% { width: 1.2em; } }\n.shake { animation: shake .5s; }\n\n@media (max-width: 1100px) {\n  body.host { font-size: 13px; }\n  .lobby-grid, .score-layout, .answer-layout { grid-template-columns: 1fr; }\n}\n","questions.json":"[\n {\n  \"level\": \"easy\",\n  \"q\": \"ما هي عاصمة دولة الكويت؟\",\n  \"options\": [\n   \"مدينة الكويت\",\n   \"الجهراء\",\n   \"الأحمدي\",\n   \"حولي\"\n  ],\n  \"answer\": \"مدينة الكويت\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"easy\",\n  \"q\": \"كم عدد أرجل الحشرة؟\",\n  \"options\": [\n   \"4\",\n   \"6\",\n   \"8\",\n   \"10\"\n  ],\n  \"answer\": \"6\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"easy\",\n  \"q\": \"ما هو أطول نهر في قارة أفريقيا؟\",\n  \"options\": [\n   \"النيل\",\n   \"الكونغو\",\n   \"النيجر\",\n   \"الزامبيزي\"\n  ],\n  \"answer\": \"النيل\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"easy\",\n  \"q\": \"أي حيوان يلقّب بـ «ملك الغابة»؟\",\n  \"options\": [\n   \"الأسد\",\n   \"النمر\",\n   \"الفيل\",\n   \"الدب\"\n  ],\n  \"answer\": \"الأسد\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"easy\",\n  \"q\": \"كم عدد أشهر السنة الهجرية؟\",\n  \"options\": [\n   \"10\",\n   \"11\",\n   \"12\",\n   \"13\"\n  ],\n  \"answer\": \"12\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"easy\",\n  \"q\": \"في أي شهر هجري يصوم المسلمون؟\",\n  \"options\": [\n   \"شعبان\",\n   \"رمضان\",\n   \"شوال\",\n   \"رجب\"\n  ],\n  \"answer\": \"رمضان\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"easy\",\n  \"q\": \"ما هي ألوان علم دولة قطر؟\",\n  \"options\": [\n   \"العنابي والأبيض\",\n   \"الأحمر والأبيض\",\n   \"الأخضر والأبيض\",\n   \"الأزرق والأبيض\"\n  ],\n  \"answer\": \"العنابي والأبيض\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"easy\",\n  \"q\": \"كم عدد أضلاع المثلث؟\",\n  \"options\": [\n   \"2\",\n   \"3\",\n   \"4\",\n   \"5\"\n  ],\n  \"answer\": \"3\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"easy\",\n  \"q\": \"ما هو أقرب نجم إلى كوكب الأرض؟\",\n  \"options\": [\n   \"الشمس\",\n   \"الشعرى اليمانية\",\n   \"النجم القطبي\",\n   \"سهيل\"\n  ],\n  \"answer\": \"الشمس\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"easy\",\n  \"q\": \"أي حيوان نحصل منه على الصوف؟\",\n  \"options\": [\n   \"الخروف\",\n   \"البقرة\",\n   \"الدجاجة\",\n   \"الحصان\"\n  ],\n  \"answer\": \"الخروف\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"easy\",\n  \"q\": \"كم عدد لاعبي فريق كرة السلة داخل الملعب؟\",\n  \"options\": [\n   \"5\",\n   \"6\",\n   \"7\",\n   \"11\"\n  ],\n  \"answer\": \"5\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"easy\",\n  \"q\": \"بأي عضو يشم الإنسان الروائح؟\",\n  \"options\": [\n   \"الأذن\",\n   \"الأنف\",\n   \"اللسان\",\n   \"العين\"\n  ],\n  \"answer\": \"الأنف\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"easy\",\n  \"q\": \"ما هي عاصمة مصر؟\",\n  \"options\": [\n   \"القاهرة\",\n   \"الإسكندرية\",\n   \"الجيزة\",\n   \"أسوان\"\n  ],\n  \"answer\": \"القاهرة\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"easy\",\n  \"q\": \"كم ساعة في اليوم الواحد؟\",\n  \"options\": [\n   \"12\",\n   \"20\",\n   \"24\",\n   \"36\"\n  ],\n  \"answer\": \"24\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"easy\",\n  \"q\": \"أي حيوان يبني السدود في الأنهار؟\",\n  \"options\": [\n   \"القندس\",\n   \"السنجاب\",\n   \"الأرنب\",\n   \"الثعلب\"\n  ],\n  \"answer\": \"القندس\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"medium\",\n  \"q\": \"ما هي عاصمة كندا؟\",\n  \"options\": [\n   \"تورونتو\",\n   \"أوتاوا\",\n   \"مونتريال\",\n   \"فانكوفر\"\n  ],\n  \"answer\": \"أوتاوا\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"medium\",\n  \"q\": \"كم عدد عظام جسم الإنسان البالغ؟\",\n  \"options\": [\n   \"186\",\n   \"206\",\n   \"226\",\n   \"306\"\n  ],\n  \"answer\": \"206\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"medium\",\n  \"q\": \"ما هو الرمز الكيميائي للذهب؟\",\n  \"options\": [\n   \"Au\",\n   \"Ag\",\n   \"Fe\",\n   \"Go\"\n  ],\n  \"answer\": \"Au\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"medium\",\n  \"q\": \"ما هي أكبر صحراء حارّة في العالم؟\",\n  \"options\": [\n   \"الربع الخالي\",\n   \"الصحراء الكبرى\",\n   \"صحراء غوبي\",\n   \"صحراء كالاهاري\"\n  ],\n  \"answer\": \"الصحراء الكبرى\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"medium\",\n  \"q\": \"في أي دولة تقع مدينة البتراء الأثرية؟\",\n  \"options\": [\n   \"مصر\",\n   \"الأردن\",\n   \"سوريا\",\n   \"العراق\"\n  ],\n  \"answer\": \"الأردن\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"medium\",\n  \"q\": \"كم عدد أجزاء القرآن الكريم؟\",\n  \"options\": [\n   \"20\",\n   \"30\",\n   \"40\",\n   \"60\"\n  ],\n  \"answer\": \"30\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"medium\",\n  \"q\": \"ما هو أسرع طائر في العالم عند الانقضاض؟\",\n  \"options\": [\n   \"الصقر الشاهين\",\n   \"النسر\",\n   \"النعامة\",\n   \"الحبارى\"\n  ],\n  \"answer\": \"الصقر الشاهين\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"medium\",\n  \"q\": \"من هو مؤلف رواية «البؤساء»؟\",\n  \"options\": [\n   \"فيكتور هوغو\",\n   \"تشارلز ديكنز\",\n   \"ليو تولستوي\",\n   \"شكسبير\"\n  ],\n  \"answer\": \"فيكتور هوغو\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"medium\",\n  \"q\": \"كم عدد دول مجلس التعاون الخليجي؟\",\n  \"options\": [\n   \"5\",\n   \"6\",\n   \"7\",\n   \"8\"\n  ],\n  \"answer\": \"6\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"medium\",\n  \"q\": \"ما هي عاصمة سلطنة عُمان؟\",\n  \"options\": [\n   \"مسقط\",\n   \"صلالة\",\n   \"صحار\",\n   \"نزوى\"\n  ],\n  \"answer\": \"مسقط\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"medium\",\n  \"q\": \"ما هو الغاز الأكثر وجوداً في الهواء؟\",\n  \"options\": [\n   \"الأكسجين\",\n   \"النيتروجين\",\n   \"ثاني أكسيد الكربون\",\n   \"الأرغون\"\n  ],\n  \"answer\": \"النيتروجين\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"medium\",\n  \"q\": \"أي منتخب فاز بكأس العالم 2022 في قطر؟\",\n  \"options\": [\n   \"فرنسا\",\n   \"الأرجنتين\",\n   \"البرازيل\",\n   \"المغرب\"\n  ],\n  \"answer\": \"الأرجنتين\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"medium\",\n  \"q\": \"ما هو أصغر كوكب في المجموعة الشمسية؟\",\n  \"options\": [\n   \"عطارد\",\n   \"المريخ\",\n   \"الزهرة\",\n   \"الأرض\"\n  ],\n  \"answer\": \"عطارد\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"medium\",\n  \"q\": \"كم عدد لاعبي فريق الكرة الطائرة داخل الملعب؟\",\n  \"options\": [\n   \"5\",\n   \"6\",\n   \"7\",\n   \"9\"\n  ],\n  \"answer\": \"6\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"medium\",\n  \"q\": \"ما هي العملة الرسمية في بريطانيا؟\",\n  \"options\": [\n   \"اليورو\",\n   \"الجنيه الإسترليني\",\n   \"الدولار\",\n   \"الفرنك\"\n  ],\n  \"answer\": \"الجنيه الإسترليني\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"hard\",\n  \"q\": \"في أي سنة نالت دولة قطر استقلالها؟\",\n  \"options\": [\n   \"1967\",\n   \"1971\",\n   \"1974\",\n   \"1981\"\n  ],\n  \"answer\": \"1971\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"hard\",\n  \"q\": \"ما هي أعمق نقطة معروفة في محيطات العالم؟\",\n  \"options\": [\n   \"خندق ماريانا\",\n   \"خندق بورتوريكو\",\n   \"خندق تونغا\",\n   \"خندق جاوة\"\n  ],\n  \"answer\": \"خندق ماريانا\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"hard\",\n  \"q\": \"ما هي عاصمة نيوزيلندا؟\",\n  \"options\": [\n   \"أوكلاند\",\n   \"ولينغتون\",\n   \"كرايستشيرش\",\n   \"كوينزتاون\"\n  ],\n  \"answer\": \"ولينغتون\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"hard\",\n  \"q\": \"كم عدد سور القرآن الكريم؟\",\n  \"options\": [\n   \"110\",\n   \"112\",\n   \"114\",\n   \"116\"\n  ],\n  \"answer\": \"114\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"hard\",\n  \"q\": \"ما هو أكثر فلز وفرةً في القشرة الأرضية؟\",\n  \"options\": [\n   \"الحديد\",\n   \"الألمنيوم\",\n   \"النحاس\",\n   \"الذهب\"\n  ],\n  \"answer\": \"الألمنيوم\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"hard\",\n  \"q\": \"كم يستغرق ضوء الشمس تقريباً حتى يصل إلى الأرض؟\",\n  \"options\": [\n   \"8 ثوانٍ\",\n   \"8 دقائق\",\n   \"8 ساعات\",\n   \"يوم كامل\"\n  ],\n  \"answer\": \"8 دقائق\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"hard\",\n  \"q\": \"من هو العالم المسلم الملقّب بـ «أبو الجراحة»؟\",\n  \"options\": [\n   \"الزهراوي\",\n   \"ابن سينا\",\n   \"الرازي\",\n   \"ابن الهيثم\"\n  ],\n  \"answer\": \"الزهراوي\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"hard\",\n  \"q\": \"ما هي أطول عظمة في جسم الإنسان؟\",\n  \"options\": [\n   \"عظمة الفخذ\",\n   \"عظمة الساق\",\n   \"عظمة العضد\",\n   \"عظمة الترقوة\"\n  ],\n  \"answer\": \"عظمة الفخذ\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"hard\",\n  \"q\": \"ما هي اللغة الرسمية في البرازيل؟\",\n  \"options\": [\n   \"الإسبانية\",\n   \"البرتغالية\",\n   \"الفرنسية\",\n   \"الإنجليزية\"\n  ],\n  \"answer\": \"البرتغالية\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"hard\",\n  \"q\": \"كم قلباً للأخطبوط؟\",\n  \"options\": [\n   \"1\",\n   \"2\",\n   \"3\",\n   \"4\"\n  ],\n  \"answer\": \"3\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"hard\",\n  \"q\": \"كم عدد الكروموسومات في الخلية البشرية العادية؟\",\n  \"options\": [\n   \"23\",\n   \"44\",\n   \"46\",\n   \"48\"\n  ],\n  \"answer\": \"46\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"hard\",\n  \"q\": \"أي غاز في طبقات الجو العليا يحمي الأرض من الأشعة فوق البنفسجية؟\",\n  \"options\": [\n   \"الأوزون\",\n   \"النيتروجين\",\n   \"بخار الماء\",\n   \"الهيليوم\"\n  ],\n  \"answer\": \"الأوزون\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"hard\",\n  \"q\": \"في أي سنة ميلادية كانت الهجرة النبوية إلى المدينة المنورة؟\",\n  \"options\": [\n   \"610م\",\n   \"622م\",\n   \"630م\",\n   \"632م\"\n  ],\n  \"answer\": \"622م\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"hard\",\n  \"q\": \"ما هي عاصمة أذربيجان؟\",\n  \"options\": [\n   \"باكو\",\n   \"تبليسي\",\n   \"يريفان\",\n   \"طشقند\"\n  ],\n  \"answer\": \"باكو\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"hard\",\n  \"q\": \"ما هو أكبر عضو في جسم الإنسان؟\",\n  \"options\": [\n   \"الكبد\",\n   \"الجلد\",\n   \"الرئتان\",\n   \"الدماغ\"\n  ],\n  \"answer\": \"الجلد\",\n  \"cat\": \"general\"\n },\n {\n  \"level\": \"easy\",\n  \"cat\": \"general\",\n  \"q\": \"ما لون الموز الناضج؟\",\n  \"options\": [\n   \"الأصفر\",\n   \"الأحمر\",\n   \"الأزرق\",\n   \"البنفسجي\"\n  ],\n  \"answer\": \"الأصفر\"\n },\n {\n  \"level\": \"easy\",\n  \"cat\": \"general\",\n  \"q\": \"كم عدد أيام الأسبوع؟\",\n  \"options\": [\n   \"5\",\n   \"6\",\n   \"7\",\n   \"8\"\n  ],\n  \"answer\": \"7\"\n },\n {\n  \"level\": \"easy\",\n  \"cat\": \"general\",\n  \"q\": \"أي حيوان نشرب حليبه عادة؟\",\n  \"options\": [\n   \"البقرة\",\n   \"الأسد\",\n   \"الذئب\",\n   \"النمر\"\n  ],\n  \"answer\": \"البقرة\"\n },\n {\n  \"level\": \"easy\",\n  \"cat\": \"general\",\n  \"q\": \"ما اسم الكوكب الذي نعيش عليه؟\",\n  \"options\": [\n   \"الأرض\",\n   \"المريخ\",\n   \"زحل\",\n   \"المشتري\"\n  ],\n  \"answer\": \"الأرض\"\n },\n {\n  \"level\": \"easy\",\n  \"cat\": \"general\",\n  \"q\": \"ما هي عاصمة السعودية؟\",\n  \"options\": [\n   \"الرياض\",\n   \"جدة\",\n   \"مكة المكرمة\",\n   \"الدمام\"\n  ],\n  \"answer\": \"الرياض\"\n },\n {\n  \"level\": \"easy\",\n  \"cat\": \"general\",\n  \"q\": \"كم عدد أصابع اليد الواحدة؟\",\n  \"options\": [\n   \"4\",\n   \"5\",\n   \"6\",\n   \"10\"\n  ],\n  \"answer\": \"5\"\n },\n {\n  \"level\": \"easy\",\n  \"cat\": \"general\",\n  \"q\": \"أي حيوان له خرطوم طويل؟\",\n  \"options\": [\n   \"الفيل\",\n   \"الزرافة\",\n   \"الحصان\",\n   \"الجمل\"\n  ],\n  \"answer\": \"الفيل\"\n },\n {\n  \"level\": \"easy\",\n  \"cat\": \"general\",\n  \"q\": \"في أي فصل يتساقط الثلج غالباً؟\",\n  \"options\": [\n   \"الشتاء\",\n   \"الصيف\",\n   \"الربيع\",\n   \"الخريف\"\n  ],\n  \"answer\": \"الشتاء\"\n },\n {\n  \"level\": \"easy\",\n  \"cat\": \"general\",\n  \"q\": \"ماذا تصنع النحلة؟\",\n  \"options\": [\n   \"العسل\",\n   \"الحليب\",\n   \"الحرير\",\n   \"الزيت\"\n  ],\n  \"answer\": \"العسل\"\n },\n {\n  \"level\": \"easy\",\n  \"cat\": \"general\",\n  \"q\": \"ما هي عاصمة الإمارات؟\",\n  \"options\": [\n   \"أبوظبي\",\n   \"دبي\",\n   \"الشارقة\",\n   \"العين\"\n  ],\n  \"answer\": \"أبوظبي\"\n },\n {\n  \"level\": \"easy\",\n  \"cat\": \"general\",\n  \"q\": \"كم عجلة في الدراجة الهوائية العادية؟\",\n  \"options\": [\n   \"1\",\n   \"2\",\n   \"3\",\n   \"4\"\n  ],\n  \"answer\": \"2\"\n },\n {\n  \"level\": \"easy\",\n  \"cat\": \"general\",\n  \"q\": \"بماذا نعرف الوقت؟\",\n  \"options\": [\n   \"الساعة\",\n   \"المسطرة\",\n   \"الميزان\",\n   \"البوصلة\"\n  ],\n  \"answer\": \"الساعة\"\n },\n {\n  \"level\": \"easy\",\n  \"cat\": \"general\",\n  \"q\": \"ما لون السماء في يوم صافٍ؟\",\n  \"options\": [\n   \"الأزرق\",\n   \"الأخضر\",\n   \"الأحمر\",\n   \"البني\"\n  ],\n  \"answer\": \"الأزرق\"\n },\n {\n  \"level\": \"easy\",\n  \"cat\": \"general\",\n  \"q\": \"أي واحد من هذه فاكهة؟\",\n  \"options\": [\n   \"التفاح\",\n   \"الجزر\",\n   \"البصل\",\n   \"البطاطس\"\n  ],\n  \"answer\": \"التفاح\"\n },\n {\n  \"level\": \"easy\",\n  \"cat\": \"general\",\n  \"q\": \"ما هي عاصمة البحرين؟\",\n  \"options\": [\n   \"المنامة\",\n   \"المحرق\",\n   \"الرفاع\",\n   \"مدينة عيسى\"\n  ],\n  \"answer\": \"المنامة\"\n },\n {\n  \"level\": \"medium\",\n  \"cat\": \"general\",\n  \"q\": \"ما هي عاصمة إسبانيا؟\",\n  \"options\": [\n   \"مدريد\",\n   \"برشلونة\",\n   \"إشبيلية\",\n   \"فالنسيا\"\n  ],\n  \"answer\": \"مدريد\"\n },\n {\n  \"level\": \"medium\",\n  \"cat\": \"general\",\n  \"q\": \"كم لاعباً لفريق كرة اليد داخل الملعب؟\",\n  \"options\": [\n   \"6\",\n   \"7\",\n   \"8\",\n   \"9\"\n  ],\n  \"answer\": \"7\"\n },\n {\n  \"level\": \"medium\",\n  \"cat\": \"general\",\n  \"q\": \"ما هي أكبر قارة في العالم مساحةً؟\",\n  \"options\": [\n   \"آسيا\",\n   \"أفريقيا\",\n   \"أوروبا\",\n   \"أمريكا الشمالية\"\n  ],\n  \"answer\": \"آسيا\"\n },\n {\n  \"level\": \"medium\",\n  \"cat\": \"general\",\n  \"q\": \"من هو أول الخلفاء الراشدين؟\",\n  \"options\": [\n   \"أبو بكر الصديق\",\n   \"عمر بن الخطاب\",\n   \"عثمان بن عفان\",\n   \"علي بن أبي طالب\"\n  ],\n  \"answer\": \"أبو بكر الصديق\"\n },\n {\n  \"level\": \"medium\",\n  \"cat\": \"general\",\n  \"q\": \"كم عدد كواكب المجموعة الشمسية؟\",\n  \"options\": [\n   \"7\",\n   \"8\",\n   \"9\",\n   \"10\"\n  ],\n  \"answer\": \"8\"\n },\n {\n  \"level\": \"medium\",\n  \"cat\": \"general\",\n  \"q\": \"أي عنصر كيميائي رمزه O؟\",\n  \"options\": [\n   \"الأكسجين\",\n   \"الذهب\",\n   \"الحديد\",\n   \"الصوديوم\"\n  ],\n  \"answer\": \"الأكسجين\"\n },\n {\n  \"level\": \"medium\",\n  \"cat\": \"general\",\n  \"q\": \"ما هي عاصمة المغرب؟\",\n  \"options\": [\n   \"الرباط\",\n   \"الدار البيضاء\",\n   \"مراكش\",\n   \"فاس\"\n  ],\n  \"answer\": \"الرباط\"\n },\n {\n  \"level\": \"medium\",\n  \"cat\": \"general\",\n  \"q\": \"كم عدد أسنان الإنسان البالغ عادةً؟\",\n  \"options\": [\n   \"28\",\n   \"30\",\n   \"32\",\n   \"36\"\n  ],\n  \"answer\": \"32\"\n },\n {\n  \"level\": \"medium\",\n  \"cat\": \"general\",\n  \"q\": \"ما هو أطول جدار بناه الإنسان؟\",\n  \"options\": [\n   \"سور الصين العظيم\",\n   \"جدار برلين\",\n   \"سور هادريان\",\n   \"سور القسطنطينية\"\n  ],\n  \"answer\": \"سور الصين العظيم\"\n },\n {\n  \"level\": \"medium\",\n  \"cat\": \"general\",\n  \"q\": \"في أي قارة تقع البرازيل؟\",\n  \"options\": [\n   \"أمريكا الجنوبية\",\n   \"أفريقيا\",\n   \"أمريكا الشمالية\",\n   \"أوروبا\"\n  ],\n  \"answer\": \"أمريكا الجنوبية\"\n },\n {\n  \"level\": \"medium\",\n  \"cat\": \"general\",\n  \"q\": \"ما هو الحيوان الثديي الوحيد اللي يطير طيراناً حقيقياً؟\",\n  \"options\": [\n   \"الخفاش\",\n   \"السنجاب الطائر\",\n   \"النعامة\",\n   \"البطريق\"\n  ],\n  \"answer\": \"الخفاش\"\n },\n {\n  \"level\": \"medium\",\n  \"cat\": \"general\",\n  \"q\": \"ما هو أول مسجد بُني في الإسلام؟\",\n  \"options\": [\n   \"مسجد قباء\",\n   \"المسجد النبوي\",\n   \"مسجد القبلتين\",\n   \"المسجد الأقصى\"\n  ],\n  \"answer\": \"مسجد قباء\"\n },\n {\n  \"level\": \"medium\",\n  \"cat\": \"general\",\n  \"q\": \"ما هي أصلب مادة طبيعية؟\",\n  \"options\": [\n   \"الألماس\",\n   \"الحديد\",\n   \"الكوارتز\",\n   \"الياقوت\"\n  ],\n  \"answer\": \"الألماس\"\n },\n {\n  \"level\": \"medium\",\n  \"cat\": \"general\",\n  \"q\": \"من رسم لوحة الموناليزا؟\",\n  \"options\": [\n   \"ليوناردو دافنشي\",\n   \"بيكاسو\",\n   \"فان غوخ\",\n   \"مايكل أنجلو\"\n  ],\n  \"answer\": \"ليوناردو دافنشي\"\n },\n {\n  \"level\": \"medium\",\n  \"cat\": \"general\",\n  \"q\": \"ما هي عاصمة اليونان؟\",\n  \"options\": [\n   \"أثينا\",\n   \"إسبرطة\",\n   \"سالونيك\",\n   \"كريت\"\n  ],\n  \"answer\": \"أثينا\"\n },\n {\n  \"level\": \"hard\",\n  \"cat\": \"general\",\n  \"q\": \"ما هي أكبر جزيرة في العالم؟\",\n  \"options\": [\n   \"غرينلاند\",\n   \"غينيا الجديدة\",\n   \"بورنيو\",\n   \"مدغشقر\"\n  ],\n  \"answer\": \"غرينلاند\"\n },\n {\n  \"level\": \"hard\",\n  \"cat\": \"general\",\n  \"q\": \"ما هي عاصمة كازاخستان؟\",\n  \"options\": [\n   \"أستانا\",\n   \"ألماتي\",\n   \"بيشكك\",\n   \"طشقند\"\n  ],\n  \"answer\": \"أستانا\"\n },\n {\n  \"level\": \"hard\",\n  \"cat\": \"general\",\n  \"q\": \"كم سنة استمرت «حرب المئة عام» فعلياً؟\",\n  \"options\": [\n   \"100\",\n   \"99\",\n   \"116\",\n   \"120\"\n  ],\n  \"answer\": \"116\"\n },\n {\n  \"level\": \"hard\",\n  \"cat\": \"general\",\n  \"q\": \"في أي سنة هبط الإنسان على سطح القمر لأول مرة؟\",\n  \"options\": [\n   \"1965\",\n   \"1969\",\n   \"1972\",\n   \"1975\"\n  ],\n  \"answer\": \"1969\"\n },\n {\n  \"level\": \"hard\",\n  \"cat\": \"general\",\n  \"q\": \"ما هي أطول سلسلة جبال على اليابسة في العالم؟\",\n  \"options\": [\n   \"جبال الأنديز\",\n   \"جبال الهيمالايا\",\n   \"جبال روكي\",\n   \"جبال الألب\"\n  ],\n  \"answer\": \"جبال الأنديز\"\n },\n {\n  \"level\": \"hard\",\n  \"cat\": \"general\",\n  \"q\": \"ما هي أصغر دولة في العالم مساحةً؟\",\n  \"options\": [\n   \"الفاتيكان\",\n   \"موناكو\",\n   \"سان مارينو\",\n   \"مالطا\"\n  ],\n  \"answer\": \"الفاتيكان\"\n },\n {\n  \"level\": \"hard\",\n  \"cat\": \"general\",\n  \"q\": \"كم عدد الدول الأعضاء في جامعة الدول العربية؟\",\n  \"options\": [\n   \"20\",\n   \"21\",\n   \"22\",\n   \"23\"\n  ],\n  \"answer\": \"22\"\n },\n {\n  \"level\": \"hard\",\n  \"cat\": \"general\",\n  \"q\": \"من هو العالم المسلم الذي يُنسب إليه علم الجبر؟\",\n  \"options\": [\n   \"الخوارزمي\",\n   \"ابن سينا\",\n   \"البيروني\",\n   \"جابر بن حيان\"\n  ],\n  \"answer\": \"الخوارزمي\"\n },\n {\n  \"level\": \"hard\",\n  \"cat\": \"general\",\n  \"q\": \"ما هي عاصمة البرازيل؟\",\n  \"options\": [\n   \"برازيليا\",\n   \"ريو دي جانيرو\",\n   \"ساو باولو\",\n   \"سلفادور\"\n  ],\n  \"answer\": \"برازيليا\"\n },\n {\n  \"level\": \"hard\",\n  \"cat\": \"general\",\n  \"q\": \"ما هو أسرع سمكة في البحر؟\",\n  \"options\": [\n   \"سمكة أبو شراع\",\n   \"القرش الأبيض\",\n   \"التونة\",\n   \"الباراكودا\"\n  ],\n  \"answer\": \"سمكة أبو شراع\"\n },\n {\n  \"level\": \"hard\",\n  \"cat\": \"general\",\n  \"q\": \"في أي سنة تأسس مجلس التعاون الخليجي؟\",\n  \"options\": [\n   \"1971\",\n   \"1975\",\n   \"1981\",\n   \"1991\"\n  ],\n  \"answer\": \"1981\"\n },\n {\n  \"level\": \"hard\",\n  \"cat\": \"general\",\n  \"q\": \"ما هو أبعد كوكب عن الشمس في المجموعة الشمسية؟\",\n  \"options\": [\n   \"نبتون\",\n   \"أورانوس\",\n   \"بلوتو\",\n   \"زحل\"\n  ],\n  \"answer\": \"نبتون\"\n },\n {\n  \"level\": \"hard\",\n  \"cat\": \"general\",\n  \"q\": \"ما هي أكثر لغة يتكلمها الناس كلغة أم في العالم؟\",\n  \"options\": [\n   \"الصينية (الماندرين)\",\n   \"الإنجليزية\",\n   \"الإسبانية\",\n   \"الهندية\"\n  ],\n  \"answer\": \"الصينية (الماندرين)\"\n },\n {\n  \"level\": \"hard\",\n  \"cat\": \"general\",\n  \"q\": \"ما هو أكثر عنصر وفرةً في الكون؟\",\n  \"options\": [\n   \"الهيدروجين\",\n   \"الهيليوم\",\n   \"الأكسجين\",\n   \"الكربون\"\n  ],\n  \"answer\": \"الهيدروجين\"\n },\n {\n  \"level\": \"hard\",\n  \"cat\": \"general\",\n  \"q\": \"من هو القائد الذي عبر إلى الأندلس وفتحها سنة 711م؟\",\n  \"options\": [\n   \"طارق بن زياد\",\n   \"صلاح الدين الأيوبي\",\n   \"خالد بن الوليد\",\n   \"عقبة بن نافع\"\n  ],\n  \"answer\": \"طارق بن زياد\"\n },\n {\n  \"level\": \"easy\",\n  \"cat\": \"proverb\",\n  \"q\": \"كمّل المثل: «الصبر مفتاح …»\",\n  \"options\": [\n   \"الفرج\",\n   \"الباب\",\n   \"النجاح\",\n   \"الخير\"\n  ],\n  \"answer\": \"الفرج\"\n },\n {\n  \"level\": \"easy\",\n  \"cat\": \"proverb\",\n  \"q\": \"كمّل المثل: «الوقت كالسيف إن لم تقطعه …»\",\n  \"options\": [\n   \"قطعك\",\n   \"ضاع\",\n   \"هرب\",\n   \"سبقك\"\n  ],\n  \"answer\": \"قطعك\"\n },\n {\n  \"level\": \"easy\",\n  \"cat\": \"proverb\",\n  \"q\": \"كمّل المثل: «في التأني السلامة وفي العجلة …»\",\n  \"options\": [\n   \"الندامة\",\n   \"الخسارة\",\n   \"التعب\",\n   \"الضياع\"\n  ],\n  \"answer\": \"الندامة\"\n },\n {\n  \"level\": \"easy\",\n  \"cat\": \"proverb\",\n  \"q\": \"كمّل المثل: «الجار قبل …»\",\n  \"options\": [\n   \"الدار\",\n   \"الطريق\",\n   \"الأهل\",\n   \"الصديق\"\n  ],\n  \"answer\": \"الدار\"\n },\n {\n  \"level\": \"easy\",\n  \"cat\": \"proverb\",\n  \"q\": \"كمّل المثل: «من جدّ …»\",\n  \"options\": [\n   \"وجد\",\n   \"نجح\",\n   \"فاز\",\n   \"ربح\"\n  ],\n  \"answer\": \"وجد\"\n },\n {\n  \"level\": \"medium\",\n  \"cat\": \"proverb\",\n  \"q\": \"كمّل المثل: «اطلبوا العلم من المهد إلى …»\",\n  \"options\": [\n   \"اللحد\",\n   \"الكبر\",\n   \"المدرسة\",\n   \"الشباب\"\n  ],\n  \"answer\": \"اللحد\"\n },\n {\n  \"level\": \"medium\",\n  \"cat\": \"proverb\",\n  \"q\": \"كمّل المثل: «القرد في عين أمه …»\",\n  \"options\": [\n   \"غزال\",\n   \"أسد\",\n   \"قمر\",\n   \"وردة\"\n  ],\n  \"answer\": \"غزال\"\n },\n {\n  \"level\": \"medium\",\n  \"cat\": \"proverb\",\n  \"q\": \"كمّل المثل: «اللي ما يعرف الصقر …»\",\n  \"options\": [\n   \"يشويه\",\n   \"يطيّره\",\n   \"يبيعه\",\n   \"يتركه\"\n  ],\n  \"answer\": \"يشويه\"\n },\n {\n  \"level\": \"medium\",\n  \"cat\": \"proverb\",\n  \"q\": \"كمّل المثل: «كل إناء بما فيه …»\",\n  \"options\": [\n   \"ينضح\",\n   \"يفيض\",\n   \"يمتلئ\",\n   \"يظهر\"\n  ],\n  \"answer\": \"ينضح\"\n },\n {\n  \"level\": \"medium\",\n  \"cat\": \"proverb\",\n  \"q\": \"كمّل المثل: «رب أخ لك لم …»\",\n  \"options\": [\n   \"تلده أمك\",\n   \"تعرفه\",\n   \"تره\",\n   \"يزرك\"\n  ],\n  \"answer\": \"تلده أمك\"\n },\n {\n  \"level\": \"hard\",\n  \"cat\": \"proverb\",\n  \"q\": \"كمّل المثل: «إن كنت ريحاً فقد لاقيت …»\",\n  \"options\": [\n   \"إعصاراً\",\n   \"جبلاً\",\n   \"بحراً\",\n   \"سداً\"\n  ],\n  \"answer\": \"إعصاراً\"\n },\n {\n  \"level\": \"hard\",\n  \"cat\": \"proverb\",\n  \"q\": \"كمّل المثل: «جزاء …»\",\n  \"options\": [\n   \"سنمار\",\n   \"حاتم\",\n   \"عنترة\",\n   \"قيس\"\n  ],\n  \"answer\": \"سنمار\"\n },\n {\n  \"level\": \"hard\",\n  \"cat\": \"proverb\",\n  \"q\": \"كمّل المثل: «رجع بخفّي …»\",\n  \"options\": [\n   \"حنين\",\n   \"جحا\",\n   \"عنترة\",\n   \"حاتم\"\n  ],\n  \"answer\": \"حنين\"\n },\n {\n  \"level\": \"hard\",\n  \"cat\": \"proverb\",\n  \"q\": \"كمّل المثل: «سبق السيف …»\",\n  \"options\": [\n   \"العذل\",\n   \"القول\",\n   \"الحق\",\n   \"الوعد\"\n  ],\n  \"answer\": \"العذل\"\n },\n {\n  \"level\": \"hard\",\n  \"cat\": \"proverb\",\n  \"q\": \"كمّل المثل: «يداك أوكتا وفوك …»\",\n  \"options\": [\n   \"نفخ\",\n   \"قال\",\n   \"أكل\",\n   \"صاح\"\n  ],\n  \"answer\": \"نفخ\"\n },\n {\n  \"level\": \"easy\",\n  \"cat\": \"riddle\",\n  \"q\": \"شيء كل ما أخذت منه يكبر، وش هو؟\",\n  \"options\": [\n   \"الحفرة\",\n   \"البالون\",\n   \"الشجرة\",\n   \"الكيكة\"\n  ],\n  \"answer\": \"الحفرة\"\n },\n {\n  \"level\": \"easy\",\n  \"cat\": \"riddle\",\n  \"q\": \"له أسنان بس ما يعض، وش هو؟\",\n  \"options\": [\n   \"المشط\",\n   \"القطو\",\n   \"الكلب\",\n   \"السمكة\"\n  ],\n  \"answer\": \"المشط\"\n },\n {\n  \"level\": \"easy\",\n  \"cat\": \"riddle\",\n  \"q\": \"يمشي بلا رجول ويبكي بلا عيون، وش هو؟\",\n  \"options\": [\n   \"السحاب\",\n   \"النهر\",\n   \"الساعة\",\n   \"الريح\"\n  ],\n  \"answer\": \"السحاب\"\n },\n {\n  \"level\": \"easy\",\n  \"cat\": \"riddle\",\n  \"q\": \"له عين وحدة وما يشوف، وش هو؟\",\n  \"options\": [\n   \"الإبرة\",\n   \"القلم\",\n   \"المفتاح\",\n   \"الكرسي\"\n  ],\n  \"answer\": \"الإبرة\"\n },\n {\n  \"level\": \"easy\",\n  \"cat\": \"riddle\",\n  \"q\": \"شيء تقطّعه وتبكي عليه، وش هو؟\",\n  \"options\": [\n   \"البصل\",\n   \"الخروف\",\n   \"الدجاج\",\n   \"الطماط\"\n  ],\n  \"answer\": \"البصل\"\n },\n {\n  \"level\": \"medium\",\n  \"cat\": \"riddle\",\n  \"q\": \"يكتب وما يقرأ، وش هو؟\",\n  \"options\": [\n   \"القلم\",\n   \"الكتاب\",\n   \"المعلم\",\n   \"الطالب\"\n  ],\n  \"answer\": \"القلم\"\n },\n {\n  \"level\": \"medium\",\n  \"cat\": \"riddle\",\n  \"q\": \"شيء كل ما زاد نقص، وش هو؟\",\n  \"options\": [\n   \"العمر\",\n   \"المال\",\n   \"الماي\",\n   \"الأكل\"\n  ],\n  \"answer\": \"العمر\"\n },\n {\n  \"level\": \"medium\",\n  \"cat\": \"riddle\",\n  \"q\": \"بيت ما له أبواب ولا شبابيك، وش هو؟\",\n  \"options\": [\n   \"البيضة\",\n   \"الصندوق\",\n   \"الكهف\",\n   \"الخيمة\"\n  ],\n  \"answer\": \"البيضة\"\n },\n {\n  \"level\": \"medium\",\n  \"cat\": \"riddle\",\n  \"q\": \"يشيل أثقال كبيرة بس ما يقدر يشيل مسمار، وش هو؟\",\n  \"options\": [\n   \"البحر\",\n   \"الرافعة\",\n   \"الفيل\",\n   \"الريح\"\n  ],\n  \"answer\": \"البحر\"\n },\n {\n  \"level\": \"medium\",\n  \"cat\": \"riddle\",\n  \"q\": \"له رقبة وما له راس، وش هو؟\",\n  \"options\": [\n   \"الزجاجة\",\n   \"الزرافة\",\n   \"الطاولة\",\n   \"البطة\"\n  ],\n  \"answer\": \"الزجاجة\"\n },\n {\n  \"level\": \"hard\",\n  \"cat\": \"riddle\",\n  \"q\": \"تشوفه في «الليل» ثلاث مرات وفي «النهار» مرة وحدة، وش هو؟\",\n  \"options\": [\n   \"حرف اللام\",\n   \"القمر\",\n   \"النجوم\",\n   \"الظل\"\n  ],\n  \"answer\": \"حرف اللام\"\n },\n {\n  \"level\": \"hard\",\n  \"cat\": \"riddle\",\n  \"q\": \"يتكلم كل لغات العالم، وش هو؟\",\n  \"options\": [\n   \"الصدى\",\n   \"المترجم\",\n   \"الكتاب\",\n   \"الراديو\"\n  ],\n  \"answer\": \"الصدى\"\n },\n {\n  \"level\": \"hard\",\n  \"cat\": \"riddle\",\n  \"q\": \"أخت خالك وما هي خالتك، منو؟\",\n  \"options\": [\n   \"أمك\",\n   \"عمتك\",\n   \"جدتك\",\n   \"أختك\"\n  ],\n  \"answer\": \"أمك\"\n },\n {\n  \"level\": \"hard\",\n  \"cat\": \"riddle\",\n  \"q\": \"إذا لمسته صاح، وش هو؟\",\n  \"options\": [\n   \"الجرس\",\n   \"الطفل\",\n   \"القطو\",\n   \"التلفون\"\n  ],\n  \"answer\": \"الجرس\"\n },\n {\n  \"level\": \"hard\",\n  \"cat\": \"riddle\",\n  \"q\": \"موجود في «القرن» مرة وفي «الدقيقة» مرتين وما هو موجود في «الساعة»، وش هو؟\",\n  \"options\": [\n   \"حرف القاف\",\n   \"الثانية\",\n   \"الوقت\",\n   \"الصفر\"\n  ],\n  \"answer\": \"حرف القاف\"\n }\n]"};
const __QR_MODS = {
  "QR8bitByte": function (module, exports, require) {
var QRMode = require('./QRMode');

function QR8bitByte(data) {
	this.mode = QRMode.MODE_8BIT_BYTE;
	this.data = data;
}

QR8bitByte.prototype = {

	getLength : function() {
		return this.data.length;
	},
	
	write : function(buffer) {
		for (var i = 0; i < this.data.length; i++) {
			// not JIS ...
			buffer.put(this.data.charCodeAt(i), 8);
		}
	}
};

module.exports = QR8bitByte;

  },
  "QRBitBuffer": function (module, exports, require) {
function QRBitBuffer() {
	this.buffer = [];
	this.length = 0;
}

QRBitBuffer.prototype = {

	get : function(index) {
		var bufIndex = Math.floor(index / 8);
		return ( (this.buffer[bufIndex] >>> (7 - index % 8) ) & 1) == 1;
	},
	
	put : function(num, length) {
		for (var i = 0; i < length; i++) {
			this.putBit( ( (num >>> (length - i - 1) ) & 1) == 1);
		}
	},
	
	getLengthInBits : function() {
		return this.length;
	},
	
	putBit : function(bit) {
	
		var bufIndex = Math.floor(this.length / 8);
		if (this.buffer.length <= bufIndex) {
			this.buffer.push(0);
		}
	
		if (bit) {
			this.buffer[bufIndex] |= (0x80 >>> (this.length % 8) );
		}
	
		this.length++;
	}
};

module.exports = QRBitBuffer;

  },
  "QRErrorCorrectLevel": function (module, exports, require) {
module.exports = {
	L : 1,
	M : 0,
	Q : 3,
	H : 2
};


  },
  "QRMaskPattern": function (module, exports, require) {
module.exports = {
	PATTERN000 : 0,
	PATTERN001 : 1,
	PATTERN010 : 2,
	PATTERN011 : 3,
	PATTERN100 : 4,
	PATTERN101 : 5,
	PATTERN110 : 6,
	PATTERN111 : 7
};

  },
  "QRMath": function (module, exports, require) {
var QRMath = {

	glog : function(n) {
	
		if (n < 1) {
			throw new Error("glog(" + n + ")");
		}
		
		return QRMath.LOG_TABLE[n];
	},
	
	gexp : function(n) {
	
		while (n < 0) {
			n += 255;
		}
	
		while (n >= 256) {
			n -= 255;
		}
	
		return QRMath.EXP_TABLE[n];
	},
	
	EXP_TABLE : new Array(256),
	
	LOG_TABLE : new Array(256)

};
	
for (var i = 0; i < 8; i++) {
	QRMath.EXP_TABLE[i] = 1 << i;
}
for (var i = 8; i < 256; i++) {
	QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4]
		^ QRMath.EXP_TABLE[i - 5]
		^ QRMath.EXP_TABLE[i - 6]
		^ QRMath.EXP_TABLE[i - 8];
}
for (var i = 0; i < 255; i++) {
	QRMath.LOG_TABLE[QRMath.EXP_TABLE[i] ] = i;
}

module.exports = QRMath;

  },
  "QRMode": function (module, exports, require) {
module.exports = {
    MODE_NUMBER :       1 << 0,
    MODE_ALPHA_NUM :    1 << 1,
    MODE_8BIT_BYTE :    1 << 2,
    MODE_KANJI :        1 << 3
};

  },
  "QRPolynomial": function (module, exports, require) {
var QRMath = require('./QRMath');

function QRPolynomial(num, shift) {
	if (num.length === undefined) {
		throw new Error(num.length + "/" + shift);
	}

	var offset = 0;

	while (offset < num.length && num[offset] === 0) {
		offset++;
	}

	this.num = new Array(num.length - offset + shift);
	for (var i = 0; i < num.length - offset; i++) {
		this.num[i] = num[i + offset];
	}
}

QRPolynomial.prototype = {

	get : function(index) {
		return this.num[index];
	},
	
	getLength : function() {
		return this.num.length;
	},
	
	multiply : function(e) {
	
		var num = new Array(this.getLength() + e.getLength() - 1);
	
		for (var i = 0; i < this.getLength(); i++) {
			for (var j = 0; j < e.getLength(); j++) {
				num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i) ) + QRMath.glog(e.get(j) ) );
			}
		}
	
		return new QRPolynomial(num, 0);
	},
	
	mod : function(e) {
	
		if (this.getLength() - e.getLength() < 0) {
			return this;
		}
	
		var ratio = QRMath.glog(this.get(0) ) - QRMath.glog(e.get(0) );
	
		var num = new Array(this.getLength() );
		
		for (var i = 0; i < this.getLength(); i++) {
			num[i] = this.get(i);
		}
		
		for (var x = 0; x < e.getLength(); x++) {
			num[x] ^= QRMath.gexp(QRMath.glog(e.get(x) ) + ratio);
		}
	
		// recursive call
		return new QRPolynomial(num, 0).mod(e);
	}
};

module.exports = QRPolynomial;

  },
  "QRRSBlock": function (module, exports, require) {
var QRErrorCorrectLevel = require('./QRErrorCorrectLevel');

function QRRSBlock(totalCount, dataCount) {
	this.totalCount = totalCount;
	this.dataCount  = dataCount;
}

QRRSBlock.RS_BLOCK_TABLE = [

	// L
	// M
	// Q
	// H

	// 1
	[1, 26, 19],
	[1, 26, 16],
	[1, 26, 13],
	[1, 26, 9],
	
	// 2
	[1, 44, 34],
	[1, 44, 28],
	[1, 44, 22],
	[1, 44, 16],

	// 3
	[1, 70, 55],
	[1, 70, 44],
	[2, 35, 17],
	[2, 35, 13],

	// 4		
	[1, 100, 80],
	[2, 50, 32],
	[2, 50, 24],
	[4, 25, 9],
	
	// 5
	[1, 134, 108],
	[2, 67, 43],
	[2, 33, 15, 2, 34, 16],
	[2, 33, 11, 2, 34, 12],
	
	// 6
	[2, 86, 68],
	[4, 43, 27],
	[4, 43, 19],
	[4, 43, 15],
	
	// 7		
	[2, 98, 78],
	[4, 49, 31],
	[2, 32, 14, 4, 33, 15],
	[4, 39, 13, 1, 40, 14],
	
	// 8
	[2, 121, 97],
	[2, 60, 38, 2, 61, 39],
	[4, 40, 18, 2, 41, 19],
	[4, 40, 14, 2, 41, 15],
	
	// 9
	[2, 146, 116],
	[3, 58, 36, 2, 59, 37],
	[4, 36, 16, 4, 37, 17],
	[4, 36, 12, 4, 37, 13],
	
	// 10		
	[2, 86, 68, 2, 87, 69],
	[4, 69, 43, 1, 70, 44],
	[6, 43, 19, 2, 44, 20],
	[6, 43, 15, 2, 44, 16],

	// 11
	[4, 101, 81],
	[1, 80, 50, 4, 81, 51],
	[4, 50, 22, 4, 51, 23],
	[3, 36, 12, 8, 37, 13],

	// 12
	[2, 116, 92, 2, 117, 93],
	[6, 58, 36, 2, 59, 37],
	[4, 46, 20, 6, 47, 21],
	[7, 42, 14, 4, 43, 15],

	// 13
	[4, 133, 107],
	[8, 59, 37, 1, 60, 38],
	[8, 44, 20, 4, 45, 21],
	[12, 33, 11, 4, 34, 12],

	// 14
	[3, 145, 115, 1, 146, 116],
	[4, 64, 40, 5, 65, 41],
	[11, 36, 16, 5, 37, 17],
	[11, 36, 12, 5, 37, 13],

	// 15
	[5, 109, 87, 1, 110, 88],
	[5, 65, 41, 5, 66, 42],
	[5, 54, 24, 7, 55, 25],
	[11, 36, 12],

	// 16
	[5, 122, 98, 1, 123, 99],
	[7, 73, 45, 3, 74, 46],
	[15, 43, 19, 2, 44, 20],
	[3, 45, 15, 13, 46, 16],

	// 17
	[1, 135, 107, 5, 136, 108],
	[10, 74, 46, 1, 75, 47],
	[1, 50, 22, 15, 51, 23],
	[2, 42, 14, 17, 43, 15],

	// 18
	[5, 150, 120, 1, 151, 121],
	[9, 69, 43, 4, 70, 44],
	[17, 50, 22, 1, 51, 23],
	[2, 42, 14, 19, 43, 15],

	// 19
	[3, 141, 113, 4, 142, 114],
	[3, 70, 44, 11, 71, 45],
	[17, 47, 21, 4, 48, 22],
	[9, 39, 13, 16, 40, 14],

	// 20
	[3, 135, 107, 5, 136, 108],
	[3, 67, 41, 13, 68, 42],
	[15, 54, 24, 5, 55, 25],
	[15, 43, 15, 10, 44, 16],

	// 21
	[4, 144, 116, 4, 145, 117],
	[17, 68, 42],
	[17, 50, 22, 6, 51, 23],
	[19, 46, 16, 6, 47, 17],

	// 22
	[2, 139, 111, 7, 140, 112],
	[17, 74, 46],
	[7, 54, 24, 16, 55, 25],
	[34, 37, 13],

	// 23
	[4, 151, 121, 5, 152, 122],
	[4, 75, 47, 14, 76, 48],
	[11, 54, 24, 14, 55, 25],
	[16, 45, 15, 14, 46, 16],

	// 24
	[6, 147, 117, 4, 148, 118],
	[6, 73, 45, 14, 74, 46],
	[11, 54, 24, 16, 55, 25],
	[30, 46, 16, 2, 47, 17],

	// 25
	[8, 132, 106, 4, 133, 107],
	[8, 75, 47, 13, 76, 48],
	[7, 54, 24, 22, 55, 25],
	[22, 45, 15, 13, 46, 16],

	// 26
	[10, 142, 114, 2, 143, 115],
	[19, 74, 46, 4, 75, 47],
	[28, 50, 22, 6, 51, 23],
	[33, 46, 16, 4, 47, 17],

	// 27
	[8, 152, 122, 4, 153, 123],
	[22, 73, 45, 3, 74, 46],
	[8, 53, 23, 26, 54, 24],
	[12, 45, 15, 28, 46, 16],

	// 28
	[3, 147, 117, 10, 148, 118],
	[3, 73, 45, 23, 74, 46],
	[4, 54, 24, 31, 55, 25],
	[11, 45, 15, 31, 46, 16],

	// 29
	[7, 146, 116, 7, 147, 117],
	[21, 73, 45, 7, 74, 46],
	[1, 53, 23, 37, 54, 24],
	[19, 45, 15, 26, 46, 16],

	// 30
	[5, 145, 115, 10, 146, 116],
	[19, 75, 47, 10, 76, 48],
	[15, 54, 24, 25, 55, 25],
	[23, 45, 15, 25, 46, 16],

	// 31
	[13, 145, 115, 3, 146, 116],
	[2, 74, 46, 29, 75, 47],
	[42, 54, 24, 1, 55, 25],
	[23, 45, 15, 28, 46, 16],

	// 32
	[17, 145, 115],
	[10, 74, 46, 23, 75, 47],
	[10, 54, 24, 35, 55, 25],
	[19, 45, 15, 35, 46, 16],

	// 33
	[17, 145, 115, 1, 146, 116],
	[14, 74, 46, 21, 75, 47],
	[29, 54, 24, 19, 55, 25],
	[11, 45, 15, 46, 46, 16],

	// 34
	[13, 145, 115, 6, 146, 116],
	[14, 74, 46, 23, 75, 47],
	[44, 54, 24, 7, 55, 25],
	[59, 46, 16, 1, 47, 17],

	// 35
	[12, 151, 121, 7, 152, 122],
	[12, 75, 47, 26, 76, 48],
	[39, 54, 24, 14, 55, 25],
	[22, 45, 15, 41, 46, 16],

	// 36
	[6, 151, 121, 14, 152, 122],
	[6, 75, 47, 34, 76, 48],
	[46, 54, 24, 10, 55, 25],
	[2, 45, 15, 64, 46, 16],

	// 37
	[17, 152, 122, 4, 153, 123],
	[29, 74, 46, 14, 75, 47],
	[49, 54, 24, 10, 55, 25],
	[24, 45, 15, 46, 46, 16],

	// 38
	[4, 152, 122, 18, 153, 123],
	[13, 74, 46, 32, 75, 47],
	[48, 54, 24, 14, 55, 25],
	[42, 45, 15, 32, 46, 16],

	// 39
	[20, 147, 117, 4, 148, 118],
	[40, 75, 47, 7, 76, 48],
	[43, 54, 24, 22, 55, 25],
	[10, 45, 15, 67, 46, 16],

	// 40
	[19, 148, 118, 6, 149, 119],
	[18, 75, 47, 31, 76, 48],
	[34, 54, 24, 34, 55, 25],
	[20, 45, 15, 61, 46, 16]
];

QRRSBlock.getRSBlocks = function(typeNumber, errorCorrectLevel) {
	
	var rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
	
	if (rsBlock === undefined) {
		throw new Error("bad rs block @ typeNumber:" + typeNumber + "/errorCorrectLevel:" + errorCorrectLevel);
	}

	var length = rsBlock.length / 3;
	
	var list = [];
	
	for (var i = 0; i < length; i++) {

		var count = rsBlock[i * 3 + 0];
		var totalCount = rsBlock[i * 3 + 1];
		var dataCount  = rsBlock[i * 3 + 2];

		for (var j = 0; j < count; j++) {
			list.push(new QRRSBlock(totalCount, dataCount) );	
		}
	}
	
	return list;
};

QRRSBlock.getRsBlockTable = function(typeNumber, errorCorrectLevel) {

	switch(errorCorrectLevel) {
	case QRErrorCorrectLevel.L :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
	case QRErrorCorrectLevel.M :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
	case QRErrorCorrectLevel.Q :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
	case QRErrorCorrectLevel.H :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
	default :
		return undefined;
	}
};

module.exports = QRRSBlock;

  },
  "QRUtil": function (module, exports, require) {
var QRMode = require('./QRMode');
var QRPolynomial = require('./QRPolynomial');
var QRMath = require('./QRMath');
var QRMaskPattern = require('./QRMaskPattern');

var QRUtil = {

    PATTERN_POSITION_TABLE : [
        [],
        [6, 18],
        [6, 22],
        [6, 26],
        [6, 30],
        [6, 34],
        [6, 22, 38],
        [6, 24, 42],
        [6, 26, 46],
        [6, 28, 50],
        [6, 30, 54],        
        [6, 32, 58],
        [6, 34, 62],
        [6, 26, 46, 66],
        [6, 26, 48, 70],
        [6, 26, 50, 74],
        [6, 30, 54, 78],
        [6, 30, 56, 82],
        [6, 30, 58, 86],
        [6, 34, 62, 90],
        [6, 28, 50, 72, 94],
        [6, 26, 50, 74, 98],
        [6, 30, 54, 78, 102],
        [6, 28, 54, 80, 106],
        [6, 32, 58, 84, 110],
        [6, 30, 58, 86, 114],
        [6, 34, 62, 90, 118],
        [6, 26, 50, 74, 98, 122],
        [6, 30, 54, 78, 102, 126],
        [6, 26, 52, 78, 104, 130],
        [6, 30, 56, 82, 108, 134],
        [6, 34, 60, 86, 112, 138],
        [6, 30, 58, 86, 114, 142],
        [6, 34, 62, 90, 118, 146],
        [6, 30, 54, 78, 102, 126, 150],
        [6, 24, 50, 76, 102, 128, 154],
        [6, 28, 54, 80, 106, 132, 158],
        [6, 32, 58, 84, 110, 136, 162],
        [6, 26, 54, 82, 110, 138, 166],
        [6, 30, 58, 86, 114, 142, 170]
    ],

    G15 : (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0),
    G18 : (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0),
    G15_MASK : (1 << 14) | (1 << 12) | (1 << 10)    | (1 << 4) | (1 << 1),

    getBCHTypeInfo : function(data) {
        var d = data << 10;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
            d ^= (QRUtil.G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) ) );    
        }
        return ( (data << 10) | d) ^ QRUtil.G15_MASK;
    },

    getBCHTypeNumber : function(data) {
        var d = data << 12;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
            d ^= (QRUtil.G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) ) );    
        }
        return (data << 12) | d;
    },

    getBCHDigit : function(data) {

        var digit = 0;

        while (data !== 0) {
            digit++;
            data >>>= 1;
        }

        return digit;
    },

    getPatternPosition : function(typeNumber) {
        return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1];
    },

    getMask : function(maskPattern, i, j) {
        
        switch (maskPattern) {
            
        case QRMaskPattern.PATTERN000 : return (i + j) % 2 === 0;
        case QRMaskPattern.PATTERN001 : return i % 2 === 0;
        case QRMaskPattern.PATTERN010 : return j % 3 === 0;
        case QRMaskPattern.PATTERN011 : return (i + j) % 3 === 0;
        case QRMaskPattern.PATTERN100 : return (Math.floor(i / 2) + Math.floor(j / 3) ) % 2 === 0;
        case QRMaskPattern.PATTERN101 : return (i * j) % 2 + (i * j) % 3 === 0;
        case QRMaskPattern.PATTERN110 : return ( (i * j) % 2 + (i * j) % 3) % 2 === 0;
        case QRMaskPattern.PATTERN111 : return ( (i * j) % 3 + (i + j) % 2) % 2 === 0;

        default :
            throw new Error("bad maskPattern:" + maskPattern);
        }
    },

    getErrorCorrectPolynomial : function(errorCorrectLength) {

        var a = new QRPolynomial([1], 0);

        for (var i = 0; i < errorCorrectLength; i++) {
            a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0) );
        }

        return a;
    },

    getLengthInBits : function(mode, type) {

        if (1 <= type && type < 10) {

            // 1 - 9

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 10;
            case QRMode.MODE_ALPHA_NUM  : return 9;
            case QRMode.MODE_8BIT_BYTE  : return 8;
            case QRMode.MODE_KANJI      : return 8;
            default :
                throw new Error("mode:" + mode);
            }

        } else if (type < 27) {

            // 10 - 26

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 12;
            case QRMode.MODE_ALPHA_NUM  : return 11;
            case QRMode.MODE_8BIT_BYTE  : return 16;
            case QRMode.MODE_KANJI      : return 10;
            default :
                throw new Error("mode:" + mode);
            }

        } else if (type < 41) {

            // 27 - 40

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 14;
            case QRMode.MODE_ALPHA_NUM  : return 13;
            case QRMode.MODE_8BIT_BYTE  : return 16;
            case QRMode.MODE_KANJI      : return 12;
            default :
                throw new Error("mode:" + mode);
            }

        } else {
            throw new Error("type:" + type);
        }
    },

    getLostPoint : function(qrCode) {
        
        var moduleCount = qrCode.getModuleCount();
        var lostPoint = 0;
        var row = 0; 
        var col = 0;

        
        // LEVEL1
        
        for (row = 0; row < moduleCount; row++) {

            for (col = 0; col < moduleCount; col++) {

                var sameCount = 0;
                var dark = qrCode.isDark(row, col);

                for (var r = -1; r <= 1; r++) {

                    if (row + r < 0 || moduleCount <= row + r) {
                        continue;
                    }

                    for (var c = -1; c <= 1; c++) {

                        if (col + c < 0 || moduleCount <= col + c) {
                            continue;
                        }

                        if (r === 0 && c === 0) {
                            continue;
                        }

                        if (dark === qrCode.isDark(row + r, col + c) ) {
                            sameCount++;
                        }
                    }
                }

                if (sameCount > 5) {
                    lostPoint += (3 + sameCount - 5);
                }
            }
        }

        // LEVEL2

        for (row = 0; row < moduleCount - 1; row++) {
            for (col = 0; col < moduleCount - 1; col++) {
                var count = 0;
                if (qrCode.isDark(row,     col    ) ) count++;
                if (qrCode.isDark(row + 1, col    ) ) count++;
                if (qrCode.isDark(row,     col + 1) ) count++;
                if (qrCode.isDark(row + 1, col + 1) ) count++;
                if (count === 0 || count === 4) {
                    lostPoint += 3;
                }
            }
        }

        // LEVEL3

        for (row = 0; row < moduleCount; row++) {
            for (col = 0; col < moduleCount - 6; col++) {
                if (qrCode.isDark(row, col) && 
                        !qrCode.isDark(row, col + 1) && 
                         qrCode.isDark(row, col + 2) && 
                         qrCode.isDark(row, col + 3) && 
                         qrCode.isDark(row, col + 4) && 
                        !qrCode.isDark(row, col + 5) && 
                         qrCode.isDark(row, col + 6) ) {
                    lostPoint += 40;
                }
            }
        }

        for (col = 0; col < moduleCount; col++) {
            for (row = 0; row < moduleCount - 6; row++) {
                if (qrCode.isDark(row, col) &&
                        !qrCode.isDark(row + 1, col) &&
                         qrCode.isDark(row + 2, col) &&
                         qrCode.isDark(row + 3, col) &&
                         qrCode.isDark(row + 4, col) &&
                        !qrCode.isDark(row + 5, col) &&
                         qrCode.isDark(row + 6, col) ) {
                    lostPoint += 40;
                }
            }
        }

        // LEVEL4
        
        var darkCount = 0;

        for (col = 0; col < moduleCount; col++) {
            for (row = 0; row < moduleCount; row++) {
                if (qrCode.isDark(row, col) ) {
                    darkCount++;
                }
            }
        }
        
        var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
        lostPoint += ratio * 10;

        return lostPoint;       
    }

};

module.exports = QRUtil;

  },
  "index": function (module, exports, require) {
//---------------------------------------------------------------------
// QRCode for JavaScript
//
// Copyright (c) 2009 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//   http://www.opensource.org/licenses/mit-license.php
//
// The word "QR Code" is registered trademark of 
// DENSO WAVE INCORPORATED
//   http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------
// Modified to work in node for this project (and some refactoring)
//---------------------------------------------------------------------

var QR8bitByte = require('./QR8bitByte');
var QRUtil = require('./QRUtil');
var QRPolynomial = require('./QRPolynomial');
var QRRSBlock = require('./QRRSBlock');
var QRBitBuffer = require('./QRBitBuffer');

function QRCode(typeNumber, errorCorrectLevel) {
	this.typeNumber = typeNumber;
	this.errorCorrectLevel = errorCorrectLevel;
	this.modules = null;
	this.moduleCount = 0;
	this.dataCache = null;
	this.dataList = [];
}

QRCode.prototype = {
	
	addData : function(data) {
		var newData = new QR8bitByte(data);
		this.dataList.push(newData);
		this.dataCache = null;
	},
	
	isDark : function(row, col) {
		if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
			throw new Error(row + "," + col);
		}
		return this.modules[row][col];
	},

	getModuleCount : function() {
		return this.moduleCount;
	},
	
	make : function() {
		// Calculate automatically typeNumber if provided is < 1
		if (this.typeNumber < 1 ){
			var typeNumber = 1;
			for (typeNumber = 1; typeNumber < 40; typeNumber++) {
				var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, this.errorCorrectLevel);

				var buffer = new QRBitBuffer();
				var totalDataCount = 0;
				for (var i = 0; i < rsBlocks.length; i++) {
					totalDataCount += rsBlocks[i].dataCount;
				}

				for (var x = 0; x < this.dataList.length; x++) {
					var data = this.dataList[x];
					buffer.put(data.mode, 4);
					buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber) );
					data.write(buffer);
				}
				if (buffer.getLengthInBits() <= totalDataCount * 8)
					break;
			}
			this.typeNumber = typeNumber;
		}
		this.makeImpl(false, this.getBestMaskPattern() );
	},
	
	makeImpl : function(test, maskPattern) {
		
		this.moduleCount = this.typeNumber * 4 + 17;
		this.modules = new Array(this.moduleCount);
		
		for (var row = 0; row < this.moduleCount; row++) {
			
			this.modules[row] = new Array(this.moduleCount);
			
			for (var col = 0; col < this.moduleCount; col++) {
				this.modules[row][col] = null;//(col + row) % 3;
			}
		}
	
		this.setupPositionProbePattern(0, 0);
		this.setupPositionProbePattern(this.moduleCount - 7, 0);
		this.setupPositionProbePattern(0, this.moduleCount - 7);
		this.setupPositionAdjustPattern();
		this.setupTimingPattern();
		this.setupTypeInfo(test, maskPattern);
		
		if (this.typeNumber >= 7) {
			this.setupTypeNumber(test);
		}
	
		if (this.dataCache === null) {
			this.dataCache = QRCode.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
		}
	
		this.mapData(this.dataCache, maskPattern);
	},

	setupPositionProbePattern : function(row, col)  {
		
		for (var r = -1; r <= 7; r++) {
			
			if (row + r <= -1 || this.moduleCount <= row + r) continue;
			
			for (var c = -1; c <= 7; c++) {
				
				if (col + c <= -1 || this.moduleCount <= col + c) continue;
				
				if ( (0 <= r && r <= 6 && (c === 0 || c === 6) ) || 
                     (0 <= c && c <= 6 && (r === 0 || r === 6) ) || 
                     (2 <= r && r <= 4 && 2 <= c && c <= 4) ) {
					this.modules[row + r][col + c] = true;
				} else {
					this.modules[row + r][col + c] = false;
				}
			}		
		}		
	},
	
	getBestMaskPattern : function() {
	
		var minLostPoint = 0;
		var pattern = 0;
	
		for (var i = 0; i < 8; i++) {
			
			this.makeImpl(true, i);
	
			var lostPoint = QRUtil.getLostPoint(this);
	
			if (i === 0 || minLostPoint >  lostPoint) {
				minLostPoint = lostPoint;
				pattern = i;
			}
		}
	
		return pattern;
	},
	
	createMovieClip : function(target_mc, instance_name, depth) {
	
		var qr_mc = target_mc.createEmptyMovieClip(instance_name, depth);
		var cs = 1;
	
		this.make();

		for (var row = 0; row < this.modules.length; row++) {
			
			var y = row * cs;
			
			for (var col = 0; col < this.modules[row].length; col++) {
	
				var x = col * cs;
				var dark = this.modules[row][col];
			
				if (dark) {
					qr_mc.beginFill(0, 100);
					qr_mc.moveTo(x, y);
					qr_mc.lineTo(x + cs, y);
					qr_mc.lineTo(x + cs, y + cs);
					qr_mc.lineTo(x, y + cs);
					qr_mc.endFill();
				}
			}
		}
		
		return qr_mc;
	},

	setupTimingPattern : function() {
		
		for (var r = 8; r < this.moduleCount - 8; r++) {
			if (this.modules[r][6] !== null) {
				continue;
			}
			this.modules[r][6] = (r % 2 === 0);
		}
	
		for (var c = 8; c < this.moduleCount - 8; c++) {
			if (this.modules[6][c] !== null) {
				continue;
			}
			this.modules[6][c] = (c % 2 === 0);
		}
	},
	
	setupPositionAdjustPattern : function() {
	
		var pos = QRUtil.getPatternPosition(this.typeNumber);
		
		for (var i = 0; i < pos.length; i++) {
		
			for (var j = 0; j < pos.length; j++) {
			
				var row = pos[i];
				var col = pos[j];
				
				if (this.modules[row][col] !== null) {
					continue;
				}
				
				for (var r = -2; r <= 2; r++) {
				
					for (var c = -2; c <= 2; c++) {
					
						if (Math.abs(r) === 2 || 
                            Math.abs(c) === 2 ||
                            (r === 0 && c === 0) ) {
							this.modules[row + r][col + c] = true;
						} else {
							this.modules[row + r][col + c] = false;
						}
					}
				}
			}
		}
	},
	
	setupTypeNumber : function(test) {
	
		var bits = QRUtil.getBCHTypeNumber(this.typeNumber);
        var mod;
	
		for (var i = 0; i < 18; i++) {
			mod = (!test && ( (bits >> i) & 1) === 1);
			this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
		}
	
		for (var x = 0; x < 18; x++) {
			mod = (!test && ( (bits >> x) & 1) === 1);
			this.modules[x % 3 + this.moduleCount - 8 - 3][Math.floor(x / 3)] = mod;
		}
	},
	
	setupTypeInfo : function(test, maskPattern) {
	
		var data = (this.errorCorrectLevel << 3) | maskPattern;
		var bits = QRUtil.getBCHTypeInfo(data);
        var mod;
	
		// vertical		
		for (var v = 0; v < 15; v++) {
	
			mod = (!test && ( (bits >> v) & 1) === 1);
	
			if (v < 6) {
				this.modules[v][8] = mod;
			} else if (v < 8) {
				this.modules[v + 1][8] = mod;
			} else {
				this.modules[this.moduleCount - 15 + v][8] = mod;
			}
		}
	
		// horizontal
		for (var h = 0; h < 15; h++) {
	
			mod = (!test && ( (bits >> h) & 1) === 1);
			
			if (h < 8) {
				this.modules[8][this.moduleCount - h - 1] = mod;
			} else if (h < 9) {
				this.modules[8][15 - h - 1 + 1] = mod;
			} else {
				this.modules[8][15 - h - 1] = mod;
			}
		}
	
		// fixed module
		this.modules[this.moduleCount - 8][8] = (!test);
	
	},
	
	mapData : function(data, maskPattern) {
		
		var inc = -1;
		var row = this.moduleCount - 1;
		var bitIndex = 7;
		var byteIndex = 0;
		
		for (var col = this.moduleCount - 1; col > 0; col -= 2) {
	
			if (col === 6) col--;
	
			while (true) {
	
				for (var c = 0; c < 2; c++) {
					
					if (this.modules[row][col - c] === null) {
						
						var dark = false;
	
						if (byteIndex < data.length) {
							dark = ( ( (data[byteIndex] >>> bitIndex) & 1) === 1);
						}
	
						var mask = QRUtil.getMask(maskPattern, row, col - c);
	
						if (mask) {
							dark = !dark;
						}
						
						this.modules[row][col - c] = dark;
						bitIndex--;
	
						if (bitIndex === -1) {
							byteIndex++;
							bitIndex = 7;
						}
					}
				}
								
				row += inc;
	
				if (row < 0 || this.moduleCount <= row) {
					row -= inc;
					inc = -inc;
					break;
				}
			}
		}
		
	}

};

QRCode.PAD0 = 0xEC;
QRCode.PAD1 = 0x11;

QRCode.createData = function(typeNumber, errorCorrectLevel, dataList) {
	
	var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
	
	var buffer = new QRBitBuffer();
	
	for (var i = 0; i < dataList.length; i++) {
		var data = dataList[i];
		buffer.put(data.mode, 4);
		buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber) );
		data.write(buffer);
	}

	// calc num max data.
	var totalDataCount = 0;
	for (var x = 0; x < rsBlocks.length; x++) {
		totalDataCount += rsBlocks[x].dataCount;
	}

	if (buffer.getLengthInBits() > totalDataCount * 8) {
		throw new Error("code length overflow. (" + 
            buffer.getLengthInBits() + 
            ">" +  
            totalDataCount * 8 + 
            ")");
	}

	// end code
	if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
		buffer.put(0, 4);
	}

	// padding
	while (buffer.getLengthInBits() % 8 !== 0) {
		buffer.putBit(false);
	}

	// padding
	while (true) {
		
		if (buffer.getLengthInBits() >= totalDataCount * 8) {
			break;
		}
		buffer.put(QRCode.PAD0, 8);
		
		if (buffer.getLengthInBits() >= totalDataCount * 8) {
			break;
		}
		buffer.put(QRCode.PAD1, 8);
	}

	return QRCode.createBytes(buffer, rsBlocks);
};

QRCode.createBytes = function(buffer, rsBlocks) {

	var offset = 0;
	
	var maxDcCount = 0;
	var maxEcCount = 0;
	
	var dcdata = new Array(rsBlocks.length);
	var ecdata = new Array(rsBlocks.length);
	
	for (var r = 0; r < rsBlocks.length; r++) {

		var dcCount = rsBlocks[r].dataCount;
		var ecCount = rsBlocks[r].totalCount - dcCount;

		maxDcCount = Math.max(maxDcCount, dcCount);
		maxEcCount = Math.max(maxEcCount, ecCount);
		
		dcdata[r] = new Array(dcCount);
		
		for (var i = 0; i < dcdata[r].length; i++) {
			dcdata[r][i] = 0xff & buffer.buffer[i + offset];
		}
		offset += dcCount;
		
		var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
		var rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);

		var modPoly = rawPoly.mod(rsPoly);
		ecdata[r] = new Array(rsPoly.getLength() - 1);
		for (var x = 0; x < ecdata[r].length; x++) {
            var modIndex = x + modPoly.getLength() - ecdata[r].length;
			ecdata[r][x] = (modIndex >= 0)? modPoly.get(modIndex) : 0;
		}

	}
	
	var totalCodeCount = 0;
	for (var y = 0; y < rsBlocks.length; y++) {
		totalCodeCount += rsBlocks[y].totalCount;
	}

	var data = new Array(totalCodeCount);
	var index = 0;

	for (var z = 0; z < maxDcCount; z++) {
		for (var s = 0; s < rsBlocks.length; s++) {
			if (z < dcdata[s].length) {
				data[index++] = dcdata[s][z];
			}
		}
	}

	for (var xx = 0; xx < maxEcCount; xx++) {
		for (var t = 0; t < rsBlocks.length; t++) {
			if (xx < ecdata[t].length) {
				data[index++] = ecdata[t][xx];
			}
		}
	}

	return data;

};

module.exports = QRCode;

  }
};
const __qrCache = {};
function __qr(name) {
  name = name.replace(/^\.\//, '').replace(/\.js$/, '');
  if (__qrCache[name]) return __qrCache[name].exports;
  const module = { exports: {} };
  __qrCache[name] = module;
  __QR_MODS[name](module, module.exports, __qr);
  return module.exports;
}
function __readPub(file, cb) {
  const rel = 'public/' + require('path').relative(require('path').join(__dirname, 'public'), file).split(require('path').sep).join('/');
  if (Object.prototype.hasOwnProperty.call(__FILES, rel)) return cb(null, Buffer.from(__FILES[rel], 'utf8'));
  const e = new Error('not found'); e.code = 'ENOENT'; cb(e);
}
// =====================================================================
//  تحدي العائلة 🎉 — لعبة أسئلة جماعية (تلفاز + جوالات)
//  تشغيل:  node server.js     (ما يحتاج أي مكتبات إضافية)
// =====================================================================
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { exec } = require('child_process');
const QRCode = __qr('index');
const QRLevel = __qr('QRErrorCorrectLevel');

const PORT = Number(process.env.PORT) || 3000;

// ------------------------- الإعدادات (عدّلها براحتك) -------------------------
const CONFIG = {
  questionsPerGame: 30,     // عدد الأسئلة في اللعبة
  shuffleQuestions: true,   // ترتيب عشوائي للأسئلة كل لعبة
  riskSeconds: 10,          // وقت قرار المخاطرة قبل ظهور السؤال (الإجابة نفسها بدون وقت)
  revealSeconds: 6,         // مدة عرض الإجابة الصحيحة قبل الترتيب
  categoryMix: { proverb: 5, riddle: 5 }, // كم مثل ولغز بكل لعبة (والباقي ثقافة عامة) — كلها تنخلط
  levelPoints: { easy: 100, medium: 150, hard: 200 }, // نقاط الإجابة الصح حسب الصعوبة
  streakBonus: [0, 10, 20, 35, 50], // زيادة الستريك % (إجابة صح 1،2،3،4،5+ ورا بعض)
  speedBonus: [50, 25, 10], // مكافأة أسرع 3 إجابات صح
  soloBonus: 75,            // مكافأة إذا أنت الوحيد اللي جاوب صح (3 لاعبين أو أكثر)
  goldenCount: 5,           // آخر كم سؤال «جولة ذهبية» نقاطها ×2
  reactions: ['😂', '🔥', '😱', '👏', '😡', '🤯'],
  bombDamage: 75,           // خصم القنبلة
  riskBonus: 100,           // مكافأة المخاطرة لو صح
  riskPenalty: 100,         // خصم المخاطرة لو غلط
  maxActionsPerRound: 2,    // أقصى عدد أكشنات بالسؤال الواحد
  restoreEvery: 3,          // كل كم إجابة صح ورا بعض يرجع أكشن
  maxPlayers: 16,
};

const ACTIONS = {
  fifty:  { icon: '✂️', name: 'حذف إجابتين', desc: 'يشيل إجابتين غلط من جوالك', target: false },
  double: { icon: '⚡', name: 'مضاعفة', desc: 'نقاط هالسؤال ×2', target: false },
  risk:   { icon: '🎲', name: 'مخاطرة', desc: `صح +${CONFIG.riskBonus} · غلط −${CONFIG.riskPenalty}`, target: false },
  shield: { icon: '🛡️', name: 'درع', desc: 'يصد أي هجوم عليك', target: false },
  mirror: { icon: '🪞', name: 'مرآة', desc: 'ترد الهجوم على صاحبه', target: false },
  freeze: { icon: '🧊', name: 'تجميد', desc: 'يمنع لاعب من كسب نقاط هالسؤال', target: true },
  bomb:   { icon: '💣', name: 'قنبلة', desc: `تخصم ${CONFIG.bombDamage} نقطة من لاعب`, target: true },
};
const ACTION_KEYS = Object.keys(ACTIONS);

// ------------------------- الأسئلة -------------------------
function loadQuestions() {
  let raw;
  try { raw = JSON.parse(__FILES['questions.json']); }
  catch (e) { console.error('❌ في خطأ بملف questions.json:', e.message); return []; }
  const ok = [];
  (Array.isArray(raw) ? raw : []).forEach((q, i) => {
    const valid = q && typeof q.q === 'string' && Array.isArray(q.options) && q.options.length === 4 &&
      q.options.map(String).includes(String(q.answer));
    if (!valid) { console.warn(`⚠️  السؤال رقم ${i + 1} فيه خطأ وتم تجاهله (لازم 4 خيارات والإجابة تطابق واحد منها)`); return; }
    const level = ['easy', 'medium', 'hard'].includes(q.level) ? q.level : 'medium';
    const cat = ['general', 'proverb', 'riddle'].includes(q.cat) ? q.cat : 'general';
    ok.push({ text: q.q, options: q.options.map(String), answer: String(q.answer), level, cat });
  });
  return ok;
}
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const availableQuestions = () => Math.min(CONFIG.questionsPerGame, loadQuestions().length);

// ------------------------- الشبكة -------------------------
function lanIPs() {
  const out = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const a of list || []) {
      if ((a.family === 'IPv4' || a.family === 4) && !a.internal) out.push({ ip: a.address, name });
    }
  }
  const rank = ip => ip.startsWith('192.168.') ? 0 : ip.startsWith('10.') ? 1 : /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ? 2 : 3;
  return out.sort((a, b) => rank(a.ip) - rank(b.ip));
}
function qrSvg(text) {
  const qr = new QRCode(-1, QRLevel.M);
  qr.addData(text); qr.make();
  const n = qr.getModuleCount(), m = 2, size = n + m * 2;
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#1b1035"/></svg>`;
}

// ------------------------- حالة اللعبة -------------------------
let game = { phase: 'setup', players: [], questions: [], qIndex: -1, round: null, endsAt: null };
let timer = null;
const now = () => Date.now();
const P = id => game.players.find(p => p.id === id);
const curQ = () => game.questions[game.qIndex];
const revealed = () => ['reveal', 'scoreboard', 'final'].includes(game.phase);

function clearTimer() { if (timer) clearTimeout(timer); timer = null; }
function schedule(fn, ms, setEnds = true) {
  clearTimer();
  if (setEnds) game.endsAt = now() + ms;
  timer = setTimeout(() => { timer = null; fn(); }, ms);
}
function freshActions() { const o = {}; ACTION_KEYS.forEach(k => (o[k] = true)); return o; }
function resetStats(p) {
  Object.assign(p, { score: 0, streak: 0, bestStreak: 0, correct: 0, actions: freshActions(), restoreTokens: 0, rank: 1, lastRank: null, used: 0 });
}
const ANIMALS = ['🦁', '🐼', '🐯', '🐸', '🐵', '🦊', '🐨', '🐰', '🐻', '🐷', '🐮', '🐔', '🐧', '🦄', '🐙', '🦒', '🐶', '🐱', '🐢', '🦉'];
function newPlayer(name, avatar) {
  const p = { id: crypto.randomBytes(4).toString('hex'), name, avatar, token: null, cid: null, connected: false };
  resetStats(p); return p;
}
function computeRanks() { game.players.forEach(p => { p.rank = 1 + game.players.filter(o => o.score > p.score).length; }); }

function setPlayers(names) {
  if (!['setup', 'lobby'].includes(game.phase)) return 'اللعبة شغالة';
  const seen = new Set(), clean = [];
  for (const it of names || []) {
    const name = String((it && it.name) || it || '').trim().slice(0, 16);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const av = it && ANIMALS.includes(it.avatar) ? it.avatar : null;
    clean.push({ name, avatar: av });
  }
  clean.splice(CONFIG.maxPlayers);
  if (!clean.length) return 'أضف لاعب واحد على الأقل';
  clean.forEach(c => { if (!c.avatar) c.avatar = ANIMALS.find(a => !clean.some(x => x.avatar === a)) || ANIMALS[0]; });
  const kept = clean.map(c => { const p = game.players.find(x => x.name === c.name) || newPlayer(c.name, c.avatar); p.avatar = c.avatar; return p; });
  game.players.filter(p => !kept.includes(p)).forEach(p => kickPlayer(p, 'removed'));
  game.players = kept;
  game.phase = 'lobby';
  return null;
}

function startGame() {
  const all = loadQuestions();
  if (!all.length) return 'ما في أسئلة صالحة في questions.json';
  if (!game.players.length) return 'ما في لاعبين';
  const pool = CONFIG.shuffleQuestions ? shuffle(all.slice()) : all.slice();
  const chosen = [];
  for (const [cat, n] of Object.entries(CONFIG.categoryMix || {})) chosen.push(...pool.filter(q => q.cat === cat).slice(0, n));
  // الباقي ثقافة عامة بمستويات متوازنة (سهل/متوسط/صعب بالتناوب)
  const gen = { easy: [], medium: [], hard: [] };
  pool.filter(q => q.cat === 'general').forEach(q => gen[q.level].push(q));
  for (let i = 0; chosen.length < CONFIG.questionsPerGame && (gen.easy.length + gen.medium.length + gen.hard.length); i++) {
    const lv = ['easy', 'medium', 'hard'][i % 3];
    if (gen[lv].length) chosen.push(gen[lv].shift());
  }
  for (const q of pool) { if (chosen.length >= CONFIG.questionsPerGame) break; if (!chosen.includes(q)) chosen.push(q); }
  const qs = shuffle(chosen.slice(0, CONFIG.questionsPerGame)); // المستويات مخلوطة
  game.questions = qs.map((q, i) => {
    const options = shuffle(q.options.slice());
    return { text: q.text, options, correct: options.indexOf(q.answer), level: q.level, cat: q.cat, golden: i >= qs.length - CONFIG.goldenCount };
  });
  game.players.forEach(resetStats);
  startQuestion(0);
  return null;
}

function startQuestion(i) {
  game.qIndex = i;
  game.phase = 'actions';
  game.round = {
    actions: [], ready: new Set(), answers: {}, removed: {}, frozen: new Set(), bombHits: {},
    doubled: new Set(), risk: new Set(), shield: new Set(), mirror: new Set(), effects: [], alerts: {}, results: null, answerStart: null,
  };
  // إذا ولا لاعب متصل عنده مخاطرة، نعرض السؤال على طول
  if (!connectedPlayers().some(p => p.actions.risk)) return endActions(true);
  schedule(endActions, CONFIG.riskSeconds * 1000);
  broadcast();
}

function alertTo(pid, icon, text, kind = 'info') { (game.round.alerts[pid] ||= []).push({ icon, text, kind }); }

// تطبيق الأكشن فوراً (المخاطرة قبل السؤال، والباقي أثناء الإجابة)
function applyAction(r, a) {
  const from = P(a.from); if (!from) return;
  const A = ACTIONS[a.type];
  const q = curQ();
  const self = text => r.effects.push({ icon: A.icon, text, kind: 'self', from: a.from, type: a.type });
  switch (a.type) {
    case 'fifty': r.removed[a.from] = shuffle([0, 1, 2, 3].filter(i => i !== q.correct)).slice(0, 2); return self(`${from.name} حذف إجابتين`);
    case 'double': r.doubled.add(a.from); return self(`${from.name} بيضاعف نقاطه`);
    case 'risk': r.risk.add(a.from); return self(`${from.name} قرر يخاطر!`);
    case 'shield': r.shield.add(a.from); return self(`${from.name} رفع الدرع`);
    case 'mirror': r.mirror.add(a.from); return self(`${from.name} جهّز المرآة`);
  }
  // هجوم: قنبلة أو تجميد
  const t = P(a.target); if (!t) return;
  const verb = a.type === 'bomb' ? 'رمى قنبلة على' : 'جمّد';
  const what = a.type === 'bomb' ? 'قنبلة' : 'تجميد';
  let victim = t, kind = 'hit', note = '';
  if (r.mirror.has(t.id)) {
    if (r.shield.has(from.id) || r.mirror.has(from.id)) {
      victim = null; kind = 'blocked'; note = ` — رجعت بالمرآة 🪞 وصدّها ${from.name}`;
      alertTo(t.id, '🪞', `مرآتك ردّت ${what} ${from.name}!`, 'good');
    } else {
      victim = from; kind = 'reflected'; note = ` — انعكست بالمرآة 🪞 على ${from.name}!`;
      alertTo(t.id, '🪞', `مرآتك ردّت ${what} ${from.name} عليه! 😎`, 'good');
      alertTo(from.id, '🪞', `${t.name} عنده مرآة! ${what}ك رجع عليك 😅`, 'bad');
    }
  } else if (r.shield.has(t.id)) {
    victim = null; kind = 'blocked'; note = ' — انصدّت بالدرع 🛡️';
    alertTo(t.id, '🛡️', `درعك صد ${what} ${from.name}!`, 'good');
    alertTo(from.id, '🛡️', `${t.name} كان متدرّع 😬`, 'bad');
  } else {
    alertTo(t.id, A.icon, a.type === 'bomb' ? `${from.name} رمى عليك قنبلة! −${CONFIG.bombDamage}` : `${from.name} جمّدك! ما بتكسب نقاط هالسؤال 🥶`, 'bad');
  }
  if (victim) {
    if (a.type === 'bomb') r.bombHits[victim.id] = (r.bombHits[victim.id] || 0) + 1;
    else r.frozen.add(victim.id);
  }
  r.effects.push({ icon: A.icon, text: `${from.name} ${verb} ${t.name}${note}`, kind, from: a.from, to: t.id, type: a.type });
}

function endActions(force) {
  if (game.phase !== 'actions' && !force) return;
  clearTimer();
  game.round.answerStart = now();
  game.phase = 'answer';
  game.endsAt = null; // بدون وقت: السؤال يخلص لما الكل يجاوب أو المضيف يضغط التالي
  broadcast();
}

function computeResults() {
  const r = game.round, q = curQ();
  game.players.forEach(p => { p.lastRank = game.qIndex === 0 ? null : p.rank; });
  r.results = {};
  const golden = !!q.golden;
  // ترتيب الإجابات الصح حسب السرعة (المتجمّد ما ينحسب)
  const fast = game.players.filter(p => r.answers[p.id] && r.answers[p.id].choice === q.correct && !r.frozen.has(p.id))
    .sort((x, y) => r.answers[x.id].at - r.answers[y.id].at);
  r.fastest = fast.map(p => p.id);
  for (const p of game.players) {
    const a = r.answers[p.id];
    const correct = !!a && a.choice === q.correct;
    const parts = [];
    let pts = 0, earnedRestore = false;
    const frozen = r.frozen.has(p.id);
    if (correct && frozen) {
      parts.push({ label: 'إجابة صح بس متجمّد 🧊', v: 0 });
      if (r.doubled.has(p.id)) parts.push({ label: 'مضاعفة راحت ⚡', v: 0 });
    } else if (correct) {
      p.streak++; p.correct++; p.bestStreak = Math.max(p.bestStreak, p.streak);
      const LV = { easy: 'سهل', medium: 'متوسط', hard: 'صعب' };
      const base = CONFIG.levelPoints[q.level] || 100;
      parts.push({ label: `إجابة صح (${LV[q.level] || ''}) ✅`, v: base });
      const sbp = CONFIG.streakBonus[Math.min(p.streak, CONFIG.streakBonus.length) - 1] || 0;
      const sb = Math.round(base * sbp / 100);
      if (sb) parts.push({ label: `ستريك ${p.streak} 🔥 (+${sbp}%)`, v: sb });
      let sub = base + sb;
      if (r.doubled.has(p.id)) { parts.push({ label: 'مضاعفة ⚡', v: base + sb }); sub += base + sb; }
      const order = fast.indexOf(p);
      const sp = CONFIG.speedBonus[order] || 0;
      if (sp) { parts.push({ label: order === 0 ? 'الأسرع 🚀' : order === 1 ? 'ثاني أسرع 🚀' : 'ثالث أسرع 🚀', v: sp }); sub += sp; }
      if (fast.length === 1 && game.players.length >= 3) { parts.push({ label: 'الوحيد اللي جاوب صح 🦸', v: CONFIG.soloBonus }); sub += CONFIG.soloBonus; }
      if (golden) { parts.push({ label: 'جولة ذهبية ×2 🌟', v: sub }); sub *= 2; }
      pts += sub;
      if (r.risk.has(p.id)) { pts += CONFIG.riskBonus; parts.push({ label: 'مخاطرة ناجحة 🎲', v: CONFIG.riskBonus }); }
      if (p.streak % CONFIG.restoreEvery === 0) { p.restoreTokens++; earnedRestore = true; }
    } else {
      p.streak = 0;
      if (r.doubled.has(p.id)) parts.push({ label: 'مضاعفة راحت ⚡', v: 0 });
      if (r.risk.has(p.id)) { pts -= CONFIG.riskPenalty; parts.push({ label: 'مخاطرة خسرانة 🎲', v: -CONFIG.riskPenalty }); }
    }
    const hits = r.bombHits[p.id] || 0;
    if (hits) { const d = hits * CONFIG.bombDamage; pts -= d; parts.push({ label: hits > 1 ? `قنابل ×${hits} 💣` : 'قنبلة 💣', v: -d }); }
    const before = p.score;
    p.score = Math.max(0, p.score + pts);
    r.results[p.id] = { correct, frozen, answered: !!a, choice: a ? a.choice : null, delta: p.score - before, parts, streak: p.streak, earnedRestore, speed: fast.indexOf(p) };
  }
  computeRanks();
}

function endAnswer() {
  if (game.phase !== 'answer') return;
  computeResults();
  game.phase = 'reveal';
  schedule(toScoreboard, CONFIG.revealSeconds * 1000);
  broadcast();
}
function toScoreboard() { if (game.phase !== 'reveal') return; clearTimer(); game.phase = 'scoreboard'; game.endsAt = null; broadcast(); }
function finish() { clearTimer(); game.phase = 'final'; game.endsAt = null; broadcast(); }

function next() {
  switch (game.phase) {
    case 'actions': return endActions();
    case 'answer': return endAnswer();
    case 'reveal': return toScoreboard();
    case 'scoreboard':
      if (game.qIndex + 1 < game.questions.length) return startQuestion(game.qIndex + 1);
      return finish();
  }
}

const connectedPlayers = () => game.players.filter(p => p.connected);
function checkAllReady() {
  if (game.phase !== 'actions') return;
  const c = connectedPlayers();
  if (c.length && c.every(p => game.round.ready.has(p.id) || !p.actions.risk)) schedule(endActions, 600, false);
}
function checkAllAnswered() {
  if (game.phase !== 'answer') return;
  const c = connectedPlayers();
  if (c.length && c.every(p => game.round.answers[p.id])) schedule(endAnswer, 800, false);
}

function useAction(p, type, target) {
  const r = game.round;
  const A = ACTIONS[type];
  if (!A || !r) return 'أكشن غير معروف';
  if (type === 'risk' && game.phase !== 'actions') return 'المخاطرة لازم قبل ما يطلع السؤال';
  if (type !== 'risk' && game.phase !== 'answer') return 'هالأكشن يستخدم بعد ما يطلع السؤال';
  if (game.phase === 'answer' && r.answers[p.id]) return 'جاوبت خلاص';
  if (!p.actions[type]) return 'استخدمت هذا الأكشن قبل';
  const mine = r.actions.filter(a => a.from === p.id);
  if (mine.length >= CONFIG.maxActionsPerRound) return `حدّك ${CONFIG.maxActionsPerRound} أكشن بالسؤال`;
  if (mine.some(a => a.type === type)) return 'مستخدمه بهالسؤال';
  if (A.target) { const t = P(target); if (!t || t.id === p.id) return 'اختار لاعب'; }
  p.actions[type] = false; p.used++;
  const act = { from: p.id, type, target: A.target ? target : null };
  r.actions.push(act);
  applyAction(r, act);
  if (type === 'risk') r.ready.add(p.id);
  broadcast(); checkAllReady();
  return null;
}
function answer(p, choice) {
  const r = game.round;
  if (game.phase !== 'answer' || !r) return 'مو وقت الإجابة';
  if (r.answers[p.id]) return 'جاوبت خلاص';
  if (!Number.isInteger(choice) || choice < 0 || choice > 3) return 'اختيار غلط';
  if ((r.removed[p.id] || []).includes(choice)) return 'هذا الخيار محذوف';
  r.answers[p.id] = { choice, at: now() - r.answerStart };
  broadcast(); checkAllAnswered();
  return null;
}
function restore(p, type) {
  if (p.restoreTokens < 1) return 'ما عندك رصيد إرجاع';
  if (!ACTIONS[type] || p.actions[type]) return 'هذا الأكشن عندك أصلاً';
  p.restoreTokens--; p.actions[type] = true;
  if (game.round) game.round.effects.push({ icon: '♻️', text: `${p.name} رجّع ${ACTIONS[type].icon} ${ACTIONS[type].name}`, kind: 'restore', from: p.id, type });
  broadcast();
  return null;
}

// ------------------------- العرض لكل طرف -------------------------
function pub(p) {
  return { id: p.id, idx: game.players.indexOf(p), name: p.name, avatar: p.avatar, connected: p.connected, claimed: !!p.token, score: p.score, streak: p.streak, bestStreak: p.bestStreak,
    correct: p.correct, actions: p.actions, restoreTokens: p.restoreTokens, rank: p.rank, lastRank: p.lastRank, used: p.used };
}
function base() {
  return { phase: game.phase, serverNow: now(), endsAt: game.endsAt, config: CONFIG, actionsMeta: ACTIONS, actionOrder: ACTION_KEYS,
    qIndex: game.qIndex, total: game.questions.length || availableQuestions(), animals: ANIMALS };
}
function questionView() {
  const q = curQ();
  if (!q || !game.round) return null;
  return { text: game.phase === 'actions' ? null : q.text, level: q.level, cat: q.cat, golden: q.golden, options: game.phase === 'actions' ? null : q.options, correct: revealed() ? q.correct : null };
}
function hostView() {
  const r = game.round;
  const counts = {};
  if (r) r.actions.forEach(a => { counts[a.from] = (counts[a.from] || 0) + 1; });
  return { ...base(), port: PORT, ips: lanIPs(), players: game.players.map(pub), question: questionView(),
    round: r ? {
      actionCounts: counts, ready: [...r.ready], answered: Object.keys(r.answers), frozen: game.phase === 'actions' ? [] : [...r.frozen],
      effects: game.phase === 'actions' ? r.effects.filter(e => e.kind === 'restore') : r.effects,
      choices: revealed() ? Object.fromEntries(Object.entries(r.answers).map(([k, v]) => [k, v.choice])) : null,
      results: revealed() ? r.results : null,
      fastest: revealed() ? r.fastest || [] : [],
      used: revealed() ? Object.fromEntries(game.players.map(p => [p.id, r.actions.filter(a => a.from === p.id).map(a => ({ type: a.type, targetName: a.target ? (P(a.target) || {}).name : null }))])) : {},
    } : null };
}
function playerView(p) {
  const r = game.round;
  return { ...base(), me: { ...pub(p), playersCount: game.players.length },
    opponents: game.players.filter(o => o.id !== p.id).map(o => ({ id: o.id, idx: game.players.indexOf(o), name: o.name, avatar: o.avatar, connected: o.connected })),
    question: questionView(),
    round: r ? {
      myActions: r.actions.filter(a => a.from === p.id).map(a => ({ type: a.type, target: a.target, targetName: a.target ? (P(a.target) || {}).name : null })),
      ready: r.ready.has(p.id), answered: r.answers[p.id] ? r.answers[p.id].choice : null,
      removed: r.removed[p.id] || [],
      frozen: r.frozen.has(p.id),
      alerts: r.alerts[p.id] || [],
      result: revealed() && r.results ? r.results[p.id] || null : null,
      answeredCount: Object.keys(r.answers).length,
    } : null,
    leaderboard: ['scoreboard', 'final'].includes(game.phase)
      ? [...game.players].sort((a, b) => b.score - a.score).map(o => ({ id: o.id, name: o.name, avatar: o.avatar, score: o.score, rank: o.rank })) : null,
  };
}
function pickView() {
  return { phase: game.phase, players: game.players.map((p, i) => ({ id: p.id, idx: i, name: p.name, avatar: p.avatar, taken: p.connected })) };
}

// ------------------------- الاتصال (Server-Sent Events) -------------------------
const clients = new Map(); // cid -> { res, role, pid }
function send(c, event, data) { try { c.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch (e) { /* ignore */ } }
function broadcast() {
  const hv = hostView(); const pv = pickView();
  for (const c of clients.values()) {
    if (c.role === 'host') send(c, 'state', hv);
    else if (c.pid && P(c.pid)) send(c, 'state', playerView(P(c.pid)));
    else send(c, 'pick', pv);
  }
}
function bind(c, cid, p) {
  if (p.cid && p.cid !== cid) {
    const old = clients.get(p.cid);
    if (old) { old.pid = null; send(old, 'kicked', 'other-device'); }
  }
  c.pid = p.id; p.cid = cid; p.connected = true;
}
function kickPlayer(p, reason) {
  const c = p.cid && clients.get(p.cid);
  if (c) { c.pid = null; send(c, 'kicked', reason); }
  p.cid = null; p.connected = false; p.token = null;
}

function handleEvents(req, res, url) {
  const cid = String(url.searchParams.get('cid') || '').slice(0, 64);
  const role = url.searchParams.get('role') === 'host' ? 'host' : 'player';
  if (!cid) { res.writeHead(400); return res.end(); }
  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.write('retry: 1500\n\n');
  const prev = clients.get(cid);
  const c = { res, role, pid: prev ? prev.pid : null };
  if (prev) { try { prev.res.end(); } catch (e) {} }
  clients.set(cid, c);
  if (role === 'player') {
    const token = url.searchParams.get('token');
    const p = (c.pid && P(c.pid)) || (token && game.players.find(x => x.token && x.token === token));
    if (p) bind(c, cid, p); else c.pid = null;
  }
  broadcast();
  const ka = setInterval(() => { try { res.write(': ping\n\n'); } catch (e) {} }, 15000);
  req.on('close', () => {
    clearInterval(ka);
    if (clients.get(cid) !== c) return;
    clients.delete(cid);
    const p = c.pid && P(c.pid);
    if (p && p.cid === cid) { p.connected = false; p.cid = null; }
    broadcast(); checkAllReady(); checkAllAnswered();
  });
}

function handleApi(body, cid) {
  const c = clients.get(cid);
  const t = body.type;
  // أوامر المضيف (التلفاز)
  if (t && t.startsWith('host:')) {
    if (!c || c.role !== 'host') return { ok: false, msg: 'غير مسموح' };
    let err = null;
    switch (t) {
      case 'host:setPlayers': err = setPlayers(body.names); break;
      case 'host:toSetup': if (game.phase === 'lobby' || game.phase === 'final') { clearTimer(); game.phase = 'setup'; game.round = null; game.qIndex = -1; } break;
      case 'host:start': if (game.phase === 'lobby') err = startGame(); break;
      case 'host:next': next(); break;
      case 'host:kick': { const p = P(body.id); if (p) kickPlayer(p, 'kicked'); break; }
      case 'host:rematch': clearTimer(); game.phase = 'lobby'; game.round = null; game.qIndex = -1; game.questions = []; game.endsAt = null; game.players.forEach(resetStats); break;
      case 'host:abort': clearTimer(); game.phase = 'lobby'; game.round = null; game.qIndex = -1; game.questions = []; game.endsAt = null; game.players.forEach(resetStats); break;
      default: err = 'أمر غير معروف';
    }
    broadcast();
    return err ? { ok: false, msg: err } : { ok: true };
  }
  // أوامر اللاعبين (الجوال)
  if (!c) return { ok: false, msg: 'الاتصال مقطوع، حدّث الصفحة' };
  if (t === 'player:claim') {
    const p = P(body.id);
    if (!p) return { ok: false, msg: 'الاسم مو موجود' };
    if (p.connected && p.cid !== cid) return { ok: false, msg: 'هذا الاسم مأخوذ من جوال ثاني' };
    p.token = crypto.randomBytes(12).toString('hex');
    bind(c, cid, p); broadcast();
    return { ok: true, token: p.token };
  }
  const p = c.pid && P(c.pid);
  if (!p) return { ok: false, msg: 'اختار اسمك أول' };
  let err = null;
  switch (t) {
    case 'player:leave': p.token = null; p.cid = null; p.connected = false; c.pid = null; broadcast(); checkAllReady(); checkAllAnswered(); break;
    case 'player:action': err = useAction(p, body.action, body.target); break;
    case 'player:ready': if (game.phase === 'actions') { game.round.ready.add(p.id); broadcast(); checkAllReady(); } break;
    case 'player:answer': err = answer(p, body.choice); break;
    case 'player:restore': err = restore(p, body.action); break;
    case 'player:react': {
      if (!CONFIG.reactions.includes(body.e)) break;
      if (now() - (p.lastReact || 0) < 700) break;
      p.lastReact = now();
      for (const h of clients.values()) if (h.role === 'host') send(h, 'react', { pid: p.id, idx: game.players.indexOf(p), name: p.name, avatar: p.avatar, e: body.e });
      break;
    }
    default: err = 'أمر غير معروف';
  }
  return err ? { ok: false, msg: err } : { ok: true };
}

// ------------------------- السيرفر -------------------------
const PUB = path.join(__dirname, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };
const isLocal = req => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let p = url.pathname;
  if (p === '/events') return handleEvents(req, res, url);
  if (p === '/api' && req.method === 'POST') {
    let data = '';
    req.on('data', ch => { data += ch; if (data.length > 1e5) req.destroy(); });
    req.on('end', () => {
      let body = {};
      try { body = JSON.parse(data || '{}'); } catch (e) {}
      const out = handleApi(body, String(body.cid || ''));
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(out));
    });
    return;
  }
  if (p === '/ping') { res.writeHead(200, { 'Cache-Control': 'no-store' }); return res.end('ok'); }
  if (p === '/qr.svg') {
    res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=3600' });
    return res.end(qrSvg(url.searchParams.get('t') || ''));
  }
  if (p === '/') p = isLocal(req) ? '/host.html' : '/play.html';
  else if (p === '/tv' || p === '/host') p = '/host.html';
  else if (p === '/play' || p === '/p') p = '/play.html';
  const file = path.normalize(path.join(PUB, p));
  if (!file.startsWith(PUB)) { res.writeHead(403); return res.end(); }
  __readPub(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('الصفحة مو موجودة'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

server.on('error', e => {
  if (e.code === 'EADDRINUSE') console.error(`\n❌ المنفذ ${PORT} مستخدم. سكّر النسخة الثانية من اللعبة أو شغّل:  PORT=3001 node server.js\n`);
  else console.error(e);
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = lanIPs();
  const n = loadQuestions().length;
  console.log('\n🎉  تحدي العائلة شغّال!');
  console.log(`📚  عدد الأسئلة الصالحة: ${n}`);
  console.log(`📺  افتح على التلفاز/اللابتوب:  http://localhost:${PORT}/tv`);
  if (ips.length) ips.forEach(x => console.log(`📱  رابط الجوالات:  http://${x.ip}:${PORT}/play   (${x.name})`));
  else console.log('⚠️  ما لقيت شبكة واي فاي! تأكد إن الجهاز متصل بالراوتر.');
  console.log('\n   (لا تسكّر هالنافذة طول ما اللعبة شغالة)\n');
  if (!process.env.NO_OPEN && !process.env.RENDER && !process.env.PORT) {
    const u = `http://localhost:${PORT}/tv`;
    const cmd = process.platform === 'win32' ? `start "" "${u}"` : process.platform === 'darwin' ? `open "${u}"` : `xdg-open "${u}"`;
    exec(cmd, () => {});
  }
});
