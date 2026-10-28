# Chibi Arsenal — Fusion Tactique

Jeu de puzzle physique vertical façon *Suika Game*, avec une DA **kawaii / chibi tactical** : on lâche des armes toutes rondes et mignonnes dans une cuve en verre. Quand deux armes identiques se touchent, elles fusionnent (pop pétillant + déformation élastique) pour donner l'arme du niveau supérieur… jusqu'au **Mini-Tank Graal**.

## Jouer

Aucune installation : ouvrez `index.html` via un petit serveur HTTP, ou publiez le dépôt avec **GitHub Pages** (Settings → Pages → branche `main`, dossier `/root`).

```bash
python3 -m http.server 8000   # puis http://localhost:8000
```

Sur iPhone, dans Safari, utilisez *Partager → Sur l'écran d'accueil* pour l'installer en PWA (plein écran, jouable hors ligne après le premier chargement).

### Contrôles
| Plateforme | Viser | Lâcher |
|---|---|---|
| Mobile | glisser le doigt | relâcher |
| Desktop | souris | clic |
| Clavier | ← → | Espace / ↓ / Entrée (P ou Échap : pause) |

## Hiérarchie de fusion

1. Munition 9mm → 2. Flashbang → 3. Glock → 4. Revolver Magnum → 5. MP5 → 6. HK416 → 7. Fusil à pompe M4 → 8. Sniper .50 BMG → 9. Minigun → 10. RPG-7 → 11. **Mini-Tank Graal**

Seules les 5 premières armes tombent du chariot. Deux Graals qui se touchent disparaissent dans une pluie de confettis (+500).

## Règles
- Points à chaque fusion (de +2 à +200), **combos** si les fusions s'enchaînent en moins d'une seconde.
- Si une arme reste au-dessus de la **ligne rouge**, un décompte de 3 s démarre : Game Over à zéro.
- Médaille de fin selon la meilleure arme obtenue : Recrue, Bronze, Argent, Or, Légende.
- Meilleur score, armes découvertes et réglages son sont sauvegardés dans le `localStorage`.

## Structure

```
index.html            page, HUD, menus (start / pause / game over)
style.css             DA pastel, glassmorphism, animations, safe-areas iOS
sprites.js            les 11 armes chibi en SVG inline (yeux ouverts / fermés)
audio.js              musique lofi générative + bruitages (Web Audio API, aucun fichier son)
game.js               moteur Matter.js, rendu canvas squishy, particules, logique de jeu
vendor/matter.min.js  copie locale de Matter.js 0.20.0 (secours si le CDN est injoignable)
sw.js, manifest.webmanifest, icons/   PWA
```

Matter.js est chargé depuis jsDelivr (version figée 0.20.0) avec repli automatique sur `vendor/`.
