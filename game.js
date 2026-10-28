/* =========================================================================
   Chibi Arsenal — Fusion Tactique
   Puzzle physique façon Suika Game : deux armes identiques fusionnent en
   l'arme supérieure. Moteur physique : Matter.js. Rendu : Canvas 2D.
   ========================================================================= */
(function () {
  'use strict';

  const { Engine, Bodies, Body, Composite, Events } = Matter;
  const { ITEMS, svgURL } = Sprites;
  const A = GameAudio;

  // ------------------------------------------------------------ constantes
  const VIEW_W = 440, VIEW_H = 700;          // monde logique
  const TANK_L = 14, TANK_R = 426;           // parois intérieures de la cuve
  const TANK_B = 686;                        // fond de la cuve
  const TANK_TOP = 132;                      // ligne de danger
  const DROP_Y = 66;                         // hauteur de l'arme en attente
  const STEP = 1 / 60;                       // pas physique fixe
  const DANGER_TIME = 3;                     // secondes avant Game Over
  const DROP_COOLDOWN = 0.42;
  const DROP_WEIGHTS = [30, 26, 20, 14, 10]; // seules les 5 premières tombent
  const POINTS = [0, 2, 5, 10, 16, 25, 40, 60, 90, 130, 200];
  const GRAAL_BONUS = 500;
  const MAX_LEVEL = ITEMS.length - 1;
  const STORE_KEY = 'chibiArsenal.v1';
  const PASTELS = ['#ffb3c8', '#ffd98a', '#a8ecc8', '#a9d8ff', '#cdbcff', '#ffc99a', '#ffffff'];

  const BODY_OPTS = {
    restitution: 0.36,
    friction: 0.12,
    frictionStatic: 0.45,
    frictionAir: 0.012,
    density: 0.0012,
    label: 'item'
  };

  // -------------------------------------------------------------- stockage
  const store = (() => {
    let data = { best: 0, discovered: [], music: true, sfx: true };
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) data = Object.assign(data, JSON.parse(raw));
    } catch (e) { /* stockage indisponible (navigation privée) */ }
    return {
      data,
      save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ } }
    };
  })();
  if (!Array.isArray(store.data.discovered)) store.data.discovered = [];

  // ------------------------------------------------------------------- DOM
  const $ = id => document.getElementById(id);
  const stage = $('stage'), board = $('board'), canvas = $('game');
  const ctx = canvas.getContext('2d');
  const elScore = $('score'), elBest = $('best'), elScoreBox = $('score-box');
  const elNext = $('next-img'), elNextPill = $('next');
  const elEvo = $('evo'), elToast = $('toast');

  // ------------------------------------------------------------- sprites
  const images = [];        // images[level] = [ouvert, fermé]
  let raster = [];          // versions pré-rastérisées à la bonne taille
  let scale = 1, dpr = 1;

  function loadImages() {
    const jobs = [];
    ITEMS.forEach((it, lvl) => {
      images[lvl] = [false, true].map(closed => {
        const img = new Image();
        jobs.push(new Promise(res => { img.onload = img.onerror = res; }));
        img.src = svgURL(lvl, closed);
        return img;
      });
    });
    return Promise.all(jobs);
  }

  function buildRaster() {
    const px = scale * dpr;
    raster = ITEMS.map((it, lvl) => images[lvl].map(img => {
      const size = Math.max(8, Math.ceil(it.radius * 2 * 1.06 * px));
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const g = c.getContext('2d');
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, 0, 0, size, size);
      return c;
    }));
  }

  // ------------------------------------------------------------- layout
  function resize() {
    const r = stage.getBoundingClientRect();
    scale = Math.min(r.width / VIEW_W, r.height / VIEW_H);
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = VIEW_W * scale, h = VIEW_H * scale;
    board.style.width = w + 'px';
    board.style.height = h + 'px';
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    if (images.length) buildRaster();
  }

  // ----------------------------------------------------------------- état
  let state = 'menu';      // menu | play | pause | over
  let engine, items, mergeQueue;
  let gt = 0, rt = 0;      // temps de jeu / temps réel (animations)
  let acc = 0;
  let score = 0, shownScore = 0;
  let dangerT = 0, lastTick = 0;
  let combo = 0, lastMergeT = -10;
  let maxLevel = 0, reached = [];
  let shake = 0;
  let particles = [], texts = [], ghosts = [];
  const dropper = { x: VIEW_W / 2, tx: VIEW_W / 2, level: 0, ready: true, cooldown: 0, appear: 1 };
  let nextLevel = 0;
  const pointer = { active: false };

  function randomDrop() {
    const total = DROP_WEIGHTS.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < DROP_WEIGHTS.length; i++) {
      r -= DROP_WEIGHTS[i];
      if (r <= 0) return i;
    }
    return 0;
  }

  // -------------------------------------------------------------- monde
  function createWorld() {
    engine = Engine.create({ positionIterations: 10, velocityIterations: 8 });
    engine.gravity.y = 1.35;
    const T = 80, top = -700;
    const wallOpts = { isStatic: true, label: 'wall', friction: 0.3, restitution: 0.25 };
    const h = TANK_B + T - top;
    Composite.add(engine.world, [
      Bodies.rectangle(VIEW_W / 2, TANK_B + T / 2, VIEW_W * 2, T, wallOpts),
      Bodies.rectangle(TANK_L - T / 2, top + h / 2, T, h, wallOpts),
      Bodies.rectangle(TANK_R + T / 2, top + h / 2, T, h, wallOpts)
    ]);
    Events.on(engine, 'collisionStart', e => onCollision(e, true));
    Events.on(engine, 'collisionActive', e => onCollision(e, false));
  }

  function addItem(level, x, y, opts = {}) {
    const r = ITEMS[level].radius;
    const startR = opts.grow ? r * 0.72 : r;
    const body = Bodies.circle(x, y, startR, BODY_OPTS);
    if (opts.vel) Body.setVelocity(body, opts.vel);
    Body.setAngle(body, opts.angle != null ? opts.angle : (Math.random() - 0.5) * 0.5);
    const it = {
      body, level, r,
      born: gt,
      grow: !!opts.grow,
      spawn: opts.grow ? 0 : 1,
      dropped: !!opts.dropped,
      landed: false,
      merging: false,
      phase: Math.random() * Math.PI * 2,
      sq: { d: 0, v: 0, a: 0 },
      blinkAt: rt + 1 + Math.random() * 4,
      blinkUntil: 0
    };
    items.set(body.id, it);
    Composite.add(engine.world, body);
    return it;
  }

  function removeItem(it) {
    items.delete(it.body.id);
    Composite.remove(engine.world, it.body);
  }

  // --------------------------------------------------------- collisions
  function kick(it, speed, ang) {
    const imp = Math.min(speed * 0.3, 3.4);
    if (imp < 0.25) return;
    if (imp > Math.abs(it.sq.v) * 0.6) it.sq.a = ang;
    it.sq.v += imp;
  }

  function onCollision(e, isStart) {
    for (const pair of e.pairs) {
      const a = items.get(pair.bodyA.id), b = items.get(pair.bodyB.id);
      if (isStart) {
        const n = pair.collision.normal;
        const va = pair.bodyA.velocity, vb = pair.bodyB.velocity;
        const s = Math.abs((va.x - vb.x) * n.x + (va.y - vb.y) * n.y);
        const ang = Math.atan2(n.y, n.x);
        if (a) kick(a, s, ang);
        if (b) kick(b, s, ang);
        for (const it of [a, b]) {
          if (it && it.dropped && !it.landed) {
            it.landed = true;
            if (s > 1.2) A.land(s / 12, it.level);
          }
        }
      }
      if (a && b && a.level === b.level && !a.merging && !b.merging) {
        a.merging = b.merging = true;
        mergeQueue.push([a, b]);
      }
    }
  }

  function processMerges() {
    for (const [a, b] of mergeQueue) {
      if (!items.has(a.body.id) || !items.has(b.body.id)) continue;
      const pa = a.body.position, pb = b.body.position;
      let x = (pa.x + pb.x) / 2, y = (pa.y + pb.y) / 2;
      const vel = {
        x: (a.body.velocity.x + b.body.velocity.x) * 0.25,
        y: (a.body.velocity.y + b.body.velocity.y) * 0.25
      };
      for (const it of [a, b]) {
        ghosts.push({ level: it.level, r: it.r, x0: it.body.position.x, y0: it.body.position.y, x1: x, y1: y, angle: it.body.angle, t: 0 });
      }
      removeItem(a);
      removeItem(b);

      combo = gt - lastMergeT < 0.9 ? combo + 1 : 1;
      lastMergeT = gt;
      const mult = 1 + (combo - 1) * 0.5;

      if (a.level === MAX_LEVEL) {
        // Deux Graals : ils disparaissent dans une pluie de confettis.
        const pts = Math.round(GRAAL_BONUS * mult);
        addScore(pts, x, y, true);
        burst(x, y, a.r, a.level, true);
        A.fanfare();
        shake = 16;
        toast(MAX_LEVEL, 'Double Graal ! +' + pts);
        continue;
      }

      const lvl = a.level + 1;
      const r = ITEMS[lvl].radius;
      x = Math.max(TANK_L + r * 0.72, Math.min(TANK_R - r * 0.72, x));
      y = Math.min(TANK_B - r * 0.72, y);
      const n = addItem(lvl, x, y, { grow: true, vel, angle: (a.body.angle + b.body.angle) / 2 });
      n.sq.v = 3; n.sq.a = -Math.PI / 2;

      const pts = Math.round(POINTS[lvl] * mult);
      addScore(pts, x, y - r * 0.4, false);
      if (combo >= 2) floatText(x, y - r * 0.4 - 30, 'Combo x' + combo, '#b06cff', 20);
      burst(x, y, r, lvl, false);
      A.pop(lvl);
      if (lvl >= 7) shake = Math.max(shake, 4 + (lvl - 7) * 3);
      if (navigator.vibrate) { try { navigator.vibrate(lvl >= 7 ? 25 : 10); } catch (e) { /* ignore */ } }
      onReach(lvl);
    }
    mergeQueue.length = 0;
  }

  // ------------------------------------------------------------ gameplay
  function newGame() {
    if (engine) {
      Events.off(engine);
      Composite.clear(engine.world, false);
      Engine.clear(engine);
    }
    items = new Map();
    mergeQueue = [];
    createWorld();
    gt = 0; acc = 0;
    score = 0; shownScore = 0;
    dangerT = 0; lastTick = 0;
    combo = 0; lastMergeT = -10;
    shake = 0;
    particles = []; texts = []; ghosts = [];
    reached = ITEMS.map(() => false);
    maxLevel = -1;
    dropper.level = randomDrop();
    dropper.ready = true;
    dropper.appear = 0;
    dropper.cooldown = 0;
    nextLevel = randomDrop();
    markReached(dropper.level);
    markReached(nextLevel);
    updateNext();
    updateHUD(true);
    updateEvo();
    state = 'play';
  }

  function drop() {
    if (state !== 'play' || !dropper.ready) return;
    const lvl = dropper.level;
    const r = ITEMS[lvl].radius;
    const x = clampX(dropper.tx, r);
    dropper.x = x;
    addItem(lvl, x, DROP_Y, { dropped: true, vel: { x: 0, y: 2 }, angle: 0 });
    A.plop(lvl);
    dropper.ready = false;
    dropper.cooldown = DROP_COOLDOWN;
    dropper.level = nextLevel;
    nextLevel = randomDrop();
    markReached(nextLevel);
    updateNext();
  }

  const clampX = (x, r) => Math.max(TANK_L + r + 1, Math.min(TANK_R - r - 1, x));

  /** Une arme apparaît dans la partie (pioche ou fusion). Renvoie true si jamais vue. */
  function markReached(lvl) {
    const isNew = !store.data.discovered[lvl];
    if (isNew) {
      store.data.discovered[lvl] = true;
      store.save();
    }
    const first = !reached[lvl];
    reached[lvl] = true;
    const up = lvl > maxLevel;
    if (up) maxLevel = lvl;
    if (first || up) updateEvo(first ? lvl : undefined);
    return isNew;
  }

  function onReach(lvl) {
    const prev = maxLevel;
    const isNew = markReached(lvl);
    if (lvl > prev && lvl >= 3) {
      A.jingle();
      toast(lvl, (isNew ? 'Nouvelle arme : ' : 'Débloqué : ') + ITEMS[lvl].name + ' !');
    }
  }

  function addScore(pts, x, y, big) {
    score += pts;
    floatText(x, y, '+' + pts, big ? '#ff5d8f' : '#ff7aa2', big ? 40 : 22 + Math.min(14, pts / 10));
    const chip = document.createElement('span');
    chip.className = 'score-pop';
    chip.textContent = '+' + pts;
    elScoreBox.appendChild(chip);
    chip.addEventListener('animationend', () => chip.remove());
    elScore.classList.remove('bump');
    void elScore.offsetWidth;
    elScore.classList.add('bump');
  }

  function physicsStep() {
    Engine.update(engine, STEP * 1000);
    processMerges();
    gt += STEP;

    let danger = false;
    for (const it of items.values()) {
      const b = it.body;
      if (it.grow) {
        const cur = b.circleRadius;
        const nxt = Math.min(it.r, cur * 1.045 + 0.4);
        Body.scale(b, nxt / cur, nxt / cur);
        if (nxt >= it.r) it.grow = false;
      }
      const sp = b.speed;
      if (sp > 26) Body.setVelocity(b, { x: b.velocity.x * 26 / sp, y: b.velocity.y * 26 / sp });
      if (!it.merging && gt - it.born > 1.1 && b.position.y - it.r < TANK_TOP) danger = true;
    }

    if (danger) {
      dangerT += STEP;
      const sec = Math.floor(dangerT);
      if (dangerT > 0.3 && sec !== lastTick) { lastTick = sec; A.tick(sec >= 2); }
      if (dangerT >= DANGER_TIME) gameOver();
    } else {
      dangerT = Math.max(0, dangerT - STEP * 2);
      if (dangerT === 0) lastTick = -1;
    }
  }

  function gameOver() {
    state = 'over';
    pointer.active = false;
    A.gameOver();
    const best = store.data.best || 0;
    const record = score > best;
    if (record) { store.data.best = score; store.save(); }
    setTimeout(() => showGameOver(record), 750);
  }

  // ------------------------------------------------------------ effets
  function burst(x, y, r, lvl, mega) {
    const n = Math.round((mega ? 70 : 10 + lvl * 2.2));
    particles.push({ type: 'ring', x, y, r0: r * 0.5, r1: r * (mega ? 2.6 : 1.6), t: 0, life: mega ? 0.8 : 0.42 });
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (mega ? 240 : 110) + Math.random() * (mega ? 420 : 200 + lvl * 14);
      const star = Math.random() < 0.55;
      particles.push({
        type: star ? 'star' : 'confetti',
        x: x + Math.cos(a) * r * 0.5,
        y: y + Math.sin(a) * r * 0.5,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 60,
        size: star ? 4 + Math.random() * (4 + lvl * 0.4) : 3 + Math.random() * 3,
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 12,
        color: PASTELS[(Math.random() * PASTELS.length) | 0],
        t: 0,
        life: 0.55 + Math.random() * (mega ? 1 : 0.5)
      });
    }
  }

  function floatText(x, y, text, color, size) {
    texts.push({ x, y, text, color, size, t: 0, life: 1 });
  }

  function updateFx(dt) {
    for (const p of particles) {
      p.t += dt;
      if (p.type !== 'ring') {
        const drag = p.type === 'confetti' ? 2.6 : 3.2;
        p.vx -= p.vx * drag * dt;
        p.vy -= p.vy * drag * dt;
        p.vy += (p.type === 'confetti' ? 260 : 120) * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
      }
    }
    particles = particles.filter(p => p.t < p.life);
    for (const t of texts) { t.t += dt; t.y -= 38 * dt; }
    texts = texts.filter(t => t.t < t.life);
    for (const g of ghosts) g.t += dt / 0.11;
    ghosts = ghosts.filter(g => g.t < 1);
    shake = Math.max(0, shake - dt * 40);
  }

  /** Ressort amorti : déformation élastique façon gelée. */
  function updateSquish(dt) {
    for (const it of items.values()) {
      const s = it.sq;
      s.v += (-560 * s.d - 9 * s.v) * dt;
      s.d += s.v * dt;
      if (s.d > 0.24) { s.d = 0.24; s.v *= -0.3; }
      if (s.d < -0.18) { s.d = -0.18; s.v *= -0.3; }
      if (it.spawn < 1) it.spawn = Math.min(1, it.spawn + dt / 0.45);
      if (rt > it.blinkAt) {
        it.blinkUntil = rt + 0.13;
        const fast = it.level === 1;          // la flashbang cligne nerveusement
        it.blinkAt = rt + (fast ? 0.7 + Math.random() * 1.4 : 2 + Math.random() * 5);
      }
    }
  }

  const elasticOut = t => t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;

  // ------------------------------------------------------------- rendu
  function render() {
    const k = scale * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const sx = shake ? (Math.random() - 0.5) * shake : 0;
    const sy = shake ? (Math.random() - 0.5) * shake : 0;
    ctx.setTransform(k, 0, 0, k, sx * k, sy * k);

    drawTankBack();
    if (items) {
      for (const it of items.values()) drawItem(it);
      for (const g of ghosts) drawGhost(g);
    }
    drawTankFront();
    if (state === 'play' || state === 'pause') drawDropper();
    drawParticles();
    drawTexts();
    if (state === 'play' && dangerT > 0.3) drawCountdown();
  }

  function roundRectPath(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function tankPath(inset) {
    const l = TANK_L - inset, r = TANK_R + inset, b = TANK_B + inset, t = TANK_TOP - 46, rad = 34 + inset;
    ctx.beginPath();
    ctx.moveTo(l, t);
    ctx.lineTo(l, b - rad);
    ctx.arcTo(l, b, l + rad, b, rad);
    ctx.lineTo(r - rad, b);
    ctx.arcTo(r, b, r, b - rad, rad);
    ctx.lineTo(r, t);
  }

  function drawTankBack() {
    // Intérieur en verre dépoli.
    tankPath(0);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, TANK_TOP - 46, 0, TANK_B);
    g.addColorStop(0, 'rgba(255,255,255,0.22)');
    g.addColorStop(1, 'rgba(255,255,255,0.5)');
    ctx.fillStyle = g;
    ctx.fill();

    // Rail de la petite grue.
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(TANK_L + 6, 14);
    ctx.lineTo(TANK_R - 6, 14);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(176,150,214,0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Ligne de danger.
    const hot = state === 'play' && dangerT > 0.05;
    const pulse = hot ? 0.6 + 0.4 * Math.sin(rt * 14) : 0.55;
    ctx.save();
    ctx.setLineDash([10, 9]);
    ctx.lineDashOffset = -rt * 18;
    ctx.strokeStyle = hot ? `rgba(255,70,120,${pulse})` : 'rgba(255,120,160,0.55)';
    ctx.lineWidth = hot ? 4 : 3;
    ctx.beginPath();
    ctx.moveTo(TANK_L + 4, TANK_TOP);
    ctx.lineTo(TANK_R - 4, TANK_TOP);
    ctx.stroke();
    ctx.restore();
    ctx.font = '600 11px Fredoka, ui-rounded, system-ui, sans-serif';
    ctx.fillStyle = hot ? `rgba(255,70,120,${pulse})` : 'rgba(255,120,160,0.7)';
    ctx.textAlign = 'left';
    ctx.fillText('LIGNE ROUGE', TANK_L + 10, TANK_TOP - 7);

    if (hot) {
      tankPath(0);
      ctx.closePath();
      ctx.fillStyle = `rgba(255,90,130,${0.05 + 0.06 * Math.sin(rt * 14)})`;
      ctx.fill();
    }
  }

  function drawTankFront() {
    // Parois épaisses arrondies.
    tankPath(5);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 10;
    ctx.stroke();
    tankPath(5);
    ctx.strokeStyle = 'rgba(176,150,214,0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Reflets du verre.
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(TANK_L + 14, TANK_TOP + 10);
    ctx.lineTo(TANK_L + 14, TANK_B - 70);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(TANK_L + 28, TANK_TOP + 20);
    ctx.lineTo(TANK_L + 28, TANK_TOP + 120);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(TANK_R - 14, TANK_B - 120);
    ctx.lineTo(TANK_R - 14, TANK_B - 50);
    ctx.stroke();
  }

  function sprite(level, closed) { return raster[level][closed ? 1 : 0]; }

  function drawItem(it) {
    const b = it.body, s = it.sq;
    const grow = it.spawn < 1 ? 0.55 + 0.45 * elasticOut(it.spawn) : 1;
    const breath = 1 + 0.014 * Math.sin(rt * 2.3 + it.phase);
    const size = it.r * 1.03 * grow * breath;
    ctx.save();
    ctx.translate(b.position.x, b.position.y);
    if (Math.abs(s.d) > 0.003) {
      ctx.rotate(s.a);
      ctx.scale(1 - s.d, 1 + s.d * 0.85);
      ctx.rotate(-s.a);
    }
    ctx.rotate(b.angle);
    ctx.drawImage(sprite(it.level, rt < it.blinkUntil), -size, -size, size * 2, size * 2);
    ctx.restore();
  }

  function drawGhost(g) {
    const t = g.t, e = t * t;
    const x = g.x0 + (g.x1 - g.x0) * e, y = g.y0 + (g.y1 - g.y0) * e;
    const size = g.r * 1.03 * (1 - 0.35 * t);
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.translate(x, y);
    ctx.rotate(g.angle);
    ctx.drawImage(sprite(g.level, true), -size, -size, size * 2, size * 2);
    ctx.restore();
  }

  function drawDropper() {
    const lvl = dropper.level, r = ITEMS[lvl].radius;
    const x = dropper.x;
    // Chariot sur le rail.
    ctx.fillStyle = '#ffffff';
    roundRectPath(x - 20, 6, 40, 16, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(176,150,214,0.8)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = '#ff9fbd';
    ctx.beginPath();
    ctx.arc(x, 14, 3.5, 0, Math.PI * 2);
    ctx.fill();

    if (!dropper.ready) return;
    const bob = Math.sin(rt * 3) * 2;
    const a = dropper.appear < 1 ? 0.3 + 0.7 * elasticOut(dropper.appear) : 1;
    const y = DROP_Y + bob;

    // Fil + ligne de visée.
    ctx.strokeStyle = 'rgba(176,150,214,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 22);
    ctx.lineTo(x, y - r * a);
    ctx.stroke();
    ctx.save();
    ctx.setLineDash([4, 9]);
    ctx.lineDashOffset = rt * 20;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y + r + 6);
    ctx.lineTo(x, TANK_B - 4);
    ctx.stroke();
    ctx.restore();

    const size = r * 1.03 * a;
    const sw = Math.sin(rt * 2.2) * 0.06;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(sw);
    const blink = (rt % 3.4) < 0.13;
    ctx.drawImage(sprite(lvl, blink), -size, -size, size * 2, size * 2);
    ctx.restore();
  }

  function drawStar(x, y, r, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? r * 0.46 : r;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawParticles() {
    for (const p of particles) {
      const k = p.t / p.life;
      if (p.type === 'ring') {
        const e = 1 - Math.pow(1 - k, 3);
        ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - k)})`;
        ctx.lineWidth = 6 * (1 - k) + 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r0 + (p.r1 - p.r0) * e, 0, Math.PI * 2);
        ctx.stroke();
        continue;
      }
      ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      ctx.fillStyle = p.color;
      if (p.type === 'star') {
        drawStar(p.x, p.y, p.size * (1 - k * 0.4), p.rot);
      } else {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.rot * 2.3));
        roundRectPath(-p.size, -p.size * 0.6, p.size * 2, p.size * 1.2, 1.5);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawTexts() {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (const t of texts) {
      const k = t.t / t.life;
      const pop = k < 0.15 ? 0.6 + elasticOut(k / 0.15) * 0.4 : 1;
      ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      ctx.font = `700 ${Math.round(t.size * pop)}px Fredoka, ui-rounded, system-ui, sans-serif`;
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#ffffff';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
    ctx.textBaseline = 'alphabetic';
  }

  function drawCountdown() {
    const left = Math.max(0, DANGER_TIME - dangerT);
    const n = Math.ceil(left);
    const frac = left - Math.floor(left);
    const s = 1 + 0.35 * Math.pow(frac, 3);
    ctx.save();
    ctx.translate(VIEW_W / 2, TANK_TOP + 150);
    ctx.scale(s, s);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 110px Fredoka, ui-rounded, system-ui, sans-serif';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 14;
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.globalAlpha = Math.min(1, (dangerT - 0.3) * 4);
    ctx.strokeText(n, 0, 0);
    ctx.fillStyle = '#ff5d8f';
    ctx.fillText(n, 0, 0);
    ctx.font = '700 20px Fredoka, ui-rounded, system-ui, sans-serif';
    ctx.lineWidth = 6;
    ctx.strokeText('Débordement !', 0, 70);
    ctx.fillText('Débordement !', 0, 70);
    ctx.restore();
  }

  // ------------------------------------------------------------- boucle
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    rt += dt;

    if (state === 'play') {
      acc += dt;
      let n = 0;
      while (acc >= STEP && n < 4) { physicsStep(); acc -= STEP; n++; }
      if (n === 4) acc = 0;
      dropper.x += (dropper.tx - dropper.x) * Math.min(1, dt * 28);
      if (!dropper.ready) {
        dropper.cooldown -= dt;
        if (dropper.cooldown <= 0) { dropper.ready = true; dropper.appear = 0; }
      }
      if (dropper.appear < 1) dropper.appear = Math.min(1, dropper.appear + dt / 0.4);
      dropper.tx = clampX(dropper.tx, ITEMS[dropper.level].radius);
    }
    if (state !== 'pause') {
      if (items) updateSquish(dt);
      updateFx(dt);
    }
    if (shownScore !== score) {
      shownScore += (score - shownScore) * Math.min(1, dt * 9);
      if (Math.abs(score - shownScore) < 0.5) shownScore = score;
      updateHUD();
    }
    render();
    requestAnimationFrame(frame);
  }

  // ------------------------------------------------------------ entrées
  function pointerX(e) {
    const r = canvas.getBoundingClientRect();
    return (e.clientX - r.left) / r.width * VIEW_W;
  }

  board.addEventListener('pointerdown', e => {
    A.unlock();
    if (state !== 'play') return;
    e.preventDefault();
    pointer.active = true;
    pointer.id = e.pointerId;
    try { board.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    dropper.tx = pointerX(e);
    if (e.pointerType !== 'mouse') dropper.x = clampX(dropper.tx, ITEMS[dropper.level].radius);
  });
  board.addEventListener('pointermove', e => {
    if (state !== 'play') return;
    if (pointer.active || e.pointerType === 'mouse') dropper.tx = pointerX(e);
  });
  const release = e => {
    if (!pointer.active || e.pointerId !== pointer.id) return;
    pointer.active = false;
    if (e.type === 'pointerup') {
      dropper.tx = pointerX(e);
      drop();
    }
  };
  board.addEventListener('pointerup', release);
  board.addEventListener('pointercancel', release);

  window.addEventListener('keydown', e => {
    if (state === 'play') {
      if (e.key === 'ArrowLeft') dropper.tx -= 24;
      else if (e.key === 'ArrowRight') dropper.tx += 24;
      else if (e.key === ' ' || e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); drop(); }
      else if (e.key === 'Escape' || e.key === 'p') pause();
    } else if (state === 'pause' && (e.key === 'Escape' || e.key === 'p')) resume();
  });

  // Bloque le zoom par pincement sur iOS.
  document.addEventListener('gesturestart', e => e.preventDefault());

  // ----------------------------------------------------------------- HUD
  function updateHUD(force) {
    elScore.textContent = Math.round(shownScore);
    const best = Math.max(store.data.best || 0, score);
    elBest.textContent = best;
    if (force) shownScore = score;
  }

  function updateNext() {
    elNext.src = svgURL(nextLevel);
    elNext.alt = ITEMS[nextLevel].name;
    elNextPill.classList.remove('swap');
    void elNextPill.offsetWidth;
    elNextPill.classList.add('swap');
  }

  function buildEvo() {
    elEvo.innerHTML = '';
    ITEMS.forEach((it, lvl) => {
      const d = document.createElement('div');
      d.className = 'evo-item';
      d.title = `${lvl + 1}. ${it.name}`;
      const img = document.createElement('img');
      img.src = svgURL(lvl);
      img.alt = it.name;
      img.draggable = false;
      d.appendChild(img);
      elEvo.appendChild(d);
    });
  }

  function updateEvo(popLevel) {
    [...elEvo.children].forEach((d, lvl) => {
      d.classList.toggle('got', !!reached[lvl]);
      d.classList.toggle('seen', !reached[lvl] && !!store.data.discovered[lvl]);
      d.classList.toggle('locked', !reached[lvl] && !store.data.discovered[lvl]);
      d.classList.toggle('max', lvl === maxLevel && maxLevel >= 0);
      if (lvl === popLevel) {
        d.classList.remove('pop');
        void d.offsetWidth;
        d.classList.add('pop');
      }
    });
  }

  let toastTimer = 0;
  function toast(lvl, text) {
    elToast.innerHTML = '';
    const img = document.createElement('img');
    img.src = svgURL(lvl);
    img.alt = '';
    const span = document.createElement('span');
    span.textContent = text;
    elToast.append(img, span);
    elToast.classList.remove('show');
    void elToast.offsetWidth;
    elToast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => elToast.classList.remove('show'), 2200);
  }

  // --------------------------------------------------------------- menus
  const overlays = { start: $('menu-start'), pause: $('menu-pause'), over: $('menu-over') };
  function showOverlay(name) {
    Object.entries(overlays).forEach(([k, el]) => {
      el.classList.toggle('show', k === name);
      el.setAttribute('aria-hidden', k === name ? 'false' : 'true');
    });
  }

  function start() {
    A.unlock();
    A.startMusic();
    A.click();
    showOverlay(null);
    newGame();
  }

  function pause() {
    if (state !== 'play') return;
    state = 'pause';
    pointer.active = false;
    A.click();
    showOverlay('pause');
  }

  function resume() {
    if (state !== 'pause') return;
    A.unlock();
    A.click();
    showOverlay(null);
    acc = 0;
    last = performance.now();
    state = 'play';
  }

  const MEDALS = [
    { min: 0,  name: 'Recrue',   c1: '#e8d2bf', c2: '#c49a78' },
    { min: 5,  name: 'Bronze',   c1: '#ffcf9e', c2: '#d98b4f' },
    { min: 7,  name: 'Argent',   c1: '#f4f6ff', c2: '#a9b1cc' },
    { min: 9,  name: 'Or',       c1: '#fff1a8', c2: '#f2b632' },
    { min: 10, name: 'Légende',  c1: '#ffe0f5', c2: '#b9a4ff' }
  ];

  function medalSVG(m) {
    return `<svg viewBox="0 0 120 140" aria-hidden="true">
      <defs><radialGradient id="mg" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="${m.c1}"/><stop offset="1" stop-color="${m.c2}"/></radialGradient></defs>
      <path d="M38 4 L54 48 L40 52 L24 8 Z" fill="#ff9fbd" stroke="#3d2c4e" stroke-width="4" stroke-linejoin="round"/>
      <path d="M82 4 L66 48 L80 52 L96 8 Z" fill="#a9d8ff" stroke="#3d2c4e" stroke-width="4" stroke-linejoin="round"/>
      <circle cx="60" cy="86" r="44" fill="url(#mg)" stroke="#3d2c4e" stroke-width="5"/>
      <circle cx="60" cy="86" r="33" fill="none" stroke="#fff" stroke-width="3" opacity=".6"/>
      <path d="M60 60 l8 16 l18 2 l-13 12 l4 18 l-17 -9 l-17 9 l4 -18 l-13 -12 l18 -2 z" fill="#fff" stroke="#3d2c4e" stroke-width="3.5" stroke-linejoin="round"/>
      <ellipse cx="44" cy="66" rx="10" ry="5" fill="#fff" opacity=".7" transform="rotate(-35 44 66)"/>
    </svg>`;
  }

  function showGameOver(record) {
    const lvl = Math.max(0, maxLevel);
    const medal = [...MEDALS].reverse().find(m => lvl >= m.min);
    $('over-medal').innerHTML = medalSVG(medal);
    $('over-medal-name').textContent = 'Médaille ' + medal.name;
    $('over-score').textContent = score;
    $('over-best').textContent = store.data.best || 0;
    $('over-record').hidden = !record;
    $('over-weapon-img').src = svgURL(lvl);
    $('over-weapon-name').textContent = ITEMS[lvl].name;
    showOverlay('over');
  }

  // ----------------------------------------------------------- réglages
  function applySettings() {
    const { music, sfx } = store.data;
    A.setMusic(music);
    A.setSfx(sfx);
    $('btn-music').classList.toggle('off', !music);
    $('btn-music').setAttribute('aria-pressed', String(music));
    $('btn-sfx').classList.toggle('off', !sfx);
    $('btn-sfx').setAttribute('aria-pressed', String(sfx));
    $('opt-music').checked = music;
    $('opt-sfx').checked = sfx;
  }

  function setMusic(on) { store.data.music = on; store.save(); applySettings(); }
  function setSfx(on) { store.data.sfx = on; store.save(); applySettings(); A.click(); }

  $('btn-music').addEventListener('click', () => { A.unlock(); setMusic(!store.data.music); });
  $('btn-sfx').addEventListener('click', () => { A.unlock(); setSfx(!store.data.sfx); });
  $('opt-music').addEventListener('change', e => setMusic(e.target.checked));
  $('opt-sfx').addEventListener('change', e => setSfx(e.target.checked));
  $('btn-pause').addEventListener('click', () => (state === 'pause' ? resume() : pause()));
  $('btn-play').addEventListener('click', start);
  $('btn-resume').addEventListener('click', resume);
  $('btn-restart').addEventListener('click', () => { A.click(); showOverlay(null); newGame(); });
  $('btn-replay').addEventListener('click', () => { A.unlock(); A.click(); showOverlay(null); newGame(); });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pause();
      A.suspend();
    } else {
      A.resume();
    }
  });

  // ---------------------------------------------------------- démarrage
  function initStartScreen() {
    const grid = $('start-showcase');
    ITEMS.forEach((it, lvl) => {
      const img = document.createElement('img');
      img.src = svgURL(lvl);
      img.alt = it.name;
      img.style.setProperty('--d', (lvl * 0.13).toFixed(2) + 's');
      img.style.setProperty('--s', (0.62 + lvl * 0.04).toFixed(2));
      grid.appendChild(img);
    });
    $('start-best').textContent = store.data.best || 0;
  }

  async function boot() {
    buildEvo();
    initStartScreen();
    applySettings();
    reached = ITEMS.map(() => false);
    updateEvo();
    nextLevel = 0;
    updateNext();
    updateHUD(true);
    resize();
    await loadImages();
    buildRaster();
    window.addEventListener('resize', resize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
    showOverlay('start');
    requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
  }

  boot();

  // Accès pour le débogage / les tests automatisés.
  window.__game = {
    get state() { return state; },
    get score() { return score; },
    get count() { return items ? items.size : 0; },
    get maxLevel() { return maxLevel; },
    drop, start, newGame,
    aim(x) { dropper.tx = x; },
    spawn(level, x, y) { return addItem(level, x, y, { dropped: true }); }
  };

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
