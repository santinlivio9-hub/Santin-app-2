/* =========================================================================
   Chibi Arsenal — Fusion Tactique
   Puzzle physique façon Suika Game : deux armes identiques fusionnent en
   l'arme supérieure. Moteur physique : Matter.js (corps composés qui épousent
   la silhouette de chaque arme). Rendu : Canvas 2D.
   ========================================================================= */
(function () {
  'use strict';

  const { Engine, Bodies, Body, Composite, Events, Query } = Matter;
  const { ITEMS, svgURL } = Sprites;
  const A = GameAudio;

  // ------------------------------------------------------------ constantes
  const VIEW_W = 440, VIEW_H = 700;          // monde logique
  const TANK_L = 14, TANK_R = 426;           // parois intérieures de la cuve
  const TANK_B = 686;                        // fond de la cuve
  const TANK_TOP = 132;                      // ligne de danger
  const DROP_Y = 70;                         // hauteur de l'arme en attente
  const STEP = 1 / 60;                       // pas physique fixe
  const DANGER_TIME = 3;                     // secondes avant Game Over
  const DROP_COOLDOWN = 0.45;
  const DROP_WEIGHTS = [30, 26, 20, 14, 10]; // seules les 5 premières tombent
  const POINTS = [0, 2, 5, 10, 16, 25, 40, 60, 90, 130, 200];
  const GRAAL_BONUS = 500;
  const MAX_LEVEL = ITEMS.length - 1;
  // Points nécessaires pour regagner une charge : le C4 et la Secousse restent rares.
  const RECHARGE = { swap: 1500, shake: 4000, c4: 8000 };
  const POWER_MAX = 2;
  const SQUASH = 0.15;                       // écrasement max (15 %)
  const STORE_KEY = 'chibiArsenal.v1';
  const PASTELS = ['#ffb3c8', '#ffd98a', '#a8ecc8', '#a9d8ff', '#cdbcff', '#ffc99a', '#ffffff'];

  const BODY_OPTS = { restitution: 0.32, friction: 0.35, frictionStatic: 0.6, frictionAir: 0.014, label: 'item' };
  // Réglages physiques modifiables depuis le menu admin (non sauvegardés).
  const tuning = {
    gravity: 1.35, restitution: BODY_OPTS.restitution, frictionAir: BODY_OPTS.frictionAir, friction: BODY_OPTS.friction,
    scoreMult: 1, god: false, freePowers: false
  };
  const PART_OPTS = { density: 0.0012, slop: 0.01 };
  const OUTLINE = 2.5;                       // demi-épaisseur du contour (unités de dessin)
  const STICKER = 2;                         // liseré blanc visible (unités monde)

  // ---------------------------------------------------------------- thèmes
  const THEMES = {
    pastel: {
      name: 'Pastel Chill', desc: 'Dégradé apaisant, ambiance chill.', price: 0, meta: '#f6eefe',
      sticker: '#ffffff', halo: 'rgba(90,60,130,0.22)', shadow: 'rgba(90,50,140,0.22)',
      tankTop: 'rgba(255,255,255,0.22)', tankBot: 'rgba(255,255,255,0.5)',
      wall: 'rgba(255,255,255,0.95)', wallInner: 'rgba(176,150,214,0.35)', glow: null,
      reflect: 'rgba(255,255,255,0.45)', rail: 'rgba(255,255,255,0.85)', railInner: 'rgba(176,150,214,0.45)',
      cart: '#ffffff', cartStroke: 'rgba(176,150,214,0.8)', cartDot: '#ff9fbd', string: 'rgba(176,150,214,0.7)',
      guide: 'rgba(255,255,255,0.85)', danger: '255,110,150', text: '#ff7aa2', textStroke: '#ffffff', ring: '255,255,255'
    },
    atelier: {
      name: 'Établi d’Armurier', desc: 'Établi en bois sombre, néons tamisés et grille d’accroche.', price: 350, meta: '#2b1a12',
      sticker: '#fff3e2', halo: 'rgba(0,0,0,0.45)', shadow: 'rgba(0,0,0,0.45)',
      tankTop: 'rgba(255,225,190,0.04)', tankBot: 'rgba(255,225,190,0.12)',
      wall: 'rgba(255,236,214,0.9)', wallInner: 'rgba(95,242,255,0.55)', glow: 'rgba(95,242,255,0.85)',
      reflect: 'rgba(255,240,220,0.18)', rail: 'rgba(255,190,120,0.75)', railInner: 'rgba(90,50,30,0.6)',
      cart: '#ffcf8a', cartStroke: 'rgba(90,50,30,0.8)', cartDot: '#ff5fa8', string: 'rgba(255,190,120,0.7)',
      guide: 'rgba(95,242,255,0.7)', danger: '255,80,160', text: '#ff7ac0', textStroke: '#2b1a12', ring: '255,220,170'
    },
    blueprint: {
      name: 'Blueprint', desc: 'Schéma d’ingénieur bleu technique, traits nets.', price: 750, meta: '#1b4f8a',
      sticker: '#eaf4ff', halo: 'rgba(5,30,70,0.4)', shadow: 'rgba(5,25,60,0.45)',
      tankTop: 'rgba(255,255,255,0.03)', tankBot: 'rgba(255,255,255,0.09)',
      wall: 'rgba(234,244,255,0.95)', wallInner: 'rgba(120,180,255,0.6)', glow: null, grid: true,
      reflect: 'rgba(255,255,255,0.18)', rail: 'rgba(234,244,255,0.85)', railInner: 'rgba(27,79,138,0.8)',
      cart: '#eaf4ff', cartStroke: 'rgba(27,79,138,0.9)', cartDot: '#ffb547', string: 'rgba(234,244,255,0.7)',
      guide: 'rgba(234,244,255,0.75)', danger: '255,120,110', text: '#ffd36b', textStroke: '#1b4f8a', ring: '234,244,255'
    },
    night: {
      name: 'Vision Nocturne', desc: 'Vert phosphore épuré, lignes de balayage.', price: 750, meta: '#04140a',
      sticker: '#c8ffd4', halo: 'rgba(0,0,0,0.5)', shadow: 'rgba(0,0,0,0.55)',
      tankTop: 'rgba(120,255,150,0.03)', tankBot: 'rgba(120,255,150,0.08)',
      wall: 'rgba(170,255,190,0.85)', wallInner: 'rgba(90,255,130,0.5)', glow: 'rgba(90,255,130,0.8)',
      reflect: 'rgba(170,255,190,0.15)', rail: 'rgba(140,255,170,0.7)', railInner: 'rgba(4,20,10,0.8)',
      cart: '#9dffb4', cartStroke: 'rgba(4,20,10,0.9)', cartDot: '#ff6a6a', string: 'rgba(140,255,170,0.6)',
      guide: 'rgba(140,255,170,0.7)', danger: '255,100,100', text: '#d8ff7a', textStroke: '#04140a', ring: '170,255,190'
    }
  };
  THEMES.cyber = {
    name: 'Stand Cyberpunk', desc: 'Stand de tir furtif, néons magenta et cyan.', price: 1500, meta: '#0b0618',
    sticker: '#f4e9ff', halo: 'rgba(0,0,0,0.5)', shadow: 'rgba(0,0,0,0.55)',
    tankTop: 'rgba(180,80,255,0.04)', tankBot: 'rgba(0,240,255,0.1)',
    wall: 'rgba(240,225,255,0.9)', wallInner: 'rgba(255,60,200,0.6)', glow: 'rgba(255,60,200,0.85)',
    reflect: 'rgba(0,240,255,0.18)', rail: 'rgba(0,240,255,0.8)', railInner: 'rgba(11,6,24,0.8)',
    cart: '#00f0ff', cartStroke: 'rgba(11,6,24,0.9)', cartDot: '#ff3cc8', string: 'rgba(0,240,255,0.6)',
    guide: 'rgba(0,240,255,0.7)', danger: '255,60,120', text: '#00f0ff', textStroke: '#0b0618', ring: '255,120,230'
  };
  THEMES.desert = {
    name: 'Camo Tactique', desc: 'Camouflage désert discret, tons sable.', price: 2200, meta: '#cdb48a',
    sticker: '#fffaf0', halo: 'rgba(90,60,20,0.25)', shadow: 'rgba(90,60,20,0.28)',
    tankTop: 'rgba(255,250,235,0.18)', tankBot: 'rgba(255,250,235,0.42)',
    wall: 'rgba(255,248,232,0.95)', wallInner: 'rgba(140,105,60,0.4)', glow: null,
    reflect: 'rgba(255,255,255,0.4)', rail: 'rgba(255,248,232,0.9)', railInner: 'rgba(140,105,60,0.5)',
    cart: '#fff8e8', cartStroke: 'rgba(120,90,50,0.8)', cartDot: '#ff8a3d', string: 'rgba(120,90,50,0.6)',
    guide: 'rgba(255,255,255,0.85)', danger: '220,60,60', text: '#c2410c', textStroke: '#fff8e8', ring: '255,248,232'
  };
  const THEME_ORDER = ['pastel', 'atelier', 'night', 'blueprint', 'cyber', 'desert'];

  // Finitions d'armes.
  const SKINS = {
    classic: { name: 'Style Chibi Classique', desc: 'Les couleurs signature de chaque arme.', price: 0 },
    camo: { name: 'Camouflage Forêt / Urbain', desc: 'Motif camo texturé, teinté par arme.', price: 500 },
    gold: { name: 'Plaqué Or 24K', desc: 'Or poli, scintillements d\u2019étoiles.', price: 2000 },
    neon: { name: 'Néon Glow / Tron', desc: 'Contours fluo lumineux sur fond sombre.', price: 3500 }
  };
  const SKIN_ORDER = ['classic', 'camo', 'gold', 'neon'];

  // Traînées de chute (effet qui suit l'arme pendant qu'elle tombe).
  const TRAILS = {
    none: { name: 'Aucune', desc: 'Chute sobre, sans effet.', price: 0 },
    smoke: { name: 'Fumée de poudre', desc: 'Petits nuages gris tout doux.', price: 400 },
    sparks: { name: 'Étincelles dorées', desc: 'Micro-particules scintillantes.', price: 900 },
    laser: { name: 'Laser néon', desc: 'Faisceau lumineux rémanent.', price: 1800 }
  };
  const TRAIL_ORDER = ['none', 'smoke', 'sparks', 'laser'];

  // Packs de bruitages (voir audio.js).
  const SFX_PACKS = {
    cartoon: { name: 'Cartoon Plop', desc: 'Plops et pops pétillants (défaut).', price: 0 },
    meca: { name: 'Réaliste & Mécanique', desc: 'Culasse en acier, encliquetages secs.', price: 800 },
    arcade: { name: 'Arcade 8-Bit', desc: 'Bips rétro façon console de poche.', price: 1200 }
  };
  const SFX_ORDER = ['cartoon', 'meca', 'arcade'];

  // Les 4 rayons de la boutique : catalogue, clé "possédés" et clé "équipé" du stockage.
  const CATALOG = {
    decor: { label: 'Décors', items: THEMES, order: THEME_ORDER, owned: 'ownedThemes', eq: 'theme' },
    skins: { label: 'Finitions', items: SKINS, order: SKIN_ORDER, owned: 'ownedSkins', eq: 'skin' },
    trails: { label: 'Traînées', items: TRAILS, order: TRAIL_ORDER, owned: 'ownedTrails', eq: 'trail' },
    sfx: { label: 'Sons', items: SFX_PACKS, order: SFX_ORDER, owned: 'ownedSfx', eq: 'sfxPack' }
  };

  // Douilles d'Or gagnées en créant chaque niveau par fusion (Graal x2 : 50).
  const COINS = [0, 1, 1, 2, 3, 4, 6, 8, 11, 16, 25];
  const COIN_GRAAL_PAIR = 50;
  const COIN_SCORE_RATE = 100;               // bonus de fin : 1 douille / 100 points

  // -------------------------------------------------------------- stockage
  const store = (() => {
    let data = { best: 0, discovered: [], stats: [], music: true, sfx: true, haptics: true, motion: false, theme: 'pastel', coins: 0, ownedThemes: ['pastel'], ownedSkins: ['classic'], skin: 'classic',
      ownedTrails: ['none'], trail: 'none', ownedSfx: ['cartoon'], sfxPack: 'cartoon' };
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) data = Object.assign(data, JSON.parse(raw));
    } catch (e) { /* stockage indisponible (navigation privée) */ }
    let timer = 0;
    const write = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ } };
    return {
      data,
      save() { clearTimeout(timer); write(); },
      saveSoon() { clearTimeout(timer); timer = setTimeout(write, 400); }
    };
  })();
  ['discovered', 'stats'].forEach(k => { if (!Array.isArray(store.data[k])) store.data[k] = []; });
  store.data.coins = Math.max(0, Math.floor(+store.data.coins || 0));
  // Toujours posséder les articles gratuits et ce qui est équipé (y compris anciennes versions).
  for (const cat of Object.values(CATALOG)) {
    if (!Array.isArray(store.data[cat.owned])) store.data[cat.owned] = [];
    if (!cat.items[store.data[cat.eq]]) store.data[cat.eq] = cat.order[0];
    for (const k of [cat.order[0], store.data[cat.eq]]) if (!store.data[cat.owned].includes(k)) store.data[cat.owned].push(k);
  }
  A.pack = store.data.sfxPack;
  const stat = lvl => (store.data.stats[lvl] = store.data.stats[lvl] || { first: 0, count: 0, best: null });
  let T = THEMES[store.data.theme];

  // ------------------------------------------------------------------- DOM
  const $ = id => document.getElementById(id);
  const stage = $('stage'), board = $('board'), canvas = $('game');
  const ctx = canvas.getContext('2d');
  const elScore = $('score'), elBest = $('best'), elScoreBox = $('score-box');
  const elNext = $('next-img'), elNextPill = $('next');
  const elEvo = $('evo'), elToast = $('toast'), elCombo = $('combo'), elHint = $('hint');

  // --------------------------------------------------------------- haptique
  // navigator.vibrate (Android) ; sur iOS 18+, le basculement d'un
  // <input switch> déclenche un retour haptique natif.
  const Haptics = (() => {
    const canVibrate = typeof navigator.vibrate === 'function';
    // iOS 18+ : basculer un <input switch> joue le "tic" haptique du système.
    // Il doit être déclenché pendant un geste (toucher) pour être ressenti.
    const tick = () => {
      const label = document.createElement('label');
      label.ariaHidden = 'true';
      label.style.display = 'none';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      label.appendChild(input);
      document.head.appendChild(label);
      label.click();
      label.remove();
    };
    return {
      /**
       * Android / standard : navigator.vibrate. iPhone (pas de vibrate) : clic du
       * Taptic Engine via l'interrupteur + impulsion sub-basse 35 Hz (A.thump)
       * qui fait vibrer le châssis, y compris hors d'un geste.
       */
      pulse(pattern, strength = 1) {
        if (!store.data.haptics) return;
        if (canVibrate) {
          try { navigator.vibrate(pattern); } catch (e) { /* ignore */ }
          return;
        }
        const twice = Array.isArray(pattern) && pattern.length > 2;
        tick();
        A.thump(strength);
        if (twice) setTimeout(() => { tick(); A.thump(strength * 0.8); }, pattern[0] + pattern[1]);
      }
    };
  })();

  // ------------------------------------------------------------- sprites
  // raster[level][expression] = { c, s, m } ; expressions : 0 normal, 1 clin, 2 écrasé, 3 écarquillé
  let raster = [];
  let scale = 1, dpr = 1, rasterJob = 0;

  /** Rastérise les armes à la taille d'affichage, avec un liseré "sticker". */
  async function buildRaster() {
    const job = ++rasterJob;
    const px = scale * dpr;
    const stickerPx = Math.max(2, 2.4 * px);
    const haloPx = stickerPx + Math.max(1.2, 1.4 * px);
    const mpx = Math.ceil(haloPx + 2);
    const out = await Promise.all(ITEMS.map((it, lvl) => Promise.all([0, 1, 2, 3].map(v => new Promise(res => {
      const s = it.scale * px;
      const wpx = Math.max(4, Math.round(it.view.w * s)), hpx = Math.max(4, Math.round(it.view.h * s));
      const img = new Image();
      img.onload = () => res(compose(img, wpx, hpx, mpx, stickerPx, haloPx, px));
      img.onerror = () => res(null);
      img.src = svgURL(lvl, v, false, wpx, hpx, store.data.skin);
    })))));
    if (job === rasterJob) raster = out;
  }

  function compose(img, wpx, hpx, mpx, stickerPx, haloPx, px) {
    const W = wpx + 2 * mpx, H = hpx + 2 * mpx;
    const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
    const ring = (g, r) => {
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        g.drawImage(img, mpx + Math.cos(a) * r, mpx + Math.sin(a) * r, wpx, hpx);
      }
    };
    const halo = mk(), hg = halo.getContext('2d');
    ring(hg, haloPx);
    hg.globalCompositeOperation = 'source-in';
    hg.fillStyle = T.halo;
    hg.fillRect(0, 0, W, H);
    const sticker = mk(), sg = sticker.getContext('2d');
    ring(sg, stickerPx);
    sg.globalCompositeOperation = 'source-in';
    sg.fillStyle = T.sticker;
    sg.fillRect(0, 0, W, H);
    const c = mk(), g = c.getContext('2d');
    g.drawImage(halo, 0, 0);
    g.drawImage(sticker, 0, 0);
    g.drawImage(img, mpx, mpx, wpx, hpx);
    // Ombre portée : silhouette sombre, dessinée décalée sous chaque arme.
    const shadow = mk(), shg = shadow.getContext('2d');
    shg.drawImage(sticker, 0, 0);
    shg.globalCompositeOperation = 'source-in';
    shg.fillStyle = T.shadow;
    shg.fillRect(0, 0, W, H);
    return { c, s: shadow, m: mpx / px };
  }

  // ------------------------------------------------------------- layout
  let resizeTimer = 0;
  function resize() {
    const r = stage.getBoundingClientRect();
    scale = Math.min(r.width / VIEW_W, r.height / VIEW_H);
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = VIEW_W * scale, h = VIEW_H * scale;
    board.style.width = w + 'px';
    board.style.height = h + 'px';
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(buildRaster, 120);
  }

  // ----------------------------------------------------------------- état
  let state = 'menu';      // menu | play | pause | over
  let engine, items, mergeQueue;
  let gt = 0, rt = 0;      // temps de jeu / temps réel (animations)
  let acc = 0;
  let score = 0, shownScore = 0;
  const nextCharge = { ...RECHARGE };
  let dangerT = 0, lastTick = 0;
  let maxLevel = -1, reached = [];
  let shake = 0;
  let particles = [], texts = [], ghosts = [];
  const dropper = { x: VIEW_W / 2, tx: VIEW_W / 2, level: 0, ready: true, cooldown: 0, appear: 1 };
  let nextLevel = 0;
  const pointer = { active: false };
  const powers = { swap: 1, c4: 1, shake: 1 };
  let targeting = false;

  function randomDrop() {
    const total = DROP_WEIGHTS.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < DROP_WEIGHTS.length; i++) {
      r -= DROP_WEIGHTS[i];
      if (r <= 0) return i;
    }
    return 0;
  }

  /** Géométrie utile d'une arme, en unités monde, relative à l'origine du dessin. */
  const geo = lvl => {
    const it = ITEMS[lvl], b = it.hitBox, s = it.scale;
    return { cx: (b.x0 + b.x1) / 2 * s, cy: (b.y0 + b.y1) / 2 * s, hw: (b.x1 - b.x0) / 2 * s, hh: (b.y1 - b.y0) / 2 * s };
  };

  // -------------------------------------------------------------- monde
  function createWorld() {
    engine = Engine.create({ positionIterations: 20, velocityIterations: 14 });
    engine.gravity.y = tuning.gravity;
    const W = 80, top = -700;
    const wallOpts = { isStatic: true, label: 'wall', friction: 0.3, restitution: 0.2 };
    const h = TANK_B + W - top;
    Composite.add(engine.world, [
      Bodies.rectangle(VIEW_W / 2, TANK_B + W / 2, VIEW_W * 2, W, wallOpts),
      Bodies.rectangle(TANK_L - W / 2, top + h / 2, W, h, wallOpts),
      Bodies.rectangle(TANK_R + W / 2, top + h / 2, W, h, wallOpts)
    ]);
    ceiling = null;
    syncCeiling();
    Events.on(engine, 'collisionStart', e => onCollision(e, true));
    Events.on(engine, 'collisionActive', e => onCollision(e, false));
  }

  /** Plafond présent seulement en gravité inversée (les armes flottent contre le haut). */
  let ceiling = null;
  function syncCeiling() {
    if (!engine) return;
    if (tuning.gravity < 0 && !ceiling) {
      ceiling = Bodies.rectangle(VIEW_W / 2, -36, VIEW_W * 2, 80, { isStatic: true, label: 'wall', friction: 0.3, restitution: 0.2 });
      Composite.add(engine.world, ceiling);
    } else if (tuning.gravity >= 0 && ceiling) {
      Composite.remove(engine.world, ceiling);
      ceiling = null;
    }
  }

  /**
   * Corps composé (boîtes à coins arrondis + cercles) épousant le dessin.
   * Chaque pièce est gonflée du contour et du liseré pour que deux armes se
   * touchent physiquement là où leurs dessins se touchent, sans chevauchement.
   */
  function makeBody(level, ox, oy, k) {
    const it = ITEMS[level], s = it.scale * k;
    const pad = (OUTLINE * it.scale + STICKER) * k;
    const parts = it.hit.map(h => {
      if (h[0] === 'c') return Bodies.circle(ox + h[1] * s, oy + h[2] * s, h[3] * s + pad, PART_OPTS);
      const [, x, y, w, hh, ch, ang = 0] = h;
      const pw = w * s + 2 * pad, ph = hh * s + 2 * pad;
      const radius = Math.max(0.5, Math.min(ch * s + pad, Math.min(pw, ph) / 2 - 0.2));
      const p = Bodies.rectangle(ox + (x + w / 2) * s, oy + (y + hh / 2) * s, pw, ph,
        Object.assign({ chamfer: { radius } }, PART_OPTS));
      if (ang) Body.rotate(p, ang * Math.PI / 180);
      return p;
    });
    return Body.create(Object.assign({ parts }, BODY_OPTS));
  }

  /**
   * Ajoute une arme. (x, y) = origine du dessin, ou centre de masse si opts.center.
   * opts.grow : apparaît à 70 % et grandit (fusion), pour ne pas éjecter les voisins.
   */
  function addItem(level, x, y, opts = {}) {
    const k = opts.grow ? 0.7 : 1;
    const body = makeBody(level, x, y, k);
    const off = { x: (x - body.position.x) / k, y: (y - body.position.y) / k };
    if (opts.center) Body.setPosition(body, { x, y });
    if (opts.angle) Body.setAngle(body, opts.angle);
    if (opts.vel) Body.setVelocity(body, opts.vel);
    const it = {
      body, level, off, k,
      born: gt,
      spawn: opts.grow ? 0 : 1,
      dropped: !!opts.dropped,
      landed: false,
      merging: false,
      chain: opts.chain || 0,
      chainUntil: opts.chain ? gt + 1.1 : 0,
      phase: Math.random() * Math.PI * 2,
      sq: { d: 0, v: 0, a: 0 },
      blinkAt: rt + 1 + Math.random() * 4,
      blinkUntil: 0,
      expr: 0,
      exprUntil: 0
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
  /** Squash & stretch : un choc violent écrase l'arme le long de la normale. */
  function kick(it, speed, ang) {
    if (speed < 2.2) return;
    const imp = Math.min((speed - 2) * 0.36, 3.4);
    if (imp > Math.abs(it.sq.v) * 0.6) it.sq.a = ang;
    it.sq.v += imp;
    if (speed > 7.5) react(it, 3, 0.5);      // gros choc : yeux écarquillés
  }

  /** Réaction du visage : 2 = écrasé (> <), 3 = écarquillé. */
  function react(it, expr, dur) {
    if (rt < it.exprUntil && it.expr === 3 && expr === 2) return;
    it.expr = expr;
    it.exprUntil = Math.max(it.exprUntil, rt + dur);
  }

  function onCollision(e, isStart) {
    for (const pair of e.pairs) {
      const pa = pair.bodyA.parent, pb = pair.bodyB.parent;
      const a = items.get(pa.id), b = items.get(pb.id);
      if (isStart) {
        const n = pair.collision.normal;
        const va = pa.velocity, vb = pb.velocity;
        const s = Math.abs((va.x - vb.x) * n.x + (va.y - vb.y) * n.y);
        const ang = Math.atan2(n.y, n.x);
        if (a) kick(a, s, ang);
        if (b) kick(b, s, ang);
        for (const it of [a, b]) {
          if (it && it.dropped && !it.landed) {
            it.landed = true;
            if (s > 1.2) A.land(s / 12, it.level);
            if (s > 3) Haptics.pulse(10, Math.min(1, s / 12));
          }
        }
      }
      // Coincée sous un poids lourd : yeux écrasés.
      if (!isStart && a && b && a !== b) {
        if (pb.mass > pa.mass * 2.2 && pb.position.y < pa.position.y - 4) react(a, 2, 0.35);
        else if (pa.mass > pb.mass * 2.2 && pa.position.y < pb.position.y - 4) react(b, 2, 0.35);
      }
      if (a && b && a !== b && a.level === b.level && !a.merging && !b.merging) {
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
        const p = it.body.position;
        ghosts.push({ level: it.level, off: it.off, x0: p.x, y0: p.y, x1: x, y1: y, angle: it.body.angle, t: 0 });
      }
      removeItem(a);
      removeItem(b);

      // Réaction en chaîne : une fusion née d'une fusion récente prolonge le combo.
      const chainOf = it => (gt < it.chainUntil ? it.chain : 0);
      const combo = Math.max(chainOf(a), chainOf(b)) + 1;
      const comboBonus = 50 * combo * (combo - 1) / 2;   // x2 : +50, x3 : +150, x4 : +300…

      if (a.level === MAX_LEVEL) {
        // Deux Graals : ils disparaissent dans une pluie de confettis.
        const pts = GRAAL_BONUS * combo + comboBonus;
        addScore(pts, x, y, true);
        burst(x, y, ITEMS[MAX_LEVEL].size / 2, a.level, true);
        A.fanfare();
        shake = 16;
        Haptics.pulse([40, 60, 40, 60, 80]);
        toast(MAX_LEVEL, 'Double Graal ! +' + pts);
        if (combo >= 2) showCombo(combo, comboBonus);
        shockwave(x, y, 260, 7, null);
        earnCoins(COIN_GRAAL_PAIR, x, y + 30);
        continue;
      }

      const lvl = a.level + 1;
      const g = geo(lvl);
      x = Math.max(TANK_L + g.hw * 0.7, Math.min(TANK_R - g.hw * 0.7, x));
      y = Math.min(TANK_B - g.hh * 0.7, y);
      const n = addItem(lvl, x, y, { center: true, grow: true, vel, angle: (a.body.angle + b.body.angle) / 2, chain: combo });
      n.sq.v = 3.2; n.sq.a = Math.PI / 2;
      shockwave(x, y, Math.max(g.hw, g.hh) * 2.2, 2.4 + lvl * 0.3, n);

      const pts = POINTS[lvl] * combo + comboBonus;
      addScore(pts, x, y - g.hh * 0.6, false);
      if (combo >= 2) showCombo(combo, comboBonus);
      burst(x, y, Math.max(g.hw, g.hh), lvl, false);
      A.pop(lvl, combo);
      Haptics.pulse([15, 30, 20]);
      if (lvl >= 7) shake = Math.max(shake, 4 + (lvl - 7) * 3);
      earnCoins(COINS[lvl], x + g.hw * 0.4, y + g.hh * 0.3);
      onReach(lvl);
    }
    mergeQueue.length = 0;
  }

  /** Souffle radial : les voisines sursautent et s'écartent doucement. */
  function shockwave(x, y, R, force, except) {
    for (const o of items.values()) {
      if (o === except || o.merging) continue;
      const dx = o.body.position.x - x, dy = o.body.position.y - y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > R) continue;
      const k = 1 - d / R;
      const b = o.body;
      Body.setVelocity(b, { x: b.velocity.x + dx / d * force * k, y: b.velocity.y + dy / d * force * k - 1.6 * k });
      Body.setAngularVelocity(b, b.angularVelocity + (Math.random() - 0.5) * 0.08 * k);
      o.sq.v += 2.6 * k;
      o.sq.a = Math.atan2(dy, dx);
      if (k > 0.45) react(o, 3, 0.35);
    }
  }

  // ------------------------------------------------------------ économie
  let coinsRun = 0;

  function earnCoins(n, x, y) {
    if (!n) return;
    coinsRun += n;
    store.data.coins += n;
    store.saveSoon();
    if (x != null && flying < 10) flyCoin(n, x, y);
    else updateCoins(true);
  }

  /** Une douille "+n" s'élève de la fusion puis file vers le compteur du HUD. */
  let flying = 0;
  function flyCoin(n, x, y) {
    const r = canvas.getBoundingClientRect();
    const dst = $('btn-shop').querySelector('.coin-ico').getBoundingClientRect();
    const sx = r.left + x / VIEW_W * r.width, sy = r.top + y / VIEW_H * r.height;
    const dx = dst.left + dst.width / 2 - sx, dy = dst.top + dst.height / 2 - sy;
    const el = document.createElement('div');
    el.className = 'coin-fly';
    el.innerHTML = `<i class="coin-ico"></i>+${n}`;
    el.style.left = sx + 'px';
    el.style.top = sy + 'px';
    document.body.appendChild(el);
    flying++;
    const done = () => { el.remove(); flying--; updateCoins(true); };
    if (!el.animate) { done(); return; }
    el.animate([
      { transform: 'translate(-50%, -50%) scale(.5)', opacity: 0 },
      { transform: 'translate(-50%, -120%) scale(1.15)', opacity: 1, offset: 0.22 },
      { transform: 'translate(-50%, -150%) scale(1)', opacity: 1, offset: 0.45 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.45)`, opacity: 0.85 }
    ], { duration: 1150, easing: 'cubic-bezier(.45, 0, .35, 1)' }).onfinish = done;
  }

  function updateCoins(pop) {
    $('coins').textContent = store.data.coins.toLocaleString('fr-FR');
    const b = $('btn-shop');
    b.classList.toggle('dot', canAffordNew());
    if (pop) {
      b.classList.remove('bump');
      void b.offsetWidth;
      b.classList.add('bump');
    }
  }

  const canAffordNew = () => Object.values(CATALOG).some(cat =>
    cat.order.some(k => !store.data[cat.owned].includes(k) && cat.items[k].price <= store.data.coins));

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
    score = 0; shownScore = 0; coinsRun = 0;
    Object.assign(nextCharge, RECHARGE);
    dangerT = 0; lastTick = 0;
    shake = 0;
    particles = []; texts = []; ghosts = [];
    reached = ITEMS.map(() => false);
    maxLevel = -1;
    powers.swap = powers.c4 = powers.shake = 1;
    setTargeting(false);
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
    updatePowers();
    state = 'play';
  }

  const clampAim = (x, lvl) => {
    const g = geo(lvl), pad = OUTLINE * ITEMS[lvl].scale + STICKER;
    return Math.max(TANK_L + g.hw + pad + 1, Math.min(TANK_R - g.hw - pad - 1, x));
  };

  function drop() {
    if (state !== 'play' || targeting || !dropper.ready) return;
    const lvl = dropper.level, g = geo(lvl);
    const aim = clampAim(dropper.tx, lvl);
    dropper.x = aim;
    addItem(lvl, aim - g.cx, DROP_Y - g.cy, { dropped: true, vel: { x: 0, y: 2 } });
    stat(lvl).count++;
    store.saveSoon();
    A.plop(lvl);
    Haptics.pulse(15);
    dropper.ready = false;
    dropper.cooldown = DROP_COOLDOWN;
    dropper.level = nextLevel;
    nextLevel = randomDrop();
    markReached(nextLevel);
    updateNext();
  }

  /** Une arme apparaît dans la partie (pioche ou fusion). Renvoie true si jamais vue. */
  function markReached(lvl) {
    const isNew = !store.data.discovered[lvl];
    if (isNew) {
      store.data.discovered[lvl] = true;
      if (!stat(lvl).first) stat(lvl).first = Date.now();
      store.saveSoon();
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
    const st = stat(lvl);
    st.count++;
    if (!reached[lvl] && (st.best == null || gt < st.best)) st.best = Math.round(gt);
    const isNew = markReached(lvl);
    if (lvl > prev && lvl >= 3) {
      A.jingle();
      toast(lvl, (isNew ? 'Nouvelle arme : ' : 'Débloqué : ') + ITEMS[lvl].name + ' !');
    }
  }

  function addScore(pts, x, y, big) {
    pts = Math.round(pts * tuning.scoreMult);
    score += pts;
    floatText(x, y, '+' + pts, big ? '#ff5d8f' : T.text, big ? 40 : 22 + Math.min(14, pts / 10));
    const chip = document.createElement('span');
    chip.className = 'score-pop';
    chip.textContent = '+' + pts;
    elScoreBox.appendChild(chip);
    chip.addEventListener('animationend', () => chip.remove());
    elScore.classList.remove('bump');
    void elScore.offsetWidth;
    elScore.classList.add('bump');
    const gained = [];
    for (const k in RECHARGE) {
      while (score >= nextCharge[k]) {
        nextCharge[k] += RECHARGE[k];
        if (powers[k] < POWER_MAX) { powers[k]++; gained.push(k); }
      }
    }
    updatePowers(gained);
    if (gained.length) setTimeout(() => toast(null, 'Recharge : +1 ' + gained.map(k => POWER_NAMES[k]).join(', +1 '), 'power'), 400);
  }

  function physicsStep() {
    Engine.update(engine, STEP * 1000);
    processMerges();
    gt += STEP;

    let danger = false;
    for (const it of items.values()) {
      const b = it.body;
      if (it.k < 1) {
        const nk = Math.min(1, it.k * 1.045 + 0.005);
        Body.scale(b, nk / it.k, nk / it.k);
        it.k = nk;
      }
      const sp = b.speed;
      if (sp > 26) Body.setVelocity(b, { x: b.velocity.x * 26 / sp, y: b.velocity.y * 26 / sp });
      if (Math.abs(b.angularVelocity) > 0.35) Body.setAngularVelocity(b, Math.sign(b.angularVelocity) * 0.35);
      if (b.position.y > VIEW_H + 300 || b.position.y < -600 || b.position.x < -300 || b.position.x > VIEW_W + 300) { removeItem(it); continue; }
      if (!tuning.god && !it.merging && gt - it.born > 1.1 && b.bounds.min.y < TANK_TOP) danger = true;
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
    setTargeting(false);
    A.gameOver();
    Haptics.pulse([80, 60, 120]);
    const best = store.data.best || 0;
    const record = score > best;
    if (record) store.data.best = score;
    const bonus = Math.floor(score / COIN_SCORE_RATE);
    earnCoins(bonus);
    store.save();
    setTimeout(() => showGameOver(record, bonus), 750);
  }

  // -------------------------------------------------- pouvoirs tactiques
  function usePower(kind) {
    if (state !== 'play' || powers[kind] <= 0) return false;
    if (kind === 'swap') {
      if (!dropper.ready || targeting) return false;
      [dropper.level, nextLevel] = [nextLevel, dropper.level];
      dropper.appear = 0;
      updateNext();
      A.swap();
      Haptics.pulse(15);
    } else if (kind === 'shake') {
      if (targeting) return false;
      for (const it of items.values()) {
        const b = it.body;
        Body.setVelocity(b, { x: b.velocity.x + (Math.random() - 0.5) * 7, y: b.velocity.y - 3 - Math.random() * 5 });
        Body.setAngularVelocity(b, b.angularVelocity + (Math.random() - 0.5) * 0.18);
        it.sq.v += 2.5; it.sq.a = Math.random() * Math.PI;
      }
      shake = 14;
      A.rumble();
      Haptics.pulse([60, 40, 60, 40, 60]);
    } else if (kind === 'c4') {
      setTargeting(!targeting);
      return true;          // la charge n'est consommée qu'à l'explosion
    }
    if (!tuning.freePowers) powers[kind]--;
    updatePowers();
    return true;
  }

  function setTargeting(on) {
    targeting = on;
    $('pw-c4').classList.toggle('armed', on);
    elHint.classList.toggle('show', on);
    board.classList.toggle('targeting', on);
    if (on) { A.arm(); pointer.active = false; }
  }

  function itemAt(x, y) {
    const bodies = [...items.values()].map(it => it.body);
    for (const r of [0, 10, 20]) {
      const n = r ? 8 : 1;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const hit = Query.point(bodies, { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r })[0];
        if (hit) return items.get(hit.id);
      }
    }
    return null;
  }

  function detonate(it) {
    const { x, y } = it.body.position;
    const g = geo(it.level);
    removeItem(it);
    burst(x, y, Math.max(g.hw, g.hh), it.level, false, ['#ff9f5a', '#ffd34e', '#ff6b8f', '#ffffff']);
    particles.push({ type: 'ring', x, y, r0: 10, r1: 120, t: 0, life: 0.5 });
    shockwave(x, y, 150, 6, null);
    floatText(x, y - 20, 'BOUM !', '#ff6b3d', 30);
    shake = 12;
    A.boom();
    Haptics.pulse([30, 40, 70]);
    if (!tuning.freePowers) powers.c4--;
    updatePowers();
    setTargeting(false);
  }

  // ------------------------------------------------------------ effets
  function burst(x, y, r, lvl, mega, palette = PASTELS) {
    const n = Math.round(mega ? 70 : 10 + lvl * 2.2);
    particles.push({ type: 'ring', x, y, r0: r * 0.4, r1: r * (mega ? 2.4 : 1.4), t: 0, life: mega ? 0.8 : 0.42 });
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (mega ? 240 : 110) + Math.random() * (mega ? 420 : 200 + lvl * 14);
      const star = Math.random() < 0.55;
      particles.push({
        type: star ? 'star' : 'confetti',
        x: x + Math.cos(a) * r * 0.4,
        y: y + Math.sin(a) * r * 0.4,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 60,
        size: star ? 4 + Math.random() * (4 + lvl * 0.4) : 3 + Math.random() * 3,
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 12,
        color: palette[(Math.random() * palette.length) | 0],
        t: 0,
        life: 0.55 + Math.random() * (mega ? 1 : 0.5)
      });
    }
  }

  function floatText(x, y, text, color, size) {
    texts.push({ x, y, text, color, size, t: 0, life: 1 });
  }

  function showCombo(combo, bonus) {
    elCombo.innerHTML = `<b>COMBO x${combo}</b><span>+${bonus}</span>`;
    elCombo.style.setProperty('--hue', String((combo * 38) % 360));
    elCombo.classList.remove('show');
    void elCombo.offsetWidth;
    elCombo.classList.add('show');
  }

  function updateFx(dt) {
    for (const p of particles) {
      p.t += dt;
      if (p.type !== 'ring') {
        const drag = p.type === 'confetti' ? 2.6 : 3.2;
        p.vx -= p.vx * drag * dt;
        p.vy -= p.vy * drag * dt;
        p.vy += (p.type === 'confetti' ? 260 : p.type === 'puff' ? -30 : 120) * dt;
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

  /** Traînées de chute : émises tant que l'arme tombe franchement. */
  function emitTrails(dt) {
    const kind = store.data.trail;
    for (const it of items.values()) {
      const b = it.body;
      const falling = b.velocity.y > 1.5 && b.speed > 3;
      if (kind === 'laser') {
        if (!it.trail) it.trail = [];
        if (falling) it.trail.push({ x: b.position.x, y: b.position.y, t: rt });
        while (it.trail.length && rt - it.trail[0].t > 0.35) it.trail.shift();
        continue;
      }
      if (!falling || kind === 'none') continue;
      const g = geo(it.level);
      if (kind === 'smoke' && Math.random() < dt * 30) {
        particles.push({ type: 'puff', x: b.position.x + (Math.random() - 0.5) * g.hw, y: b.position.y - g.hh * 0.4,
          vx: (Math.random() - 0.5) * 20, vy: -25, size: 4 + Math.random() * 4, rot: 0, vr: 0, t: 0, life: 0.7 });
      } else if (kind === 'sparks' && Math.random() < dt * 45) {
        particles.push({ type: 'star', x: b.position.x + (Math.random() - 0.5) * g.hw * 1.2, y: b.position.y - g.hh * 0.3,
          vx: (Math.random() - 0.5) * 70, vy: -30 - Math.random() * 40, size: 2 + Math.random() * 2.2, rot: Math.random() * 6,
          vr: 8, color: ['#ffe27a', '#fff6c8', '#ffb800'][(Math.random() * 3) | 0], t: 0, life: 0.45 });
      }
    }
  }

  /** Faisceau laser rémanent derrière les armes qui tombent. */
  function drawLasers() {
    ctx.lineCap = 'round';
    for (const it of items.values()) {
      const pts = it.trail;
      if (!pts || pts.length < 2) continue;
      for (let i = 1; i < pts.length; i++) {
        const a = 1 - (rt - pts[i].t) / 0.35;
        if (a <= 0) continue;
        ctx.strokeStyle = `rgba(255,60,200,${0.35 * a})`;
        ctx.lineWidth = 14 * a;
        ctx.beginPath(); ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke();
        ctx.strokeStyle = `rgba(0,240,255,${0.9 * a})`;
        ctx.lineWidth = 5 * a;
        ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${a})`;
        ctx.lineWidth = 1.8 * a;
        ctx.stroke();
      }
    }
  }

  /** Ressort amorti : l'écrasement revient à la forme d'origine avec un rebond de gelée. */
  function updateSquish(dt) {
    for (const it of items.values()) {
      const s = it.sq;
      s.v += (-420 * s.d - 6.5 * s.v) * dt;     // ressort peu amorti : rebond de gelée
      s.d += s.v * dt;
      if (s.d > SQUASH) { s.d = SQUASH; s.v *= -0.3; }
      if (s.d < -SQUASH * 0.7) { s.d = -SQUASH * 0.7; s.v *= -0.3; }
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
    if (items && raster.length) {
      if (store.data.trail === 'laser') drawLasers();
      for (const it of items.values()) drawItem(it, true);
      for (const it of items.values()) drawItem(it);
      for (const g of ghosts) drawGhost(g);
    }
    drawTankFront();
    if ((state === 'play' || state === 'pause') && raster.length) drawDropper();
    if (targeting) drawTargets();
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
    tankPath(0);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, TANK_TOP - 46, 0, TANK_B);
    g.addColorStop(0, T.tankTop);
    g.addColorStop(1, T.tankBot);
    ctx.fillStyle = g;
    ctx.fill();

    if (T.grid) {
      // Cotes façon plan technique.
      ctx.strokeStyle = 'rgba(234,244,255,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = TANK_B - 50; y > TANK_TOP; y -= 50) { ctx.moveTo(TANK_R - 10, y); ctx.lineTo(TANK_R - 2, y); }
      for (let x = TANK_L + 50; x < TANK_R; x += 50) { ctx.moveTo(x, TANK_B - 10); ctx.lineTo(x, TANK_B - 2); }
      ctx.stroke();
      ctx.font = '500 9px Fredoka, ui-rounded, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(234,244,255,0.55)';
      ctx.textAlign = 'right';
      ctx.fillText('CUVE-01 · ÉCH. 1:1', TANK_R - 14, TANK_B - 14);
    }

    // Rail de la petite grue.
    ctx.lineCap = 'round';
    ctx.strokeStyle = T.rail;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(TANK_L + 6, 14);
    ctx.lineTo(TANK_R - 6, 14);
    ctx.stroke();
    ctx.strokeStyle = T.railInner;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Ligne de danger.
    const hot = state === 'play' && dangerT > 0.05;
    const pulse = hot ? 0.6 + 0.4 * Math.sin(rt * 14) : 0.55;
    ctx.save();
    ctx.setLineDash([10, 9]);
    ctx.lineDashOffset = -rt * 18;
    ctx.strokeStyle = `rgba(${T.danger},${hot ? pulse : 0.6})`;
    ctx.lineWidth = hot ? 4 : 3;
    ctx.beginPath();
    ctx.moveTo(TANK_L + 4, TANK_TOP);
    ctx.lineTo(TANK_R - 4, TANK_TOP);
    ctx.stroke();
    ctx.restore();
    ctx.font = '600 11px Fredoka, ui-rounded, system-ui, sans-serif';
    ctx.fillStyle = `rgba(${T.danger},${hot ? pulse : 0.75})`;
    ctx.textAlign = 'left';
    ctx.fillText('LIGNE ROUGE', TANK_L + 10, TANK_TOP - 7);

    if (hot) {
      tankPath(0);
      ctx.closePath();
      ctx.fillStyle = `rgba(${T.danger},${0.05 + 0.06 * Math.sin(rt * 14)})`;
      ctx.fill();
    }
  }

  /** Jauge latérale : vert → jaune → rouge clignotant à l'approche de la ligne rouge. */
  let gauge = 0;
  function drawGauge() {
    let top = TANK_B;
    if (items) for (const it of items.values()) {
      if (!it.merging && gt - it.born > 0.8) top = Math.min(top, it.body.bounds.min.y);
    }
    const target = Math.max(0, Math.min(1, (TANK_B - top) / (TANK_B - TANK_TOP)));
    gauge += (target - gauge) * 0.08;
    const x = TANK_R - 9, y0 = TANK_TOP + 8, y1 = TANK_B - 40, h = (y1 - y0) * gauge;
    ctx.fillStyle = 'rgba(120,110,140,0.14)';
    roundRectPath(x, y0, 5, y1 - y0, 2.5);
    ctx.fill();
    if (h < 1) return;
    const hue = 120 - 120 * Math.min(1, gauge / 0.9);
    const blink = gauge > 0.82 ? 0.45 + 0.55 * Math.abs(Math.sin(rt * 9)) : 1;
    ctx.fillStyle = `hsla(${hue}, 85%, 52%, ${blink})`;
    roundRectPath(x, y1 - h, 5, h, 2.5);
    ctx.fill();
  }

  function drawTankFront() {
    if (state === 'play' || state === 'pause') drawGauge();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (T.glow) {
      ctx.save();
      ctx.shadowColor = T.glow;
      ctx.shadowBlur = 14;
      tankPath(5);
      ctx.strokeStyle = T.wallInner;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    }
    tankPath(5);
    ctx.strokeStyle = T.wall;
    ctx.lineWidth = T.grid ? 4 : 10;
    ctx.stroke();
    tankPath(5);
    ctx.strokeStyle = T.wallInner;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Reflets du verre.
    ctx.strokeStyle = T.reflect;
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
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(TANK_R - 14, TANK_B - 120);
    ctx.lineTo(TANK_R - 14, TANK_B - 50);
    ctx.stroke();
  }

  /** Dessine le sprite d'une arme (ou son ombre), origine du dessin en (0, 0). */
  function blit(level, v, shadow) {
    const r = raster[level] && raster[level][v];
    if (!r) return;
    const it = ITEMS[level], s = it.scale, vw = it.view;
    ctx.drawImage(shadow ? r.s : r.c, vw.x * s - r.m, vw.y * s - r.m, vw.w * s + 2 * r.m, vw.h * s + 2 * r.m);
  }

  function drawItem(it, shadow) {
    const b = it.body, s = it.sq;
    const vis = (it.spawn < 1 ? 0.55 + 0.45 * elasticOut(it.spawn) : 1) * (1 + 0.012 * Math.sin(rt * 2.3 + it.phase));
    ctx.save();
    // L'ombre est décalée vers le bas dans le repère monde : elle ne tourne pas avec l'arme.
    ctx.translate(b.position.x + (shadow ? 2 : 0), b.position.y + (shadow ? 6 : 0));
    if (Math.abs(s.d) > 0.003) {
      ctx.rotate(s.a);
      ctx.scale(1 - s.d, 1 + s.d * 0.9);
      ctx.rotate(-s.a);
    }
    ctx.rotate(b.angle);
    ctx.scale(vis, vis);
    ctx.translate(it.off.x, it.off.y);
    const v = rt < it.exprUntil ? it.expr : (rt < it.blinkUntil ? 1 : 0);
    blit(it.level, v, shadow);
    ctx.restore();
  }

  function drawGhost(g) {
    const t = g.t, e = t * t;
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.translate(g.x0 + (g.x1 - g.x0) * e, g.y0 + (g.y1 - g.y0) * e);
    ctx.rotate(g.angle);
    const k = 1 - 0.35 * t;
    ctx.scale(k, k);
    ctx.translate(g.off.x, g.off.y);
    blit(g.level, 1);
    ctx.restore();
  }

  function drawDropper() {
    const lvl = dropper.level, g = geo(lvl);
    const x = dropper.x;
    ctx.fillStyle = T.cart;
    roundRectPath(x - 20, 6, 40, 16, 8);
    ctx.fill();
    ctx.strokeStyle = T.cartStroke;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = T.cartDot;
    ctx.beginPath();
    ctx.arc(x, 14, 3.5, 0, Math.PI * 2);
    ctx.fill();

    if (!dropper.ready || targeting) return;
    const bob = Math.sin(rt * 3) * 2;
    const a = dropper.appear < 1 ? 0.3 + 0.7 * elasticOut(dropper.appear) : 1;
    const y = DROP_Y + bob;

    ctx.strokeStyle = T.string;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 22);
    ctx.lineTo(x, y - g.hh * a);
    ctx.stroke();
    ctx.save();
    ctx.setLineDash([4, 9]);
    ctx.lineDashOffset = rt * 20;
    ctx.strokeStyle = T.guide;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y + g.hh + 6);
    ctx.lineTo(x, TANK_B - 4);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(rt * 2.2) * 0.05);
    ctx.scale(a, a);
    ctx.translate(-g.cx, -g.cy);
    blit(lvl, (rt % 3.4) < 0.13 ? 1 : 0);
    ctx.restore();
  }

  function drawReticle(x, y, r, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      ctx.moveTo(x + Math.cos(a) * (r - 6), y + Math.sin(a) * (r - 6));
      ctx.lineTo(x + Math.cos(a) * (r + 8), y + Math.sin(a) * (r + 8));
    }
    ctx.stroke();
  }

  /** Mode C4 : on assombrit la cuve et on vise les armes qui frôlent la ligne rouge. */
  function drawTargets() {
    tankPath(0);
    ctx.closePath();
    ctx.fillStyle = 'rgba(40,10,30,0.07)';
    ctx.fill();
    const p = 0.5 + 0.5 * Math.sin(rt * 8);
    for (const it of items.values()) {
      const b = it.body;
      if (b.bounds.min.y > TANK_TOP + 30) continue;
      drawReticle(b.position.x, b.position.y, 16 + p * 4, `rgba(${T.danger},${0.6 + 0.4 * p})`);
    }
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
      if (p.type === 'puff') {
        ctx.fillStyle = `rgba(160,160,172,${0.38 * (1 - k)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + k * 1.6), 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      if (p.type === 'ring') {
        const e = 1 - Math.pow(1 - k, 3);
        ctx.strokeStyle = `rgba(${T.ring},${0.9 * (1 - k)})`;
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
      ctx.strokeStyle = T.textStroke;
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
      if (t.coin) drawCoin(t.x + ctx.measureText(t.text).width / 2 + 9, t.y, 7.5);
    }
    ctx.globalAlpha = 1;
    ctx.textBaseline = 'alphabetic';
  }

  /** Petite Douille d'Or (pièce) dessinée sur le canvas. */
  function drawCoin(x, y, r) {
    ctx.fillStyle = '#3d2c4e';
    ctx.beginPath(); ctx.arc(x, y, r + 1.6, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createLinearGradient(x, y - r, x, y + r);
    g.addColorStop(0, '#fff2a8'); g.addColorStop(0.5, '#ffc928'); g.addColorStop(1, '#d98e00');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff6cf';
    ctx.beginPath(); ctx.ellipse(x - r * 0.3, y - r * 0.35, r * 0.35, r * 0.2, -0.5, 0, Math.PI * 2); ctx.fill();
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

    if (state === 'play' && !targeting) {
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
      dropper.tx = clampAim(dropper.tx, dropper.level);
      // La pastille "Suivant" s'efface quand on vise juste en dessous.
      const under = dropper.x + geo(dropper.level).hw > VIEW_W - 120;
      if (under !== elNextPill.classList.contains('faded')) elNextPill.classList.toggle('faded', under);
    }
    if (state !== 'pause') {
      if (items) updateSquish(dt);
      updateFx(dt);
      if (state === 'play' && items) emitTrails(dt);
      if (state === 'play' && store.data.skin === 'gold' && items && items.size && Math.random() < dt * 4) {
        const all = [...items.values()], it = all[(Math.random() * all.length) | 0], g = geo(it.level);
        particles.push({
          type: 'star', x: it.body.position.x + (Math.random() - 0.5) * g.hw * 1.4,
          y: it.body.position.y + (Math.random() - 0.5) * g.hh * 1.2, vx: 0, vy: -20,
          size: 3 + Math.random() * 3, rot: 0, vr: 3, color: '#fffbe0', t: 0, life: 0.6
        });
      }
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
  function toWorld(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * VIEW_W, y: (e.clientY - r.top) / r.height * VIEW_H };
  }

  board.addEventListener('pointerdown', e => {
    A.unlock();
    if (state !== 'play') return;
    e.preventDefault();
    const p = toWorld(e);
    if (targeting) {
      const it = itemAt(p.x, p.y);
      if (it) detonate(it);
      return;
    }
    pointer.active = true;
    pointer.id = e.pointerId;
    try { board.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    dropper.tx = p.x;
    if (e.pointerType !== 'mouse') dropper.x = clampAim(dropper.tx, dropper.level);
  });
  board.addEventListener('pointermove', e => {
    if (state !== 'play' || targeting) return;
    if (pointer.active || e.pointerType === 'mouse') dropper.tx = toWorld(e).x;
  });
  const release = e => {
    if (!pointer.active || e.pointerId !== pointer.id) return;
    pointer.active = false;
    if (e.type === 'pointerup') {
      dropper.tx = toWorld(e).x;
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
      else if (e.key === 's') usePower('swap');
      else if (e.key === 'c') usePower('c4');
      else if (e.key === 'x') usePower('shake');
      else if (e.key === 'Escape' || e.key === 'p') { if (targeting) setTargeting(false); else pause(); }
    } else if (e.key === 'Escape') {
      if (PANELS.includes(current)) closePanel();
      else if (state === 'pause') resume();
    }
  });

  // Bloque le zoom par pincement sur iOS.
  document.addEventListener('gesturestart', e => e.preventDefault());

  // Secouer le téléphone déclenche le pouvoir Secousse.
  let spikes = [], lastShake = 0;
  window.addEventListener('devicemotion', e => {
    const a = e.accelerationIncludingGravity;
    if (!a || !store.data.motion || state !== 'play') return;
    const m = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
    const now = performance.now();
    if (Math.abs(m - 9.81) > 13) {
      spikes = spikes.filter(t => now - t < 600);
      spikes.push(now);
      if (spikes.length >= 3 && now - lastShake > 1500) {
        lastShake = now;
        spikes = [];
        usePower('shake');
      }
    }
  });

  async function requestMotion() {
    const DME = window.DeviceMotionEvent;
    if (DME && typeof DME.requestPermission === 'function') {
      try { return (await DME.requestPermission()) === 'granted'; } catch (e) { return false; }
    }
    return !!DME;
  }

  // ----------------------------------------------------------------- HUD
  function updateHUD(force) {
    if (force) shownScore = score;
    elScore.textContent = Math.round(shownScore);
    elBest.textContent = Math.max(store.data.best || 0, score);
  }

  function updateNext() {
    elNext.src = svgURL(nextLevel, 0, true, undefined, undefined, store.data.skin);
    elNext.alt = ITEMS[nextLevel].name;
    elNextPill.classList.remove('swap');
    void elNextPill.offsetWidth;
    elNextPill.classList.add('swap');
  }

  const POWER_NAMES = { swap: 'Swap', c4: 'C4', shake: 'Secousse' };

  /** Compteurs + jauge de progression vers la prochaine charge. */
  function updatePowers(flash = []) {
    for (const k of ['swap', 'c4', 'shake']) {
      const b = $('pw-' + k);
      b.querySelector('.count').textContent = powers[k];
      b.disabled = powers[k] <= 0;
      const full = powers[k] >= POWER_MAX;
      const done = full ? 1 : 1 - (nextCharge[k] - score) / RECHARGE[k];
      b.querySelector('.meter i').style.width = (Math.max(0, Math.min(1, done)) * 100).toFixed(1) + '%';
      b.classList.toggle('full', full);
      if (flash.includes(k)) {
        b.classList.remove('flash');
        void b.offsetWidth;
        b.classList.add('flash');
      }
    }
  }

  function buildEvo() {
    elEvo.innerHTML = '';
    ITEMS.forEach((it, lvl) => {
      const d = document.createElement('button');
      d.className = 'evo-item';
      d.type = 'button';
      d.setAttribute('aria-label', `Fiche ${lvl + 1} : ${it.name}`);
      const img = document.createElement('img');
      img.src = svgURL(lvl);
      img.alt = '';
      img.draggable = false;
      d.appendChild(img);
      d.addEventListener('click', () => { A.unlock(); A.click(); openCodex(lvl); });
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

  const ICONS = {
    theme: '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1.3-1.1-1.6-1.1-2.6 0-.8.6-1.4 1.5-1.4h2.1A4.7 4.7 0 0 0 21 10.8C21 6.5 17 3 12 3z" fill="#ffd1e3" stroke="#3d2c4e" stroke-width="1.8"/><circle cx="7.5" cy="11" r="1.6" fill="#ff7aa2"/><circle cx="10" cy="7" r="1.6" fill="#7cc8ff"/><circle cx="14.5" cy="7" r="1.6" fill="#8fe0b0"/></svg>',
    shop: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#ffc928" stroke="#3d2c4e" stroke-width="1.8"/><path d="M9 9.5c0-1.2 1.3-2 3-2s3 .8 3 2-1.3 1.6-3 2-3 .9-3 2.1 1.3 1.9 3 1.9 3-.7 3-1.9M12 6v12" fill="none" stroke="#3d2c4e" stroke-width="1.6" stroke-linecap="round"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M12 15V4m0 0L8 8m4-4 4 4M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6" fill="none" stroke="#3d2c4e" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    power: '<svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="#ffd34e" stroke="#3d2c4e" stroke-width="1.8" stroke-linejoin="round"/></svg>'
  };

  let toastTimer = 0;
  function toast(lvl, text, icon) {
    elToast.innerHTML = '';
    if (lvl != null) {
      const img = document.createElement('img');
      img.src = svgURL(lvl);
      img.alt = '';
      elToast.append(img);
    } else if (icon) {
      const i = document.createElement('i');
      i.innerHTML = ICONS[icon];
      elToast.append(i);
    }
    const span = document.createElement('span');
    span.textContent = text;
    elToast.append(span);
    elToast.classList.remove('show');
    void elToast.offsetWidth;
    elToast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => elToast.classList.remove('show'), 2200);
  }

  // --------------------------------------------------------------- menus
  const overlays = {
    start: $('menu-start'), pause: $('menu-pause'), over: $('menu-over'),
    codex: $('menu-codex'), shop: $('menu-shop'), pin: $('menu-pin'), admin: $('menu-admin')
  };
  // Panneaux secondaires : ils mettent la partie en pause et y reviennent à la fermeture.
  const PANELS = ['codex', 'shop', 'pin', 'admin'];
  let current = null, returnTo = null, resumeAfter = false;

  function showOverlay(name) {
    current = name;
    Object.entries(overlays).forEach(([k, el]) => {
      el.classList.toggle('show', k === name);
      el.setAttribute('aria-hidden', k === name ? 'false' : 'true');
    });
  }

  /** Ouvre un panneau secondaire (codex, thèmes) en mettant la partie en pause. */
  function openPanel(name) {
    if (!PANELS.includes(current)) {
      returnTo = current;
      resumeAfter = state === 'play';
    }
    if (state === 'play') {
      state = 'pause';
      pointer.active = false;
      setTargeting(false);
    }
    showOverlay(name);
  }

  function closePanel() {
    A.click();
    if (resumeAfter) {
      resumeAfter = false;
      showOverlay(null);
      acc = 0;
      last = performance.now();
      state = 'play';
    } else {
      showOverlay(returnTo);
    }
  }

  Object.values(overlays).forEach(el => el.addEventListener('click', e => {
    if (e.target === el && PANELS.includes(current)) closePanel();
  }));

  function start() {
    A.unlock();
    A.startMusic();
    A.click();
    if (store.data.motion) requestMotion();
    showOverlay(null);
    newGame();
  }

  function pause() {
    if (state !== 'play') return;
    state = 'pause';
    pointer.active = false;
    setTargeting(false);
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
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140" aria-hidden="true">
      <defs><radialGradient id="mg" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="${m.c1}"/><stop offset="1" stop-color="${m.c2}"/></radialGradient></defs>
      <path d="M38 4 L54 48 L40 52 L24 8 Z" fill="#ff9fbd" stroke="#3d2c4e" stroke-width="4" stroke-linejoin="round"/>
      <path d="M82 4 L66 48 L80 52 L96 8 Z" fill="#a9d8ff" stroke="#3d2c4e" stroke-width="4" stroke-linejoin="round"/>
      <circle cx="60" cy="86" r="44" fill="url(#mg)" stroke="#3d2c4e" stroke-width="5"/>
      <circle cx="60" cy="86" r="33" fill="none" stroke="#fff" stroke-width="3" opacity=".6"/>
      <path d="M60 60 l8 16 l18 2 l-13 12 l4 18 l-17 -9 l-17 9 l4 -18 l-13 -12 l18 -2 z" fill="#fff" stroke="#3d2c4e" stroke-width="3.5" stroke-linejoin="round"/>
      <ellipse cx="44" cy="66" rx="10" ry="5" fill="#fff" opacity=".7" transform="rotate(-35 44 66)"/>
    </svg>`;
  }

  function showGameOver(record, bonus) {
    const lvl = Math.max(0, maxLevel);
    const medal = [...MEDALS].reverse().find(m => lvl >= m.min);
    $('over-coins').textContent = '+' + coinsRun.toLocaleString('fr-FR');
    $('over-coins-detail').textContent = `dont ${bonus.toLocaleString('fr-FR')} de bonus de score`;
    prepareShare(medal, lvl, record);
    $('over-medal').innerHTML = medalSVG(medal);
    $('over-medal-name').textContent = 'Médaille ' + medal.name;
    $('over-score').textContent = score;
    $('over-best').textContent = store.data.best || 0;
    $('over-record').hidden = !record;
    $('over-weapon-img').src = svgURL(lvl);
    $('over-weapon-name').textContent = ITEMS[lvl].name;
    showOverlay('over');
  }

  // ------------------------------------------------------------- partage
  let shareFile = null;
  const loadImg = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  const shareText = () => `J'ai fait ${score.toLocaleString('fr-FR')} points sur Chibi Arsenal ! Tu fais mieux ? 🔫💥`;
  const shareURL = () => location.href.split('#')[0].split('?')[0];

  /** Génère à l'avance l'image du score (navigator.share doit partir directement du toucher). */
  async function prepareShare(medal, lvl, record) {
    shareFile = null;
    const W = 1080, H = 1350;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const font = (w, px) => `${w} ${px}px Fredoka, ui-rounded, system-ui, sans-serif`;
    const bg = g.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#ffd1e6'); bg.addColorStop(0.5, '#e9dcff'); bg.addColorStop(1, '#ccf3e2');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(176,150,214,0.22)';
    for (let y = 20; y < H; y += 44) for (let x = 20; x < W; x += 44) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }
    // carte verre
    g.fillStyle = 'rgba(255,255,255,0.72)';
    g.strokeStyle = '#ffffff'; g.lineWidth = 6;
    g.beginPath(); g.roundRect(70, 150, W - 140, H - 260, 60); g.fill(); g.stroke();
    g.textAlign = 'center';
    g.font = font(700, 70);
    const w1 = g.measureText('CHIBI ').width, w2 = g.measureText('ARSENAL').width;
    g.textAlign = 'left';
    g.fillStyle = '#3d2c4e'; g.fillText('CHIBI ', (W - w1 - w2) / 2, 110);
    g.fillStyle = '#ff5d8f'; g.fillText('ARSENAL', (W - w1 - w2) / 2 + w1, 110);
    g.textAlign = 'center';
    g.fillStyle = '#7a6a8c'; g.font = font(600, 44); g.fillText(record ? '✨ NOUVEAU RECORD ✨' : 'MON SCORE', W / 2, 260);
    g.font = font(700, 190); g.lineJoin = 'round'; g.lineWidth = 22; g.strokeStyle = '#ffffff';
    g.strokeText(score.toLocaleString('fr-FR'), W / 2, 450); g.fillStyle = '#ff5d8f'; g.fillText(score.toLocaleString('fr-FR'), W / 2, 450);
    const [weapon, badge] = await Promise.all([
      loadImg(svgURL(lvl, 0, true, 520, 520, store.data.skin)),
      loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(medalSVG(medal)))
    ]);
    if (weapon) g.drawImage(weapon, W / 2 - 300, 500, 440, 440);
    if (badge) g.drawImage(badge, W / 2 + 150, 560, 210, 245);
    g.fillStyle = '#b096d6'; g.font = font(700, 40); g.fillText('Médaille ' + medal.name, W / 2 + 255, 850);
    g.fillStyle = '#7a6a8c'; g.font = font(600, 38); g.fillText('Meilleure arme', W / 2, 1010);
    g.fillStyle = '#3d2c4e'; g.font = font(700, 62); g.fillText(ITEMS[lvl].name, W / 2, 1080);
    g.fillStyle = '#7a6a8c'; g.font = font(600, 36); g.fillText('Record : ' + (store.data.best || 0).toLocaleString('fr-FR'), W / 2, 1150);
    g.fillStyle = '#3d2c4e'; g.font = font(600, 34); g.fillText('Fusionne les armes chibi sur ' + location.host, W / 2, H - 40);
    c.toBlob(b => { if (b) shareFile = new File([b], 'chibi-arsenal-score.png', { type: 'image/png' }); }, 'image/png');
    $('over-share-img').src = c.toDataURL('image/png');
  }

  async function shareScore() {
    A.click();
    const text = shareText(), url = shareURL();
    try {
      if (shareFile && navigator.canShare && navigator.canShare({ files: [shareFile] })) {
        await navigator.share({ files: [shareFile], title: 'Chibi Arsenal', text: text + ' ' + url });
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: 'Chibi Arsenal', text, url });
        return;
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return;      // partage annulé par le joueur
    }
    try {
      await navigator.clipboard.writeText(text + ' ' + url);
      toast(null, 'Score et lien copiés dans le presse-papier !', 'share');
    } catch (e) {
      toast(null, 'Copie impossible : ' + url, 'share');
    }
  }
  $('btn-share').addEventListener('click', shareScore);

  // ---------------------------------------------------- codex (armurerie)
  const TINTS = ['#fff3c4', '#e3f9d2', '#ffe0ef', '#efe3ff', '#dff0ff', '#ffe0e0', '#ffe7d1', '#fbe0fb', '#d8f7ef', '#e3e6ff', '#fff3cf'];
  let codexLevel = 0;
  const fmtTime = s => s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
  const fmtDate = ms => new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  function openCodex(lvl) {
    codexLevel = lvl;
    renderCodex();
    openPanel('codex');
  }

  function renderCodex() {
    const lvl = codexLevel, it = ITEMS[lvl];
    const known = !!store.data.discovered[lvl];
    const st = stat(lvl);
    const card = $('codex-card');
    card.classList.toggle('unknown', !known);
    card.style.setProperty('--tint', TINTS[lvl]);
    $('codex-num').textContent = 'N°' + String(lvl + 1).padStart(2, '0');
    $('codex-img').src = svgURL(lvl);
    $('codex-stamp').src = svgURL(lvl);
    $('codex-name').textContent = known ? it.name : '???';
    const stars = 1 + Math.floor(lvl / 2.5);
    $('codex-stars').textContent = '★'.repeat(stars) + '☆'.repeat(5 - stars);
    if (known) {
      $('codex-lore').textContent = it.lore;
      const best = st.best != null ? fmtTime(st.best) : (lvl < DROP_WEIGHTS.length ? 'Arme de départ' : '—');
      $('codex-stats').innerHTML =
        `<div><span>Découverte</span><b>${st.first ? fmtDate(st.first) : '—'}</b></div>` +
        `<div><span>Obtenue</span><b>${st.count} fois</b></div>` +
        `<div><span>Record de déblocage</span><b>${best}</b></div>`;
    } else {
      $('codex-lore').textContent = lvl > 0
        ? `Fusionne deux « ${store.data.discovered[lvl - 1] ? ITEMS[lvl - 1].name : '???'} » pour découvrir cette arme.`
        : 'Lâche une munition pour la découvrir.';
      $('codex-stats').innerHTML = '';
    }
    $('codex-prev').disabled = lvl === 0;
    $('codex-next').disabled = lvl === MAX_LEVEL;
    const disc = store.data.discovered.filter(Boolean).length;
    $('codex-progress').textContent = `${disc} / ${ITEMS.length} armes découvertes`;
    card.classList.remove('flip');
    void card.offsetWidth;
    card.classList.add('flip');
  }

  $('codex-prev').addEventListener('click', () => { if (codexLevel > 0) { codexLevel--; A.click(); renderCodex(); } });
  $('codex-next').addEventListener('click', () => { if (codexLevel < MAX_LEVEL) { codexLevel++; A.click(); renderCodex(); } });
  $('codex-close').addEventListener('click', closePanel);

  // -------------------------------------------------------------- thèmes
  function applyTheme(key, rebuild = true) {
    T = THEMES[key];
    document.documentElement.dataset.theme = key;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', T.meta);
    if (rebuild) buildRaster();
  }

  // ------------------------------------------------------------ boutique
  let shopTab = 'decor';
  const fmt = n => n.toLocaleString('fr-FR');

  // Aperçus des traînées (petites vignettes SVG).
  const TRAIL_PREVIEW = {
    none: '<path d="M32 10v30" stroke="#b9aecb" stroke-width="3" stroke-dasharray="3 5" stroke-linecap="round"/>',
    smoke: [[30, 14, 6], [36, 24, 7], [28, 33, 8]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#a9a9b6" opacity=".6"/>`).join(''),
    sparks: [[24, 12], [38, 18], [28, 26], [40, 32], [22, 36]].map(([x, y]) => `<path d="M${x} ${y - 4}l1.2 2.8 2.8 1.2-2.8 1.2-1.2 2.8-1.2-2.8-2.8-1.2 2.8-1.2z" fill="#ffc928"/>`).join(''),
    laser: '<path d="M32 6v36" stroke="#ff3cc8" stroke-width="10" stroke-linecap="round" opacity=".35"/><path d="M32 6v36" stroke="#00f0ff" stroke-width="4" stroke-linecap="round"/><path d="M32 6v36" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>'
  };

  function shopPreview(cat, key) {
    if (cat === 'decor') return `<span class="swatch" data-t="${key}"></span>`;
    if (cat === 'skins') return `<span class="prev"><img src="${svgURL(6, 0, true, 120, 120, key)}" alt=""></span>`;
    if (cat === 'trails') return `<span class="prev"><svg viewBox="0 0 64 64">${TRAIL_PREVIEW[key]}<image href="${svgURL(0, 0, true, 60, 60)}" x="18" y="34" width="28" height="28"/></svg></span>`;
    return `<button class="prev play" type="button" aria-label="Écouter ${SFX_PACKS[key].name}">▶</button>`;
  }

  function renderShop() {
    $('shop-coins').textContent = fmt(store.data.coins);
    document.querySelectorAll('.shop-tab').forEach(t => {
      const on = t.dataset.tab === shopTab;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', String(on));
    });
    const cat = CATALOG[shopTab];
    const list = $('shop-list');
    list.innerHTML = '';
    cat.order.forEach(key => {
      const art = cat.items[key];
      const owned = store.data[cat.owned].includes(key);
      const equipped = store.data[cat.eq] === key;
      const missing = art.price - store.data.coins;
      const card = document.createElement('div');
      card.className = 'shop-card' + (equipped ? ' equipped' : '');
      let action;
      if (equipped) action = '<span class="badge-equipped">✓ Équipé</span>';
      else if (owned) action = '<button class="btn-mini choose" type="button">Choisir</button>';
      else if (missing <= 0) action = `<button class="btn-mini price" type="button"><i class="coin-ico"></i>${fmt(art.price)}</button>`;
      else action = `<button class="btn-mini price" type="button" disabled><i class="coin-ico"></i>${fmt(art.price)}</button><small class="missing">Il manque ${fmt(missing)}</small>`;
      card.innerHTML = `${shopPreview(shopTab, key)}<span class="shop-info"><b>${art.name}</b><small>${art.price ? art.desc : 'Gratuit · ' + art.desc}</small></span><span class="shop-action">${action}</span>`;
      const btn = card.querySelector('.shop-action button:not([disabled])');
      if (btn) btn.addEventListener('click', () => (owned ? equip(shopTab, key) : buy(shopTab, key)));
      const play = card.querySelector('.play');
      if (play) play.addEventListener('click', () => previewSfx(key));
      list.appendChild(card);
    });
  }

  /** Joue un échantillon d'un pack de sons sans l'équiper. */
  function previewSfx(key) {
    A.unlock();
    const prev = A.pack;
    A.pack = key;
    A.plop(1);
    setTimeout(() => { A.pack = key; A.pop(4, 1); A.pack = prev; }, 260);
    A.pack = prev;
  }

  function buy(cat, key) {
    const art = CATALOG[cat].items[key];
    if (store.data.coins < art.price) return;
    store.data.coins -= art.price;
    store.data[CATALOG[cat].owned].push(key);
    A.jingle();
    Haptics.pulse([20, 40, 20]);
    equip(cat, key, true);
    toast(null, art.name + ' débloqué !', 'shop');
  }

  function equip(cat, key, silent) {
    store.data[CATALOG[cat].eq] = key;
    if (cat === 'decor') applyTheme(key);
    else if (cat === 'skins') { buildRaster(); updateNext(); }
    else if (cat === 'sfx') A.pack = key;
    store.save();
    if (!silent) A.click();
    updateCoins();
    renderShop();
  }

  function openShop() { A.unlock(); A.click(); renderShop(); openPanel('shop'); }
  $('btn-shop').addEventListener('click', openShop);
  $('btn-shop-start').addEventListener('click', openShop);
  document.querySelectorAll('.shop-tab').forEach(t => t.addEventListener('click', () => { shopTab = t.dataset.tab; A.click(); renderShop(); }));
  $('btn-codex-start').addEventListener('click', () => {
    A.unlock(); A.click();
    openCodex(store.data.discovered.reduce((m, v, i) => (v ? i : m), 0));
  });
  $('shop-close').addEventListener('click', closePanel);

  // ----------------------------------------------------------- réglages
  function applySettings() {
    const { music, sfx, haptics, motion } = store.data;
    A.setMusic(music);
    A.setSfx(sfx);
    $('btn-music').classList.toggle('off', !music);
    $('btn-music').setAttribute('aria-pressed', String(music));
    $('btn-sfx').classList.toggle('off', !sfx);
    $('btn-sfx').setAttribute('aria-pressed', String(sfx));
    $('opt-music').checked = music;
    $('opt-sfx').checked = sfx;
    $('opt-haptics').checked = haptics;
    $('opt-motion').checked = motion;
  }

  function setMusic(on) { store.data.music = on; store.save(); applySettings(); }
  function setSfx(on) { store.data.sfx = on; store.save(); applySettings(); A.click(); }

  $('btn-music').addEventListener('click', () => { A.unlock(); setMusic(!store.data.music); });
  $('btn-sfx').addEventListener('click', () => { A.unlock(); setSfx(!store.data.sfx); });
  $('opt-music').addEventListener('change', e => setMusic(e.target.checked));
  $('opt-sfx').addEventListener('change', e => setSfx(e.target.checked));
  $('opt-haptics').addEventListener('change', e => {
    store.data.haptics = e.target.checked;
    store.save();
    Haptics.pulse(15);
  });
  $('opt-motion').addEventListener('change', async e => {
    const wanted = e.target.checked;
    const on = wanted ? await requestMotion() : false;
    store.data.motion = on;
    store.save();
    applySettings();
    if (wanted && !on) toast(null, 'Accéléromètre indisponible ou refusé', 'power');
  });
  $('btn-pause').addEventListener('click', () => (current === 'pause' ? resume() : pause()));
  $('btn-play').addEventListener('click', start);
  $('btn-resume').addEventListener('click', resume);
  $('btn-restart').addEventListener('click', () => { A.click(); showOverlay(null); newGame(); });
  $('btn-replay').addEventListener('click', () => { A.unlock(); A.click(); showOverlay(null); newGame(); });
  ['swap', 'c4', 'shake'].forEach(k => $('pw-' + k).addEventListener('click', () => { A.unlock(); usePower(k); }));
  $('hint-cancel').addEventListener('click', () => { A.click(); setTargeting(false); });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pause();
      A.suspend();
      store.save();
    } else {
      A.resume();
    }
  });

  // ---------------------------------------------------- menu admin secret
  // Accès : 3 taps rapides sur la carte du score ou sur le titre, puis code PIN.
  // Le PIN est vérifié côté client : il protège des curieux, pas d'un vrai attaquant.
  const ADMIN_PIN = '210707';
  let pin = '', taps = 0, lastTap = 0;

  /** 3 taps d'affilée, chacun à moins de 500 ms du précédent. */
  function secretTap() {
    const now = performance.now();
    taps = now - lastTap < 500 ? taps + 1 : 1;
    lastTap = now;
    if (taps >= 3) { taps = 0; openPin(); }
  }
  $('score-box').addEventListener('click', secretTap);
  document.querySelector('.title').addEventListener('click', secretTap);

  function openPin() {
    pin = '';
    renderPin();
    openPanel('pin');
  }

  function renderPin() {
    [...$('pin-dots').children].forEach((d, i) => d.classList.toggle('on', i < pin.length));
  }

  function pinKey(k) {
    if (k === 'del') pin = pin.slice(0, -1);
    else if (pin.length < 6) pin += k;
    Haptics.pulse(8);
    renderPin();
    if (pin.length < 6) return;
    if (pin === ADMIN_PIN) {
      setTimeout(() => { renderAdmin(); showOverlay('admin'); }, 150);
    } else {
      const pad = $('pin-panel');
      pad.classList.remove('wrong');
      void pad.offsetWidth;
      pad.classList.add('wrong');
      Haptics.pulse([40, 40, 40]);
      setTimeout(() => { pin = ''; renderPin(); }, 400);
    }
  }
  document.querySelectorAll('#pin-pad button').forEach(b => b.addEventListener('click', () => pinKey(b.dataset.k)));
  $('pin-cancel').addEventListener('click', closePanel);

  let admTab = 'eco';
  const inGame = () => !!items && (state === 'play' || state === 'pause');

  function renderAdmin() {
    document.querySelectorAll('.adm-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === admTab));
    document.querySelectorAll('.adm-sec').forEach(sec => { sec.hidden = sec.dataset.tab !== admTab; });
    $('adm-coins').value = store.data.coins;
    $('adm-score').value = score;
    $('adm-best').value = store.data.best || 0;
    document.querySelectorAll('.adm-mult button').forEach(b => b.classList.toggle('active', +b.dataset.m === tuning.scoreMult));
    const sel = $('adm-weapon');
    if (!sel.options.length) ITEMS.forEach((it, k) => sel.add(new Option(`${String(k + 1).padStart(2, '0')} · ${it.name}`, k)));
    for (const [id, key, dec] of [['adm-gravity', 'gravity', 2], ['adm-rest', 'restitution', 2], ['adm-air', 'frictionAir', 3], ['adm-fric', 'friction', 2]]) {
      $(id).value = tuning[key];
      $(id + '-v').textContent = tuning[key].toFixed(dec);
    }
    $('adm-god').checked = tuning.god;
    $('adm-free').checked = tuning.freePowers;
    document.querySelectorAll('.adm-ingame').forEach(b => { b.disabled = !inGame(); });
    $('adm-coins-now').textContent = fmt(store.data.coins);
  }

  const admOk = msg => { A.click(); Haptics.pulse(10, 0.4); flashAdmin(msg); renderAdmin(); };
  let admMsgTimer = 0;
  function flashAdmin(msg) {
    const el = $('adm-status');
    el.textContent = '› ' + msg;
    el.classList.add('show');
    clearTimeout(admMsgTimer);
    admMsgTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }

  document.querySelectorAll('.adm-tab').forEach(t => t.addEventListener('click', () => { admTab = t.dataset.tab; A.click(); renderAdmin(); }));

  // --- Économie & stats
  const setCoins = n => {
    store.data.coins = Math.max(0, Math.min(999999999, Math.floor(n) || 0));
    store.save();
    updateCoins(true);
    admOk('Douilles = ' + fmt(store.data.coins));
  };
  $('adm-coins-set').addEventListener('click', () => setCoins(+$('adm-coins').value));
  document.querySelectorAll('[data-coins]').forEach(b => b.addEventListener('click', () => {
    const v = b.dataset.coins;
    setCoins(v[0] === '+' ? store.data.coins + +v.slice(1) : +v);
  }));
  $('adm-score-set').addEventListener('click', () => {
    score = shownScore = Math.max(0, Math.floor(+$('adm-score').value) || 0);
    updateHUD(true);
    updatePowers();
    admOk('Score = ' + fmt(score));
  });
  $('adm-best-set').addEventListener('click', () => {
    store.data.best = Math.max(0, Math.floor(+$('adm-best').value) || 0);
    store.save();
    updateHUD(true);
    $('start-best').textContent = store.data.best;
    admOk('Record = ' + fmt(store.data.best));
  });
  document.querySelectorAll('.adm-mult button').forEach(b => b.addEventListener('click', () => {
    tuning.scoreMult = +b.dataset.m;
    admOk('Multiplicateur de score x' + tuning.scoreMult);
  }));

  // --- Sandbox & spawner
  $('adm-place').addEventListener('click', () => {
    dropper.level = +$('adm-weapon').value;
    dropper.ready = true;
    dropper.appear = 0;
    markReached(dropper.level);
    admOk(ITEMS[dropper.level].name + ' placé sous le doigt');
  });
  $('adm-drop').addEventListener('click', () => {
    const lvl = +$('adm-weapon').value, g = geo(lvl);
    addItem(lvl, VIEW_W / 2, Math.min(DROP_Y, TANK_TOP - g.hh - 8), { center: true, dropped: true, vel: { x: 0, y: 2 } });
    markReached(lvl);
    A.plop(Math.min(lvl, 4));
    admOk(ITEMS[lvl].name + ' largué au centre');
  });
  $('adm-rain').addEventListener('click', () => {
    for (let k = 0; k < 15; k++) {
      const g = geo(0);
      addItem(0, TANK_L + g.hw + 4 + Math.random() * (TANK_R - TANK_L - 2 * g.hw - 8), -20 - k * 28,
        { center: true, dropped: true, angle: (Math.random() - 0.5) * 1.5, vel: { x: 0, y: 3 } });
    }
    admOk('Pluie de 15 munitions');
  });
  $('adm-clear').addEventListener('click', () => {
    for (const it of [...items.values()]) removeItem(it);
    dangerT = 0;
    admOk('Cuve vidée');
  });

  // --- Moteur physique (temps réel)
  const applyPhysics = () => {
    if (engine) engine.gravity.y = tuning.gravity;
    syncCeiling();
    BODY_OPTS.restitution = tuning.restitution;
    BODY_OPTS.frictionAir = tuning.frictionAir;
    BODY_OPTS.friction = tuning.friction;
    if (items) for (const it of items.values()) {
      it.body.restitution = tuning.restitution;
      it.body.frictionAir = tuning.frictionAir;
      it.body.friction = tuning.friction;
    }
  };
  for (const [id, key, dec] of [['adm-gravity', 'gravity', 2], ['adm-rest', 'restitution', 2], ['adm-air', 'frictionAir', 3], ['adm-fric', 'friction', 2]]) {
    $(id).addEventListener('input', e => {
      tuning[key] = +e.target.value;
      $(id + '-v').textContent = tuning[key].toFixed(dec);
      applyPhysics();
    });
  }
  document.querySelectorAll('[data-grav]').forEach(b => b.addEventListener('click', () => {
    tuning.gravity = +b.dataset.grav;
    applyPhysics();
    admOk('Gravité ' + b.textContent.trim().toLowerCase());
  }));
  $('adm-god').addEventListener('change', e => {
    tuning.god = e.target.checked;
    if (tuning.god) dangerT = 0;
    admOk(tuning.god ? 'God Mode : ligne rouge désactivée' : 'God Mode désactivé');
  });

  // --- Déverrouillages & triche
  $('adm-unlock').addEventListener('click', () => {
    for (const cat of Object.values(CATALOG)) store.data[cat.owned] = [...cat.order];
    store.save();
    updateCoins();
    admOk('Boutique entièrement débloquée (4 rayons)');
  });
  $('adm-free').addEventListener('change', e => {
    tuning.freePowers = e.target.checked;
    admOk(tuning.freePowers ? 'Pouvoirs illimités' : 'Pouvoirs normaux');
  });
  // Déclenche un pouvoir tout de suite, sans consommer de charge.
  const firePower = kind => {
    if (!inGame()) return;
    closePanel();
    if (kind === 'c4') {
      powers.c4++;                 // charge offerte, consommée par l'explosion
      usePower('c4');
    } else {
      const free = tuning.freePowers;
      tuning.freePowers = true;
      powers[kind] = Math.max(powers[kind], 1);
      usePower(kind);
      tuning.freePowers = free;
    }
    updatePowers();
  };
  $('adm-c4').addEventListener('click', () => firePower('c4'));
  $('adm-shake').addEventListener('click', () => firePower('shake'));
  $('adm-reset').addEventListener('click', () => {
    if (!confirm('Reset usine : effacer record, douilles, achats, codex et réglages ?')) return;
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
    store.save = store.saveSoon = () => {};    // empêche la sauvegarde de réécrire les données
    location.reload();
  });

  // Fermeture : croix ou glissé vers le bas sur l'en-tête.
  $('adm-close').addEventListener('click', closePanel);
  (() => {
    const deck = $('admin-deck');
    let y0 = null, dy = 0;
    deck.addEventListener('touchstart', e => {
      if (!e.target.closest('.adm-head')) return;
      y0 = e.touches[0].clientY; dy = 0;
      deck.style.transition = 'none';
    }, { passive: true });
    deck.addEventListener('touchmove', e => {
      if (y0 == null) return;
      dy = Math.max(0, e.touches[0].clientY - y0);
      deck.style.transform = `translateY(${dy}px)`;
    }, { passive: true });
    deck.addEventListener('touchend', () => {
      if (y0 == null) return;
      y0 = null;
      deck.style.transition = '';
      deck.style.transform = '';
      if (dy > 90) closePanel();
    });
  })();

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

  function boot() {
    Sprites.measure();
    applyTheme(store.data.theme, false);
    buildEvo();
    initStartScreen();
    applySettings();
    updateCoins();
    reached = ITEMS.map(() => false);
    updateEvo();
    updateNext();
    updateHUD(true);
    updatePowers();
    resize();
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
    get powers() { return { ...powers }; },
    get targeting() { return targeting; },
    get rasterReady() { return raster.length === ITEMS.length; },
    drop, start, newGame, usePower, gameOver,
    aim(x) { dropper.tx = x; },
    spawn(level, x, y, angle) { return addItem(level, x, y, { center: true, angle }); },
    /** Interpénétration entre armes (px monde) : la plus forte et la moyenne. */
    contacts() {
      const d = engine.pairs.list
        .filter(p => p.isActive && items.has(p.bodyA.parent.id) && items.has(p.bodyB.parent.id))
        .map(p => p.collision.depth);
      return { n: d.length, max: d.length ? Math.max(...d) : 0, avg: d.length ? d.reduce((a, b) => a + b, 0) / d.length : 0 };
    },
    items() { return [...items.values()].map(it => ({ level: it.level, x: it.body.position.x, y: it.body.position.y, a: it.body.angle })); }
  };

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
