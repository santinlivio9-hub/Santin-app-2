# Chibi Arsenal — Fusion Tactique

Jeu de puzzle physique vertical façon *Suika Game*, avec une DA **kawaii / chibi tactical** : on lâche des armes dodues aux grands yeux dans une cuve en verre. Quand deux armes identiques se touchent, elles fusionnent (pop pétillant + squash & stretch) pour donner l'arme du niveau supérieur… jusqu'au **Mini-Tank Graal**.

Chaque arme est dessinée directement (liseré « sticker », pas de bulle) et possède une hitbox composée de boîtes arrondies et de cercles qui épouse sa silhouette : les armes s'empilent, se calent et basculent au lieu de rouler comme des billes.

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
| Clavier | ← → | Espace / ↓ / Entrée (P ou Échap : pause, S / C / X : pouvoirs) |

## Hiérarchie de fusion

1. Munition 9mm → 2. Flashbang → 3. Glock → 4. Revolver Magnum → 5. MP5 → 6. HK416 → 7. Fusil à pompe M4 → 8. Sniper .50 BMG → 9. Minigun → 10. RPG-7 → 11. **Mini-Tank Graal**

Seules les 5 premières armes tombent du chariot. Deux Graals qui se touchent disparaissent dans une pluie de confettis (+500).

## Règles
- Points à chaque fusion (de +2 à +200).
- **Combos en chaîne** : quand une fusion en déclenche une autre, badge « COMBO x2 / x3… », points multipliés et bonus (+50, +150, +300…). La note de fusion monte d'un demi-ton à chaque étape.
- Si une arme reste au-dessus de la **ligne rouge**, un décompte de 3 s démarre : Game Over à zéro.
- Médaille de fin selon la meilleure arme obtenue : Recrue, Bronze, Argent, Or, Légende.
- Meilleur score, armes découvertes, statistiques du codex, thème et réglages sont sauvegardés dans le `localStorage`.

## Pouvoirs tactiques
Trois boutons sous la cuve, une charge chacun par partie, **+1 charge tous les 1000 points** (max 3) :
- **Swap** : échange l'arme en main avec l'arme « Suivant ».
- **C4** : vise et fait exploser une arme (les armes qui bloquent la ligne rouge sont marquées d'un réticule).
- **Secousse** : secoue toute la cuve pour débloquer un empilement. Peut aussi se déclencher en secouant le téléphone (option « Secouer l'appareil » dans la pause, permission accéléromètre demandée sur iOS).

## Thèmes déblocables
Icône palette dans le HUD : **Pastel Doux** (défaut), **Atelier Armurerie** (débloqué par le HK416), **Blueprint** (Sniper .50 BMG), **Vision Nocturne** (Minigun).

## Armurerie (codex)
Touchez une arme de la barre d'évolution pour ouvrir sa fiche carte postale : anecdote chibi, date de découverte, nombre d'obtentions et record de déblocage (temps le plus court pour l'obtenir dans une partie).

## Vibrations
`navigator.vibrate` sur Android (15 ms au lâcher, double impulsion de 40 ms à la fusion). Safari iOS n'implémente pas cette API : le jeu utilise à la place le retour haptique natif des interrupteurs (iOS 18+), en mode « au mieux » : il dépend de la version d'iOS et peut ne pas se déclencher hors d'un geste du joueur.

## Structure

```
index.html            page, HUD, menus (start / pause / game over)
style.css             DA pastel, glassmorphism, animations, safe-areas iOS
sprites.js            les 11 armes chibi en SVG inline + leurs hitboxes physiques
audio.js              musique lofi générative + bruitages (Web Audio API, aucun fichier son)
game.js               moteur Matter.js, rendu canvas squishy, particules, logique de jeu
vendor/matter.min.js  copie locale de Matter.js 0.20.0 (secours si le CDN est injoignable)
sw.js, manifest.webmanifest, icons/   PWA
```

Matter.js est chargé depuis jsDelivr (version figée 0.20.0) avec repli automatique sur `vendor/`.
