/* =========================================================================
   Chibi Arsenal — sprites vectoriels (SVG inline)
   Chaque arme est un petit personnage "chibi" posé sur une bulle de gelée.
   viewBox centré : -100..100. La bulle (r = 96) correspond au corps physique.
   ========================================================================= */
(function () {
  'use strict';

  const OL = '#3d2c4e';            // contour sombre (prune)
  const SW = 5;                    // épaisseur de contour

  // ---------------------------------------------------------------- helpers
  const st = (fill, w = SW) =>
    `fill="${fill}" stroke="${OL}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const line = (w = SW, color = OL) =>
    `fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;

  /** Visage kawaii : yeux brillants, joues roses, bouche. */
  function face(x, y, s, closed, mouth = 'smile') {
    const ex = 12 * s;
    let eyes;
    if (closed) {
      eyes = [-1, 1].map(k =>
        `<path d="M${x + k * ex - 6.5 * s} ${y} q${6.5 * s} ${5 * s} ${13 * s} 0" ${line(3.6 * s)}/>`
      ).join('');
    } else {
      eyes = [-1, 1].map(k => {
        const cx = x + k * ex;
        return `<ellipse cx="${cx}" cy="${y}" rx="${6.6 * s}" ry="${8.2 * s}" fill="${OL}"/>` +
          `<circle cx="${cx - 2.2 * s}" cy="${y - 3.2 * s}" r="${2.7 * s}" fill="#fff"/>` +
          `<circle cx="${cx + 2.4 * s}" cy="${y + 3 * s}" r="${1.2 * s}" fill="#fff"/>`;
      }).join('');
    }
    const blush = [-1, 1].map(k =>
      `<ellipse cx="${x + k * 23 * s}" cy="${y + 8 * s}" rx="${6.2 * s}" ry="${3.6 * s}" fill="#ff8fab" opacity=".65"/>`
    ).join('');
    const my = y + 9 * s;
    let m;
    switch (mouth) {
      case 'open':
        m = `<path d="M${x - 5 * s} ${my} q${5 * s} ${9 * s} ${10 * s} 0 z" fill="#c2405b" stroke="${OL}" stroke-width="${2.8 * s}" stroke-linejoin="round"/>`;
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

  /** Petit reflet brillant sur une forme. */
  const shine = (x, y, w, h, rot = -20, op = 0.55) =>
    `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${h}" fill="#fff" opacity="${op}" transform="rotate(${rot} ${x} ${y})"/>`;

  /** Étincelle à 4 branches. */
  const sparkle = (x, y, r, fill = '#fff') =>
    `<path d="M${x} ${y - r} Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}Z" fill="${fill}"/>`;

  // --------------------------------------------------------------- weapons
  // Chaque fonction reçoit `closed` (yeux fermés pour le clignement).
  const ART = [
    // 1. Munition 9mm
    c => `
      <g transform="translate(0 4)">
        <path d="M-30 -2 C-30 -40 -14 -60 0 -62 C14 -60 30 -40 30 -2 Z" ${st('#ec8b5e')}/>
        ${shine(-12, -34, 6, 14, 20, 0.6)}
        <rect x="-32" y="-6" width="64" height="58" rx="14" ${st('#f7c84e')}/>
        <rect x="-36" y="44" width="72" height="14" rx="6" ${st('#e2a73a')}/>
        <rect x="-24" y="2" width="8" height="38" rx="4" fill="#fff" opacity=".45"/>
        ${face(2, 18, 0.95, c, 'smile')}
      </g>`,

    // 2. Flashbang / fumigène
    c => `
      <g transform="translate(-2 6)">
        <path d="M14 -48 q30 0 28 30 l-6 44" ${line(14)}/>
        <path d="M14 -48 q30 0 28 30 l-6 44" ${line(7, '#d5dae3')}/>
        <circle cx="-30" cy="-52" r="12" fill="none" stroke="${OL}" stroke-width="10"/>
        <circle cx="-30" cy="-52" r="12" fill="none" stroke="#ffcf4a" stroke-width="5"/>
        <rect x="-26" y="-50" width="52" height="18" rx="7" ${st('#5d8174')}/>
        <rect x="-34" y="-36" width="68" height="88" rx="22" ${st('#92c2ae')}/>
        <rect x="-34" y="-6" width="68" height="10" ${st('#6e9a88', 4)}/>
        <circle cx="-22" cy="34" r="3.2" fill="${OL}" opacity=".35"/>
        <circle cx="-10" cy="40" r="3.2" fill="${OL}" opacity=".35"/>
        <circle cx="10" cy="40" r="3.2" fill="${OL}" opacity=".35"/>
        <circle cx="22" cy="34" r="3.2" fill="${OL}" opacity=".35"/>
        ${shine(-20, -20, 6, 10, 0, 0.55)}
        ${face(0, 18, 0.95, c, 'open')}
      </g>`,

    // 3. Pistolet Glock / Canik
    c => `
      <g transform="translate(2 6)">
        <path d="M-50 -6 L-14 -6 L-6 46 Q-6 60 -20 60 L-40 60 Q-54 60 -54 46 Z" ${st('#545878')}/>
        <path d="M-44 14 l18 0 M-43 26 l20 0 M-42 38 l21 0" ${line(3, '#3f425c')}/>
        <path d="M-12 2 Q-12 28 12 26 L20 4" ${line(14)}/>
        <path d="M-12 2 Q-12 28 12 26 L20 4" ${line(6, '#545878')}/>
        <path d="M-2 4 q2 10 6 12" ${line(5)}/>
        <rect x="-54" y="-12" width="98" height="20" rx="8" ${st('#545878')}/>
        <rect x="-58" y="-48" width="118" height="42" rx="18" ${st('#7b80a6')}/>
        <path d="M-48 -38 l0 22 M-40 -38 l0 22" ${line(3.5, '#5d6186')}/>
        <rect x="44" y="-40" width="10" height="8" rx="3" fill="${OL}"/>
        ${shine(-14, -40, 22, 4, 0, 0.5)}
        ${face(8, -28, 1, c, 'cat')}
      </g>`,

    // 4. Revolver Magnum
    c => `
      <g transform="translate(-4 4)">
        <path d="M-40 -2 Q-56 30 -50 56 Q-46 66 -32 64 L-18 62 Q-6 60 -10 46 Q-16 22 -4 0 Z" ${st('#cf8d5c')}/>
        <path d="M-36 14 q-6 18 -4 36" ${line(3.5, '#a86a40')}/>
        <path d="M-14 0 Q-12 26 10 24 L18 2" ${line(14)}/>
        <path d="M-14 0 Q-12 26 10 24 L18 2" ${line(6, '#9ea2b5')}/>
        <path d="M-36 -38 q-14 -16 -24 -6 q8 4 10 14" ${st('#7d8196')}/>
        <rect x="18" y="-38" width="66" height="22" rx="10" ${st('#c3c6d6')}/>
        <rect x="18" y="-20" width="60" height="16" rx="8" ${st('#a6aabd')}/>
        <path d="M74 -38 l4 -10 l6 10" ${st('#7d8196', 4)}/>
        <rect x="-44" y="-44" width="66" height="50" rx="16" ${st('#9ea2b5')}/>
        <circle cx="-6" cy="-14" r="34" ${st('#d4d7e4')}/>
        ${[0, 60, 120, 180, 240, 300].map(a => {
          const r = 26, x = -6 + r * Math.cos(a * Math.PI / 180), y = -14 + r * Math.sin(a * Math.PI / 180);
          return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="#9ea2b5"/>`;
        }).join('')}
        ${shine(-20, -32, 10, 5, -30, 0.7)}
        ${face(-6, -15, 0.85, c, 'open')}
      </g>`,

    // 5. Pistolet-mitrailleur MP5
    c => `
      <g transform="translate(-2 4) rotate(-6)">
        <path d="M4 -4 Q8 28 24 52 L42 42 Q28 22 24 -4 Z" ${st('#414c5d')}/>
        <path d="M-28 -6 L-8 -6 L-4 34 Q-6 44 -16 44 L-26 44 Q-34 42 -32 32 Z" ${st('#414c5d')}/>
        <rect x="-68" y="-36" width="14" height="44" rx="7" ${st('#414c5d')}/>
        <rect x="-60" y="-28" width="24" height="10" rx="5" ${st('#6d7a8c', 4)}/>
        <rect x="34" y="-28" width="40" height="24" rx="10" ${st('#414c5d')}/>
        <rect x="70" y="-22" width="12" height="12" rx="4" ${st('#2f3745', 4)}/>
        <rect x="6" y="-44" width="56" height="10" rx="5" ${st('#56637a', 4)}/>
        <rect x="-44" y="-36" width="86" height="38" rx="16" ${st('#6d7c93')}/>
        <circle cx="-34" cy="-40" r="7" ${st('#56637a', 4)}/>
        ${shine(-10, -30, 20, 4, 0, 0.5)}
        ${face(-2, -18, 0.82, c, 'smile')}
      </g>`,

    // 6. Fusil d'assaut HK416 / M4
    c => `
      <g transform="rotate(-12) scale(.95) translate(0 4)">
        <path d="M-6 0 Q-4 30 12 54 L32 44 Q18 22 18 0 Z" ${st('#6f5c48')}/>
        <path d="M-1 14 l16 -2 M3 26 l16 -3 M9 38 l15 -4" ${line(3, '#57473a')}/>
        <path d="M-30 -2 L-12 -2 L-8 34 Q-10 42 -20 42 L-28 42 Q-36 40 -34 32 Z" ${st('#8c7154')}/>
        <path d="M-38 -26 L-62 -28 Q-76 -28 -78 -14 L-78 6 Q-76 16 -64 14 L-38 2 Z" ${st('#8c7154')}/>
        <rect x="30" y="-28" width="40" height="24" rx="9" ${st('#a8865f')}/>
        <path d="M40 -16 l20 0" ${line(4, '#7d6246')}/>
        <rect x="68" y="-22" width="12" height="12" rx="3" ${st('#4a4e5e', 4)}/>
        <rect x="78" y="-24" width="10" height="16" rx="4" ${st('#4a4e5e', 4)}/>
        <rect x="-40" y="-32" width="74" height="34" rx="13" ${st('#c8a67c')}/>
        <rect x="-18" y="-52" width="34" height="20" rx="9" ${st('#4a4e5e')}/>
        <circle cx="14" cy="-42" r="5" fill="#ff86a8"/>
        <circle cx="13" cy="-44" r="1.8" fill="#fff"/>
        ${shine(-18, -26, 16, 3.5, 0, 0.55)}
        ${face(-6, -14, 0.8, c, 'tongue')}
      </g>`,

    // 7. Fusil à pompe M4 tactique
    c => `
      <g transform="rotate(-10) scale(.95) translate(0 2)">
        <path d="M-38 -30 L-66 -22 Q-80 -18 -80 -6 L-80 14 Q-78 24 -66 22 L-38 6 Z" ${st('#4b4f63')}/>
        ${[-70, -61, -52].map(x =>
          `<rect x="${x}" y="-14" width="8" height="22" rx="3" ${st('#ff6b7d', 3)}/>` +
          `<rect x="${x}" y="4" width="8" height="6" rx="2" fill="#f7c84e" stroke="${OL}" stroke-width="2.5"/>`
        ).join('')}
        <path d="M-28 0 L-10 0 L-6 34 Q-8 42 -18 42 L-26 42 Q-34 40 -32 32 Z" ${st('#4b4f63')}/>
        <rect x="14" y="-14" width="62" height="16" rx="8" ${st('#444859')}/>
        <rect x="28" y="-16" width="26" height="20" rx="6" ${st('#6a6f86', 4)}/>
        <path d="M34 -12 l0 12 M41 -12 l0 12 M48 -12 l0 12" ${line(2.5, '#4b4f63')}/>
        <rect x="8" y="-36" width="80" height="22" rx="11" ${st('#5c6178')}/>
        <circle cx="86" cy="-25" r="5" fill="${OL}"/>
        <rect x="-40" y="-38" width="58" height="40" rx="14" ${st('#62677f')}/>
        <path d="M-32 -38 l6 -10 l8 10" ${st('#4b4f63', 4)}/>
        ${shine(-20, -32, 12, 3.5, 0, 0.5)}
        ${face(-10, -18, 0.82, c, 'grin')}
      </g>`,

    // 8. Fusil de sniper lourd .50 BMG
    c => `
      <g transform="rotate(-16) scale(.9) translate(0 8)">
        <path d="M38 -4 L26 40 M42 -4 L56 40" ${line(6)}/>
        <rect x="-78" y="-22" width="42" height="32" rx="12" ${st('#6d7f58')}/>
        <rect x="-82" y="-24" width="10" height="36" rx="5" ${st('#3e4456')}/>
        <path d="M-28 4 L-10 4 L-6 34 Q-8 42 -18 42 L-26 42 Q-34 40 -32 32 Z" ${st('#5a6a48')}/>
        <rect x="-10" y="4" width="22" height="22" rx="5" ${st('#4f5c40')}/>
        <rect x="18" y="-16" width="48" height="12" rx="5" ${st('#4a5546')}/>
        <rect x="62" y="-26" width="30" height="32" rx="10" ${st('#5d6b57')}/>
        <rect x="68" y="-18" width="6" height="16" rx="3" fill="${OL}"/>
        <rect x="80" y="-18" width="6" height="16" rx="3" fill="${OL}"/>
        <rect x="-42" y="-26" width="66" height="34" rx="12" ${st('#8fa476')}/>
        <rect x="-26" y="-36" width="8" height="12" rx="2" ${st('#3e4456', 3.5)}/>
        <rect x="8" y="-36" width="8" height="12" rx="2" ${st('#3e4456', 3.5)}/>
        <rect x="-40" y="-62" width="76" height="28" rx="14" ${st('#3e4456')}/>
        <ellipse cx="40" cy="-48" rx="12" ry="18" ${st('#4b5268')}/>
        <ellipse cx="41" cy="-48" rx="6" ry="11" fill="#9fd7ff"/>
        <ellipse cx="39" cy="-53" rx="2.5" ry="4" fill="#fff"/>
        <ellipse cx="-40" cy="-48" rx="8" ry="13" ${st('#4b5268')}/>
        ${shine(-14, -56, 18, 3.5, 0, 0.45)}
        ${face(-10, -10, 0.72, c, 'smile')}
      </g>`,

    // 9. Mitrailleuse lourde Minigun
    c => `
      <g transform="rotate(-8) scale(.93) translate(4 0)">
        <path d="M-30 22 Q-40 52 -70 56" ${line(18)}/>
        <path d="M-30 22 Q-40 52 -70 56" ${line(10, '#8b6b4a')}/>
        ${[[-32, 30], [-38, 42], [-48, 51], [-60, 55]].map(([x, y]) =>
          `<ellipse cx="${x}" cy="${y}" rx="4" ry="6.5" fill="#f7c84e" stroke="${OL}" stroke-width="2.5"/>`
        ).join('')}
        <rect x="-76" y="-22" width="16" height="36" rx="7" ${st('#454a5c')}/>
        <rect x="-4" y="-34" width="72" height="13" rx="6" ${st('#9196a8')}/>
        <rect x="-4" y="-17" width="76" height="13" rx="6" ${st('#a4a9ba')}/>
        <rect x="-4" y="0" width="72" height="13" rx="6" ${st('#9196a8')}/>
        <rect x="18" y="-40" width="10" height="58" rx="5" ${st('#555a6c', 4)}/>
        <rect x="56" y="-40" width="10" height="58" rx="5" ${st('#555a6c', 4)}/>
        <path d="M78 -32 q8 -4 10 6 M80 8 q8 4 10 -6" ${line(3.5, '#ffffff')}/>
        <path d="M-52 -34 Q-36 -64 -14 -34" ${line(14)}/>
        <path d="M-52 -34 Q-36 -64 -14 -34" ${line(7, '#555a6c')}/>
        <rect x="-64" y="-38" width="66" height="62" rx="22" ${st('#747a90')}/>
        ${shine(-46, -26, 12, 5, -25, 0.55)}
        ${face(-30, -6, 1, c, 'open')}
      </g>`,

    // 10. Lance-roquettes RPG-7
    c => `
      <g transform="rotate(-14) scale(.9) translate(-2 2)">
        <path d="M-56 4 L-42 4 L-40 34 Q-42 42 -50 42 L-56 42 Q-64 40 -62 32 Z" ${st('#5a6b4a')}/>
        <path d="M-24 4 L-10 4 L-8 30 Q-10 38 -18 38 L-24 38 Q-32 36 -30 28 Z" ${st('#5a6b4a')}/>
        <path d="M-90 -18 L-74 -10 L-74 10 L-90 18 Z" ${st('#5a6b4a')}/>
        <rect x="-78" y="-11" width="104" height="22" rx="10" ${st('#71845f')}/>
        <rect x="-48" y="-15" width="38" height="30" rx="8" ${st('#cf8d5c')}/>
        <path d="M-42 -8 l26 0 M-42 0 l26 0 M-42 8 l26 0" ${line(2.5, '#a86a40')}/>
        <rect x="-36" y="-26" width="10" height="12" rx="3" ${st('#3e4456', 3.5)}/>
        <rect x="18" y="-10" width="16" height="20" rx="4" ${st('#5a6b4a')}/>
        <path d="M30 -8 C36 -12 40 -34 62 -34 C86 -34 98 -16 100 0 C98 16 86 34 62 34 C40 34 36 12 30 8 Z" ${st('#94b67e')}/>
        <path d="M98 -6 L106 0 L98 6 Z" ${st('#5a6b4a', 4)}/>
        ${shine(54, -22, 14, 6, -15, 0.55)}
        ${face(62, 0, 1, c, 'cat')}
      </g>`,

    // 11. Le Graal : mini-tank ultra rondouillard
    c => `
      <g transform="scale(.86) translate(0 8)">
        <rect x="26" y="-48" width="58" height="14" rx="7" ${st('#7aa25f')}/>
        <rect x="80" y="-53" width="14" height="24" rx="5" ${st('#5f8548')}/>
        <path d="M-44 -14 Q-44 -70 0 -70 Q44 -70 44 -14 Z" ${st('#a6cc8a')}/>
        <ellipse cx="-6" cy="-70" rx="16" ry="6" ${st('#7aa25f', 4)}/>
        <path d="M-18 -76 L-14 -94 L-6 -82 L0 -98 L6 -82 L14 -94 L18 -76 Z" ${st('#ffd34e', 4)}/>
        <circle cx="0" cy="-98" r="3.5" fill="#ff86a8" stroke="${OL}" stroke-width="2"/>
        <path d="M-78 -2 Q-78 -18 -60 -18 L60 -18 Q80 -18 80 -2 L72 14 L-70 14 Z" ${st('#8fba72')}/>
        <rect x="-82" y="8" width="164" height="44" rx="22" ${st('#4f5468')}/>
        ${[-56, -28, 0, 28, 56].map(x =>
          `<circle cx="${x}" cy="30" r="11" ${st('#a9aec0', 4)}/><circle cx="${x}" cy="30" r="3.5" fill="${OL}"/>`
        ).join('')}
        <path d="M58 -14 l3 7 l7 1 l-5 5 l1 7 l-6 -3 l-6 3 l1 -7 l-5 -5 l7 -1 z" fill="#ff9fbd" stroke="${OL}" stroke-width="2.5" stroke-linejoin="round"/>
        ${shine(-24, -52, 12, 6, -30, 0.6)}
        ${face(-2, -36, 1.25, c, 'grin')}
      </g>`
  ];

  // ----------------------------------------------------------------- items
  const ITEMS = [
    { name: 'Munition 9mm',      short: '9mm',     radius: 16,  bubble: ['#fff8d6', '#ffe28a'] },
    { name: 'Flashbang',         short: 'Flash',   radius: 21,  bubble: ['#e6fff1', '#a8ecc8'] },
    { name: 'Glock',             short: 'Glock',   radius: 27,  bubble: ['#ffeaf1', '#ffb8cf'] },
    { name: 'Revolver Magnum',   short: 'Magnum',  radius: 35,  bubble: ['#f2ecff', '#cdbcff'] },
    { name: 'MP5',               short: 'MP5',     radius: 43,  bubble: ['#e8f6ff', '#a9d8ff'] },
    { name: 'HK416',             short: 'HK416',   radius: 52,  bubble: ['#fff0e2', '#ffc99a'] },
    { name: 'Fusil à pompe M4',  short: 'Pompe',   radius: 61,  bubble: ['#ffece9', '#ffaea4'] },
    { name: 'Sniper .50 BMG',    short: '.50 BMG', radius: 72,  bubble: ['#eef1ff', '#b6c2ff'] },
    { name: 'Minigun',           short: 'Minigun', radius: 86,  bubble: ['#fff3df', '#ffcf86'] },
    { name: 'RPG-7',             short: 'RPG-7',   radius: 103, bubble: ['#f9ffe6', '#d6f09a'] },
    { name: 'Mini-Tank Graal',   short: 'Graal',   radius: 124, bubble: ['#fffbe6', '#ffd7f0'] }
  ];

  function buildSVG(level, closed) {
    const it = ITEMS[level];
    const [c1, c2] = it.bubble;
    const rim = level === 10 ? '#f5a8d2' : shade(c2, -0.12);
    const extra = level === 10
      ? `<circle r="96" fill="url(#rb)" opacity=".55"/>` +
        sparkle(-62, 40, 9) + sparkle(64, 52, 7, '#fff6b0') + sparkle(-70, -20, 6, '#fff6b0') + sparkle(70, -64, 8)
      : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-100 -100 200 200" width="200" height="200">
      <defs>
        <radialGradient id="g" cx="35%" cy="30%" r="75%">
          <stop offset="0" stop-color="${c1}"/>
          <stop offset="1" stop-color="${c2}"/>
        </radialGradient>
        <linearGradient id="rb" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ffe27a"/><stop offset=".35" stop-color="#ffb3d9"/>
          <stop offset=".7" stop-color="#b9c8ff"/><stop offset="1" stop-color="#a8f0d0"/>
        </linearGradient>
      </defs>
      <circle r="95" fill="url(#g)" stroke="${rim}" stroke-width="5"/>
      ${extra}
      <ellipse cx="0" cy="62" rx="58" ry="18" fill="${shade(c2, -0.1)}" opacity=".35"/>
      ${ART[level](closed)}
      <ellipse cx="-42" cy="-58" rx="26" ry="12" fill="#fff" opacity=".55" transform="rotate(-35 -42 -58)"/>
      <circle cx="-66" cy="-30" r="5" fill="#fff" opacity=".6"/>
    </svg>`;
  }

  /** Assombrit / éclaircit une couleur hex. */
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = c => Math.max(0, Math.min(255, Math.round(c + (amt < 0 ? c * amt : (255 - c) * amt))));
    const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  const svgURL = (level, closed = false) =>
    'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(buildSVG(level, closed));

  window.Sprites = { ITEMS, buildSVG, svgURL };
})();
