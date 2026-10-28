/* =========================================================================
   Chibi Arsenal — sprites vectoriels (SVG inline) + hitboxes physiques
   Chaque arme est dessinée directement, sans bulle : silhouette dodue,
   contour prune, yeux expressifs. Les hitboxes (`hit`) sont exprimées dans
   le même repère que le dessin pour que la physique colle à la silhouette :
     ['r', x, y, w, h, arrondi, angle°]  rectangle (coin haut-gauche, rotation autour du centre)
     ['c', cx, cy, r]                     cercle
   ========================================================================= */
(function () {
  'use strict';

  const INK = '#3d2c4e';           // contour sombre (prune)
  let OL = INK;                    // contour courant (fluo en finition néon)
  const SW = 5;                    // épaisseur de contour

  // ---------------------------------------------------------------- helpers
  /** Assombrit (amt < 0) ou éclaircit (amt > 0) une couleur hex. */
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = c => Math.max(0, Math.min(255, Math.round(c + (amt < 0 ? c * amt : (255 - c) * amt))));
    return '#' + ((1 << 24) | (f(n >> 16) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).slice(1);
  }

  const mix = (a, b, t) => {
    const p = parseInt(a.slice(1), 16), q = parseInt(b.slice(1), 16);
    const c = sh => Math.round(((p >> sh) & 255) * (1 - t) + ((q >> sh) & 255) * t);
    return '#' + ((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1);
  };
  const luma = hex => {
    const n = parseInt(hex.slice(1), 16);
    return (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255;
  };

  // Dégradés utilisés pendant la construction d'un SVG (null = couleurs à plat).
  let grads = null, skin = 'classic';
  const paint = hex => {
    if (!grads || hex[0] !== '#') return hex;
    grads.add(hex);
    return `url(#g${hex.slice(1)})`;
  };

  /** Dégradé vertical à 5 arrêts. */
  const linear = (id, stops) => `<linearGradient id="${id}" x1="0" y1="0" x2="0.25" y2="1">` +
    stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('') + '</linearGradient>';

  /** Volume "jouet vinyle" : haut éclairé, bas dans l'ombre. */
  const vinyl = (id, hex) => linear(id, [[0, shade(hex, 0.55)], [0.18, shade(hex, 0.22)], [0.55, hex], [0.86, shade(hex, -0.22)], [1, shade(hex, -0.38)]]);

  /** Finitions : classique (couleur signature), camo urbain, plaqué or. */
  const gradDefs = () => [...grads].map(hex => {
    const id = 'g' + hex.slice(1);
    if (skin === 'neon') {
      // Néon : carrosserie sombre teintée, reflet discret.
      const d = mix(hex, '#0a0d1c', 0.8);
      return linear(id, [[0, shade(d, 0.35)], [0.3, d], [1, shade(d, -0.4)]]);
    }
    if (skin === 'gold') {
      // Or poli : bandes de reflets métalliques, plus clair là où la pièce l'était.
      const g = shade('#f2b51d', (luma(hex) - 0.5) * 0.7);
      return linear(id, [[0, '#fffbe6'], [0.2, shade(g, 0.45)], [0.42, g], [0.55, shade(g, -0.3)], [0.7, shade(g, 0.25)], [1, shade(g, -0.45)]]);
    }
    if (skin === 'camo') {
      // Camo urbain teinté de la couleur de l'arme (on la reconnaît toujours).
      const base = mix(hex, '#8d939c', 0.5);
      const dark = shade(base, -0.42), pale = mix(base, '#eef1f5', 0.55);
      const blobs = [
        [dark, 'M.05 .15C.2 .05 .35 .2 .3 .35S.1 .45 .05 .3Z'],
        [pale, 'M.45 .05C.6 0 .75 .12 .68 .25S.45 .3 .45 .05Z'],
        [dark, 'M.6 .45C.8 .38 .95 .55 .88 .7S.62 .72 .6 .45Z'],
        [pale, 'M.15 .6C.3 .52 .45 .65 .38 .8S.12 .82 .15 .6Z'],
        ['#3b4048', 'M.4 .38C.5 .32 .58 .42 .52 .5S.38 .5 .4 .38Z'],
        ['#3b4048', 'M.78 .1C.88 .06 .97 .16 .9 .24S.75 .2 .78 .1Z'],
        [pale, 'M.62 .82C.75 .76 .88 .86 .8 .96S.6 .95 .62 .82Z']
      ];
      return vinyl('b' + hex.slice(1), base) +
        `<pattern id="${id}" width="1" height="1" patternContentUnits="objectBoundingBox">` +
        `<rect width="1" height="1" fill="url(#b${hex.slice(1)})"/>` +
        blobs.map(([c, d]) => `<path d="${d}" fill="${c}" opacity=".62"/>`).join('') +
        `<rect width="1" height=".35" fill="#fff" opacity=".12"/></pattern>`;
    }
    return vinyl(id, hex);
  }).join('');

  /** Contour fluo dérivé de la couleur de la pièce (finition néon). */
  const neonOf = hex => (hex[0] === '#' ? shade(mix(hex, '#00f0ff', 0.15), 0.35) : '#9ff6ff');
  const st = (fill, w = SW) =>
    `fill="${paint(fill)}" stroke="${skin === 'neon' ? neonOf(fill) : OL}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const line = (w = SW, color = OL) =>
    `fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;

  /**
   * Visage kawaii. `v` = expression : 0 yeux ouverts, 1 clignement,
   * 2 écrasé (> <), 3 yeux écarquillés (gros choc).
   */
  function face(x, y, s, v, mouth = 'smile') {
    v = v === true ? 1 : (v || 0);
    const ex = 12 * s;
    let eyes;
    if (v === 1) {
      eyes = [-1, 1].map(k =>
        `<path d="M${x + k * ex - 6.5 * s} ${y} q${6.5 * s} ${5 * s} ${13 * s} 0" ${line(3.6 * s)}/>`
      ).join('');
    } else if (v === 2) {
      // > <
      eyes = [-1, 1].map(k => {
        const cx = x + k * ex, d = -k * 5.5 * s;
        return `<path d="M${cx - d} ${y - 6 * s} L${cx + d} ${y} L${cx - d} ${y + 6 * s}" ${line(3.8 * s)}/>`;
      }).join('');
      mouth = 'wobble';
    } else if (v === 3) {
      eyes = [-1, 1].map(k => {
        const cx = x + k * ex;
        return `<ellipse cx="${cx}" cy="${y}" rx="${7.8 * s}" ry="${9.4 * s}" fill="#fff" stroke="${OL}" stroke-width="${2.6 * s}"/>` +
          `<circle cx="${cx}" cy="${y + 0.5 * s}" r="${3.4 * s}" fill="${OL}"/>` +
          `<circle cx="${cx - 1.2 * s}" cy="${y - 0.8 * s}" r="${1.1 * s}" fill="#fff"/>`;
      }).join('');
      mouth = 'o';
    } else {
      eyes = [-1, 1].map(k => {
        const cx = x + k * ex;
        return `<ellipse cx="${cx}" cy="${y}" rx="${6.6 * s}" ry="${8.2 * s}" fill="${OL}"/>` +
          `<circle cx="${cx - 2.2 * s}" cy="${y - 3.2 * s}" r="${2.7 * s}" fill="#fff"/>` +
          `<circle cx="${cx + 2.4 * s}" cy="${y + 3 * s}" r="${1.2 * s}" fill="#fff"/>`;
      }).join('');
    }
    const blush = [-1, 1].map(k =>
      `<ellipse cx="${x + k * 23 * s}" cy="${y + 8 * s}" rx="${6.2 * s}" ry="${3.6 * s}" fill="#ff8fab" opacity=".7"/>`
    ).join('');
    const my = y + 9 * s;
    let m;
    switch (mouth) {
      case 'open':
        m = `<path d="M${x - 5 * s} ${my} q${5 * s} ${9 * s} ${10 * s} 0 z" fill="#c2405b" stroke="${OL}" stroke-width="${2.8 * s}" stroke-linejoin="round"/>`;
        break;
      case 'o':
        m = `<ellipse cx="${x}" cy="${my + 2.5 * s}" rx="${3.6 * s}" ry="${4.6 * s}" fill="#c2405b" stroke="${OL}" stroke-width="${2.6 * s}"/>`;
        break;
      case 'wobble':
        m = `<path d="M${x - 8 * s} ${my + 2 * s} l${4 * s} ${-3 * s} l${4 * s} ${3 * s} l${4 * s} ${-3 * s} l${4 * s} ${3 * s}" ${line(2.6 * s)}/>`;
        break;
      case 'cat':
        m = `<path d="M${x - 7 * s} ${my} q${3.5 * s} ${4.5 * s} ${7 * s} 0 q${3.5 * s} ${4.5 * s} ${7 * s} 0" ${line(2.8 * s)}/>`;
        break;
      case 'tongue':
        m = `<path d="M${x - 6 * s} ${my} q${6 * s} ${6 * s} ${12 * s} 0" ${line(2.8 * s)}/>` +
          `<path d="M${x - 1 * s} ${my + 3 * s} q${3 * s} ${6 * s} ${6 * s} 0" fill="#ff7a93" stroke="${OL}" stroke-width="${2.2 * s}"/>`;
        break;
      case 'grin':
        m = `<path d="M${x - 9 * s} ${my - 1 * s} q${9 * s} ${12 * s} ${18 * s} 0 z" fill="#c2405b" stroke="${OL}" stroke-width="${2.8 * s}" stroke-linejoin="round"/>` +
          `<path d="M${x - 4 * s} ${my + 5 * s} q${4 * s} ${-3 * s} ${8 * s} 0" fill="#ff8aa0"/>`;
        break;
      default:
        m = `<path d="M${x - 5 * s} ${my} q${5 * s} ${5 * s} ${10 * s} 0" ${line(2.8 * s)}/>`;
    }
    return `<g>${blush}${eyes}${m}</g>`;
  }

  /** Petit reflet brillant. */
  const shine = (x, y, w, h, rot = -20, op = 0.55) =>
    `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${h}" fill="#fff" opacity="${op}" transform="rotate(${rot} ${x} ${y})"/>`;

  // ----------------------------------------------------------------- armes
  const ITEMS = [
    {
      name: 'Munition 9mm', short: '9mm', size: 34,
      lore: 'La plus petite de la bande… et la plus rapide à s’énerver. Elle adore rouler sous les meubles et se cacher dans les poches.',
      hit: [['r', -32, -6, 64, 58, 14], ['r', -36, 44, 72, 14, 6], ['r', -30, -30, 60, 32, 6], ['c', 0, -36, 27]],
      art: c => `
        <path d="M-30 -2 C-30 -40 -14 -60 0 -62 C14 -60 30 -40 30 -2 Z" ${st('#FF8A3D')}/>
        ${shine(-12, -34, 6, 14, 20, 0.6)}
        <rect x="-32" y="-6" width="64" height="58" rx="14" ${st('#FFD23F')}/>
        <rect x="-36" y="44" width="72" height="14" rx="6" ${st('#F2A922')}/>
        <rect x="-24" y="2" width="8" height="38" rx="4" fill="#fff" opacity=".45"/>
        ${face(2, 18, 0.95, c, 'smile')}`
    },
    {
      name: 'Flashbang', short: 'Flash', size: 42,
      lore: 'Timide, elle cligne des yeux sans arrêt et rougit dès qu’on la regarde. Quand elle éclate de rire… tout le monde est ébloui.',
      hit: [['r', -34, -36, 68, 88, 20], ['r', -26, -50, 52, 18, 6], ['r', 12, -56, 30, 15, 7], ['r', 30, -32, 18, 62, 8, 8], ['c', -30, -52, 16], ['c', 36, -38, 12]],
      art: c => `
        <path d="M14 -48 q30 0 28 30 l-6 44" ${line(14)}/>
        <path d="M14 -48 q30 0 28 30 l-6 44" ${line(7, '#E8EDF5')}/>
        <circle cx="-30" cy="-52" r="12" fill="none" stroke="${OL}" stroke-width="10"/>
        <circle cx="-30" cy="-52" r="12" fill="none" stroke="#ffcf4a" stroke-width="5"/>
        <rect x="-26" y="-50" width="52" height="18" rx="7" ${st('#3FA82A')}/>
        <rect x="-34" y="-36" width="68" height="88" rx="22" ${st('#7BE33B')}/>
        <rect x="-34" y="-6" width="68" height="10" ${st('#4FB52A', 4)}/>
        <circle cx="-22" cy="34" r="3.2" fill="${OL}" opacity=".35"/>
        <circle cx="-10" cy="40" r="3.2" fill="${OL}" opacity=".35"/>
        <circle cx="10" cy="40" r="3.2" fill="${OL}" opacity=".35"/>
        <circle cx="22" cy="34" r="3.2" fill="${OL}" opacity=".35"/>
        ${shine(-20, -20, 6, 10, 0, 0.55)}
        ${face(0, 18, 0.95, c, 'open')}`
    },
    {
      name: 'Glock', short: 'Glock', size: 51,
      lore: 'Compact, fiable, toujours à l’heure. Il range ses munitions par couleur et fait la sieste dans les étuis.',
      hit: [['r', -58, -48, 118, 42, 18], ['r', -54, -12, 98, 20, 8], ['r', -54, -6, 48, 66, 12], ['r', -19, -2, 46, 36, 14]],
      art: c => `
        <path d="M-50 -6 L-14 -6 L-6 46 Q-6 60 -20 60 L-40 60 Q-54 60 -54 46 Z" ${st('#D93A86')}/>
        <path d="M-44 14 l18 0 M-43 26 l20 0 M-42 38 l21 0" ${line(3, '#A82566')}/>
        <path d="M-12 2 Q-12 28 12 26 L20 4" ${line(14)}/>
        <path d="M-12 2 Q-12 28 12 26 L20 4" ${line(6, '#D93A86')}/>
        <path d="M-2 4 q2 10 6 12" ${line(5)}/>
        <rect x="-54" y="-12" width="98" height="20" rx="8" ${st('#D93A86')}/>
        <rect x="-58" y="-48" width="118" height="42" rx="18" ${st('#FF4FA3')}/>
        <path d="M-48 -38 l0 22 M-40 -38 l0 22" ${line(3.5, '#D93A86')}/>
        <rect x="44" y="-40" width="10" height="8" rx="3" fill="${OL}"/>
        ${shine(-14, -40, 22, 4, 0, 0.5)}
        ${face(8, -28, 1, c, 'cat')}`
    },
    {
      name: 'Revolver Magnum', short: 'Magnum', size: 61,
      lore: 'Il fait tourner son gros barillet quand il réfléchit et raconte toujours la même histoire de cow-boy. Personne n’ose l’interrompre.',
      hit: [['c', -6, -14, 34], ['r', -44, -44, 66, 50, 14], ['r', 18, -38, 66, 34, 10], ['r', -55, -4, 50, 72, 15, 10], ['r', -62, -54, 30, 28, 10], ['r', 70, -52, 18, 16, 4], ['r', -21, -4, 46, 34, 14]],
      art: c => `
        <path d="M-40 -2 Q-56 30 -50 56 Q-46 66 -32 64 L-18 62 Q-6 60 -10 46 Q-16 22 -4 0 Z" ${st('#7A45E0')}/>
        <path d="M-36 14 q-6 18 -4 36" ${line(3.5, '#5A2FB8')}/>
        <path d="M-14 0 Q-12 26 10 24 L18 2" ${line(14)}/>
        <path d="M-14 0 Q-12 26 10 24 L18 2" ${line(6, '#A66BFF')}/>
        <path d="M-36 -38 q-14 -16 -24 -6 q8 4 10 14" ${st('#6A3BC9')}/>
        <rect x="18" y="-38" width="66" height="22" rx="10" ${st('#C9A8FF')}/>
        <rect x="18" y="-20" width="60" height="16" rx="8" ${st('#B48BFF')}/>
        <path d="M74 -38 l4 -10 l6 10" ${st('#6A3BC9', 4)}/>
        <rect x="-44" y="-44" width="66" height="50" rx="16" ${st('#A66BFF')}/>
        <circle cx="-6" cy="-14" r="34" ${st('#E6D9FF')}/>
        ${[0, 60, 120, 180, 240, 300].map(a => {
          const x = -6 + 26 * Math.cos(a * Math.PI / 180), y = -14 + 26 * Math.sin(a * Math.PI / 180);
          return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="#A66BFF"/>`;
        }).join('')}
        ${shine(-20, -32, 10, 5, -30, 0.7)}
        ${face(-6, -15, 0.85, c, 'open')}`
    },
    {
      name: 'MP5', short: 'MP5', size: 72,
      lore: 'Hyperactif, il mitraille des blagues à toute vitesse. S’il garde sa crosse rentrée, c’est pour faire des câlins plus serrés.',
      hit: [['r', -44, -38, 86, 40, 14], ['r', 6, -44, 56, 12, 5], ['r', 34, -28, 48, 24, 10], ['r', -68, -36, 24, 44, 7], ['r', 9.5, -8, 27, 60, 9, -21], ['r', -33, -6, 28, 50, 9, 8], ['c', -34, -40, 10]],
      art: c => `
        <path d="M4 -4 Q8 28 24 52 L42 42 Q28 22 24 -4 Z" ${st('#1F7FD1')}/>
        <path d="M-28 -6 L-8 -6 L-4 34 Q-6 44 -16 44 L-26 44 Q-34 42 -32 32 Z" ${st('#1F7FD1')}/>
        <rect x="-68" y="-36" width="14" height="44" rx="7" ${st('#1F7FD1')}/>
        <rect x="-60" y="-28" width="24" height="10" rx="5" ${st('#5CC4FF', 4)}/>
        <rect x="34" y="-28" width="40" height="24" rx="10" ${st('#1F7FD1')}/>
        <rect x="70" y="-22" width="12" height="12" rx="4" ${st('#155E9E', 4)}/>
        <rect x="6" y="-44" width="56" height="10" rx="5" ${st('#2A93E8', 4)}/>
        <rect x="-44" y="-36" width="86" height="38" rx="16" ${st('#38B6FF')}/>
        <circle cx="-34" cy="-40" r="7" ${st('#2A93E8', 4)}/>
        ${shine(-10, -30, 20, 4, 0, 0.5)}
        ${face(-2, -18, 0.82, c, 'smile')}`
    },
    {
      name: 'Fusil à pompe M4', short: 'Pompe', size: 85,
      lore: 'Un grand cœur sous des airs bourrus. Il collectionne les cartouches rouges comme des bonbons et refuse de les partager.',
      hit: [['r', -40, -38, 58, 40, 14], ['r', 8, -36, 80, 42, 11], ['r', -80, -30, 44, 54, 14], ['r', -34, -2, 30, 46, 10, 5], ['r', -35, -52, 20, 16, 5]],
      art: c => `
        <path d="M-38 -30 L-66 -22 Q-80 -18 -80 -6 L-80 14 Q-78 24 -66 22 L-38 6 Z" ${st('#C92E3A')}/>
        ${[-70, -61, -52].map(x =>
          `<rect x="${x}" y="-14" width="8" height="22" rx="3" ${st('#FFF1A8', 3)}/>` +
          `<rect x="${x}" y="4" width="8" height="6" rx="2" fill="#f7c84e" stroke="${OL}" stroke-width="2.5"/>`
        ).join('')}
        <path d="M-28 0 L-10 0 L-6 34 Q-8 42 -18 42 L-26 42 Q-34 40 -32 32 Z" ${st('#C92E3A')}/>
        <rect x="14" y="-14" width="62" height="16" rx="8" ${st('#A8222F')}/>
        <rect x="28" y="-16" width="26" height="20" rx="6" ${st('#FF7A7A', 4)}/>
        <path d="M34 -12 l0 12 M41 -12 l0 12 M48 -12 l0 12" ${line(2.5, '#C92E3A')}/>
        <rect x="8" y="-36" width="80" height="22" rx="11" ${st('#FF4848')}/>
        <circle cx="86" cy="-25" r="5" fill="${OL}"/>
        <rect x="-40" y="-38" width="58" height="40" rx="14" ${st('#FF5A5A')}/>
        <path d="M-32 -38 l6 -10 l8 10" ${st('#C92E3A', 4)}/>
        ${shine(-20, -32, 12, 3.5, 0, 0.5)}
        ${face(-10, -18, 0.82, c, 'grin')}`
    },
    {
      name: 'HK416', short: 'HK416', size: 98,
      lore: 'Premier de la classe, il range son paquetage au millimètre. Son chargeur banane ? Il jure que c’est son goûter.',
      hit: [['r', -40, -32, 74, 34, 12], ['r', 30, -28, 58, 24, 9], ['r', -78, -28, 42, 42, 12], ['r', -18, -52, 34, 22, 8], ['r', -1, -2, 28, 56, 9, -18], ['r', -33, -2, 24, 44, 8, 5]],
      art: c => `
        <path d="M-6 0 Q-4 30 12 54 L32 44 Q18 22 18 0 Z" ${st('#D9620A')}/>
        <path d="M-1 14 l16 -2 M3 26 l16 -3 M9 38 l15 -4" ${line(3, '#A84A06')}/>
        <path d="M-30 -2 L-12 -2 L-8 34 Q-10 42 -20 42 L-28 42 Q-36 40 -34 32 Z" ${st('#E87512')}/>
        <path d="M-38 -26 L-62 -28 Q-76 -28 -78 -14 L-78 6 Q-76 16 -64 14 L-38 2 Z" ${st('#E87512')}/>
        <rect x="30" y="-28" width="40" height="24" rx="9" ${st('#FFA347')}/>
        <path d="M40 -16 l20 0" ${line(4, '#C55A0B')}/>
        <rect x="68" y="-22" width="12" height="12" rx="3" ${st('#3E4456', 4)}/>
        <rect x="78" y="-24" width="10" height="16" rx="4" ${st('#3E4456', 4)}/>
        <rect x="-40" y="-32" width="74" height="34" rx="13" ${st('#FF8A1F')}/>
        <rect x="-18" y="-52" width="34" height="20" rx="9" ${st('#3E4456')}/>
        <circle cx="14" cy="-42" r="5" fill="#ff86a8"/>
        <circle cx="13" cy="-44" r="1.8" fill="#fff"/>
        ${shine(-18, -26, 16, 3.5, 0, 0.55)}
        ${face(-6, -14, 0.8, c, 'tongue')}`
    },
    {
      name: 'RPG-7', short: 'RPG-7', size: 112,
      lore: 'Sa tête toute ronde déborde d’idées explosives. Son rêve secret : devenir une montgolfière.',
      hit: [['r', -90, -15, 124, 30, 10], ['c', 65, 0, 34], ['r', -64, 4, 24, 38, 8], ['r', -32, 4, 24, 34, 8], ['r', -93, -21, 22, 42, 6], ['r', -39, -29, 16, 18, 4], ['r', 94, -9, 15, 18, 4]],
      art: c => `
        <path d="M-56 4 L-42 4 L-40 34 Q-42 42 -50 42 L-56 42 Q-64 40 -62 32 Z" ${st('#B532B5')}/>
        <path d="M-24 4 L-10 4 L-8 30 Q-10 38 -18 38 L-24 38 Q-32 36 -30 28 Z" ${st('#B532B5')}/>
        <path d="M-90 -18 L-74 -10 L-74 10 L-90 18 Z" ${st('#B532B5')}/>
        <rect x="-78" y="-11" width="104" height="22" rx="10" ${st('#C94BD0')}/>
        <rect x="-48" y="-15" width="38" height="30" rx="8" ${st('#FFB05C')}/>
        <path d="M-42 -8 l26 0 M-42 0 l26 0 M-42 8 l26 0" ${line(2.5, '#D9822B')}/>
        <rect x="-36" y="-26" width="10" height="12" rx="3" ${st('#3e4456', 3.5)}/>
        <rect x="18" y="-10" width="16" height="20" rx="4" ${st('#B532B5')}/>
        <path d="M30 -8 C36 -12 40 -34 62 -34 C86 -34 98 -16 100 0 C98 16 86 34 62 34 C40 34 36 12 30 8 Z" ${st('#F062F0')}/>
        <path d="M98 -6 L106 0 L98 6 Z" ${st('#B532B5', 4)}/>
        ${shine(54, -22, 14, 6, -15, 0.55)}
        ${face(62, 0, 1, c, 'cat')}`
    },
    {
      name: 'Sniper .50 BMG', short: '.50 BMG', size: 130,
      lore: 'Elle peut patienter des heures sans bouger… pour admirer les étoiles dans sa lunette géante. Ne la réveillez pas.',
      hit: [['r', -84, -27, 108, 40, 12], ['r', 18, -16, 48, 12, 5], ['r', 62, -26, 30, 32, 10], ['r', -48, -66, 100, 36, 15], ['r', -35, 2, 30, 44, 10, 5], ['r', -10, 4, 22, 22, 5], ['r', 27, -5, 10, 46, 4, 15], ['r', 44, -5, 10, 46, 4, -17.6]],
      art: c => `
        <path d="M38 -4 L26 40 M42 -4 L56 40" ${line(6)}/>
        <rect x="-78" y="-22" width="42" height="32" rx="12" ${st('#12A385')}/>
        <rect x="-82" y="-24" width="10" height="36" rx="5" ${st('#2E3550')}/>
        <path d="M-28 4 L-10 4 L-6 34 Q-8 42 -18 42 L-26 42 Q-34 40 -32 32 Z" ${st('#12A385')}/>
        <rect x="-10" y="4" width="22" height="22" rx="5" ${st('#0E8A70')}/>
        <rect x="18" y="-16" width="48" height="12" rx="5" ${st('#8E96B0')}/>
        <rect x="62" y="-26" width="30" height="32" rx="10" ${st('#2E3550')}/>
        <rect x="68" y="-18" width="6" height="16" rx="3" fill="${OL}"/>
        <rect x="80" y="-18" width="6" height="16" rx="3" fill="${OL}"/>
        <rect x="-42" y="-26" width="66" height="34" rx="12" ${st('#1FD8B0')}/>
        <rect x="-26" y="-36" width="8" height="12" rx="2" ${st('#2E3550', 3.5)}/>
        <rect x="8" y="-36" width="8" height="12" rx="2" ${st('#2E3550', 3.5)}/>
        <rect x="-40" y="-62" width="76" height="28" rx="14" ${st('#2E3550')}/>
        <ellipse cx="40" cy="-48" rx="12" ry="18" ${st('#4b5268')}/>
        <ellipse cx="41" cy="-48" rx="6" ry="11" fill="#9fd7ff"/>
        <ellipse cx="39" cy="-53" rx="2.5" ry="4" fill="#fff"/>
        <ellipse cx="-40" cy="-48" rx="8" ry="13" ${st('#4b5268')}/>
        ${shine(-14, -56, 18, 3.5, 0, 0.45)}
        ${face(-10, -10, 0.72, c, 'smile')}`
    },
    {
      name: 'Minigun M134', short: 'Minigun', size: 150,
      lore: 'Quand il est content, ses canons se mettent à tourner tout seuls. Il est TRÈS souvent content.',
      hit: [['r', -64, -38, 66, 62, 20], ['r', -4, -40, 78, 58, 10], ['r', -76, -22, 16, 36, 7], ['r', -46, 18, 22, 40, 10, 18], ['r', -80, 40, 48, 24, 11, -12], ['r', -56, -56, 46, 20, 9]],
      art: c => `
        <path d="M-30 22 Q-40 52 -70 56" ${line(18)}/>
        <path d="M-30 22 Q-40 52 -70 56" ${line(10, '#8B5E3C')}/>
        ${[[-32, 30], [-38, 42], [-48, 51], [-60, 55]].map(([x, y]) =>
          `<ellipse cx="${x}" cy="${y}" rx="4" ry="6.5" fill="#f7c84e" stroke="${OL}" stroke-width="2.5"/>`
        ).join('')}
        <rect x="-76" y="-22" width="16" height="36" rx="7" ${st('#3242C9')}/>
        <rect x="-4" y="-34" width="72" height="13" rx="6" ${st('#A9B4FF')}/>
        <rect x="-4" y="-17" width="76" height="13" rx="6" ${st('#C3CBFF')}/>
        <rect x="-4" y="0" width="72" height="13" rx="6" ${st('#A9B4FF')}/>
        <rect x="18" y="-40" width="10" height="58" rx="5" ${st('#3242C9', 4)}/>
        <rect x="56" y="-40" width="10" height="58" rx="5" ${st('#3242C9', 4)}/>
        <path d="M-52 -34 Q-36 -64 -14 -34" ${line(14)}/>
        <path d="M-52 -34 Q-36 -64 -14 -34" ${line(7, '#3242C9')}/>
        <rect x="-64" y="-38" width="66" height="62" rx="22" ${st('#5468FF')}/>
        ${shine(-46, -26, 12, 5, -25, 0.55)}
        ${face(-30, -6, 1, c, 'open')}`
    },
    {
      name: 'Mini-Tank Graal', short: 'Graal', size: 210,
      lore: 'Le légendaire mini-tank. Il porte une couronne un peu trop petite et le sait très bien. C’est le plus câlin de tout l’arsenal.',
      hit: [['r', -82, 8, 164, 44, 22], ['r', -78, -18, 158, 32, 10], ['c', 0, -24, 46], ['r', 26, -53, 68, 24, 7], ['r', -22, -104, 44, 32, 9]],
      art: c => `
        <rect x="26" y="-48" width="58" height="14" rx="7" ${st('#E0A21C')}/>
        <rect x="80" y="-53" width="14" height="24" rx="5" ${st('#C4880F')}/>
        <path d="M-44 -14 Q-44 -70 0 -70 Q44 -70 44 -14 Z" ${st('#FFD04D')}/>
        <ellipse cx="-6" cy="-70" rx="16" ry="6" ${st('#E0A21C', 4)}/>
        <path d="M-18 -76 L-14 -94 L-6 -82 L0 -98 L6 -82 L14 -94 L18 -76 Z" ${st('#FF7AC0', 4)}/>
        <circle cx="0" cy="-98" r="3.5" fill="#ff86a8" stroke="${OL}" stroke-width="2"/>
        <path d="M-78 -2 Q-78 -18 -60 -18 L60 -18 Q80 -18 80 -2 L72 14 L-70 14 Z" ${st('#FFC93C')}/>
        <rect x="-82" y="8" width="164" height="44" rx="22" ${st('#4f5468')}/>
        ${[-56, -28, 0, 28, 56].map(x =>
          `<circle cx="${x}" cy="30" r="11" ${st('#a9aec0', 4)}/><circle cx="${x}" cy="30" r="3.5" fill="${OL}"/>`
        ).join('')}
        <path d="M58 -14 l3 7 l7 1 l-5 5 l1 7 l-6 -3 l-6 3 l1 -7 l-5 -5 l7 -1 z" fill="#FF5FA8" stroke="${OL}" stroke-width="2.5" stroke-linejoin="round"/>
        ${shine(-24, -52, 12, 6, -30, 0.6)}
        ${face(-2, -36, 1.25, c, 'grin')}`
    }
  ];

  /** Le point (x, y) est-il dans la pièce de hitbox h ? */
  function inside(h, x, y) {
    if (h[0] === 'c') return (x - h[1]) ** 2 + (y - h[2]) ** 2 <= h[3] * h[3];
    const [, rx, ry, w, hh, ch, ang = 0] = h;
    const a = -ang * Math.PI / 180, cx = rx + w / 2, cy = ry + hh / 2;
    const dx = x - cx, dy = y - cy;
    const lx = Math.abs(dx * Math.cos(a) - dy * Math.sin(a)), ly = Math.abs(dx * Math.sin(a) + dy * Math.cos(a));
    const r = Math.min(ch, w / 2, hh / 2), qx = lx - (w / 2 - r), qy = ly - (hh / 2 - r);
    if (lx > w / 2 || ly > hh / 2) return false;
    return qx <= 0 || qy <= 0 || qx * qx + qy * qy <= r * r;
  }

  // Étendue des hitboxes (repère du dessin) : utile pour viser et borner.
  ITEMS.forEach(it => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const h of it.hit) {
      if (h[0] === 'c') {
        x0 = Math.min(x0, h[1] - h[3]); x1 = Math.max(x1, h[1] + h[3]);
        y0 = Math.min(y0, h[2] - h[3]); y1 = Math.max(y1, h[2] + h[3]);
      } else {
        const [, x, y, w, hh, , ang = 0] = h;
        const a = ang * Math.PI / 180, cx = x + w / 2, cy = y + hh / 2;
        const ex = Math.abs(w / 2 * Math.cos(a)) + Math.abs(hh / 2 * Math.sin(a));
        const ey = Math.abs(w / 2 * Math.sin(a)) + Math.abs(hh / 2 * Math.cos(a));
        x0 = Math.min(x0, cx - ex); x1 = Math.max(x1, cx + ex);
        y0 = Math.min(y0, cy - ey); y1 = Math.max(y1, cy + ey);
      }
    }
    it.hitBox = { x0, y0, x1, y1 };
    // Surface réelle de la hitbox (union des pièces, échantillonnée sur une grille).
    let n = 0;
    for (let y = y0; y < y1; y += 1.5) for (let x = x0; x < x1; x += 1.5) if (it.hit.some(h => inside(h, x, y))) n++;
    it.area = n * 2.25;
    // `size` = diamètre équivalent visé (monde) : la taille suit la surface, pas la longueur.
    it.scale = it.size / Math.sqrt(4 * it.area / Math.PI);
    it.view = { x: x0 - 20, y: y0 - 20, w: x1 - x0 + 40, h: y1 - y0 + 40 }; // affiné par measure()
  });

  /** Mesure la vraie boîte englobante des dessins (à appeler une fois le DOM prêt). */
  function measure() {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '400');
    svg.setAttribute('height', '400');
    svg.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden';
    document.body.appendChild(svg);
    ITEMS.forEach(it => {
      const g = document.createElementNS(NS, 'g');
      g.innerHTML = it.art(false);
      svg.appendChild(g);
      const b = g.getBBox();
      const m = 6;   // demi-épaisseur de contour
      if (b.width > 0) it.view = { x: b.x - m, y: b.y - m, w: b.width + 2 * m, h: b.height + 2 * m };
      svg.removeChild(g);
    });
    svg.remove();
  }

  /**
   * SVG autonome. `v` : expression du visage ; `square` : cadre carré (icônes) ;
   * pw/ph : taille de rendu en pixels ; `finish` : finition (classic, camo, gold).
   */
  function buildSVG(level, v, square, pw, ph, finish = 'classic') {
    const it = ITEMS[level];
    let { x, y, w, h } = it.view;
    if (square) {
      const s = Math.max(w, h) + 8;
      x -= (s - w) / 2; y -= (s - h) / 2; w = h = s;
    }
    grads = new Set();
    skin = finish;
    OL = finish === 'neon' ? '#dffbff' : INK;
    const art = it.art(v);
    const defs = gradDefs();
    grads = null;
    skin = 'classic';
    OL = INK;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${pw || w}" height="${ph || h}"><defs>${defs}</defs>${art}</svg>`;
  }

  const svgURL = (level, v = 0, square = true, pw, ph, finish) =>
    'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(buildSVG(level, v, square, pw, ph, finish));

  window.Sprites = { ITEMS, measure, buildSVG, svgURL };
})();
