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

1. Munition 9mm → 2. Flashbang → 3. Glock → 4. Revolver Magnum → 5. MP5 → 6. Fusil à pompe M4 → 7. HK416 → 8. RPG-7 → 9. Sniper .50 BMG → 10. Minigun M134 → 11. **Mini-Tank Graal**

La taille de chaque arme est calculée à partir de la **surface réelle de sa hitbox** (diamètre équivalent de 34 à 210 px, environ +17 % par palier) : chaque niveau est strictement plus gros et plus lourd que le précédent.

Seules les 5 premières armes tombent du chariot. Deux Graals qui se touchent disparaissent dans une pluie de confettis (+500).

## Règles
- Points à chaque fusion (de +2 à +200).
- **Combos en chaîne** : quand une fusion en déclenche une autre, badge « COMBO x2 / x3… », points multipliés et bonus (+50, +150, +300…). La note de fusion monte d'un demi-ton à chaque étape.
- Si une arme reste au-dessus de la **ligne rouge**, un décompte de 3 s démarre : Game Over à zéro.
- Médaille de fin selon la meilleure arme obtenue : Recrue, Bronze, Argent, Or, Légende.
- Meilleur score, armes découvertes, statistiques du codex, thème et réglages sont sauvegardés dans le `localStorage`.

## Pouvoirs tactiques
Trois boutons sous la cuve, une charge chacun au départ, puis rechargés avec le score (max 2, jauge de progression sur chaque bouton) : **Swap** tous les 1500 points, **Secousse** tous les 4000, **C4** tous les 8000.
- **Swap** : échange l'arme en main avec l'arme « Suivant ».
- **C4** : vise et fait exploser une arme (les armes qui bloquent la ligne rouge sont marquées d'un réticule).
- **Secousse** : secoue toute la cuve pour débloquer un empilement. Peut aussi se déclencher en secouant le téléphone (option « Secouer l'appareil » dans la pause, permission accéléromètre demandée sur iOS).

## Économie : Douilles d'Or & boutique
- Chaque fusion rapporte des douilles selon l'arme créée (+1 à +25, +50 pour deux Graals), plus un bonus de fin de partie (1 douille / 100 points). Le solde est sauvegardé et affiché dans le bouton boutique du HUD.
- **Boutique tactique** (bouton panier), 4 rayons :
  - *Décors* : Pastel Doux (gratuit), Établi d'Armurier (350), Vision Nocturne (750), Blueprint (750), Stand Cyberpunk (1 500), Camo Tactique désert (2 200).
  - *Finitions* : Style Chibi Classique (gratuit), Camouflage Forêt / Urbain (500), Plaqué Or 24K (2 000), Néon Glow / Tron (3 500).
  - *Traînées de chute* : Aucune, Fumée de poudre (400), Étincelles dorées (900), Laser néon (1 800).
  - *Sons* : Cartoon Plop (défaut), Réaliste & Mécanique (800), Arcade 8-Bit (1 200), avec écoute avant achat.
- États : badge vert « Équipé », bouton bleu « Choisir » (possédé), bouton doré avec le prix (grisé + « Il manque N » si le solde ne suffit pas). Tout l'équipement est sauvegardé.
- Les douilles gagnées s'envolent de la fusion vers le compteur du HUD. Une jauge latérale dans la cuve passe du vert au rouge clignotant à l'approche de la ligne rouge.

## Sensations
- Squash & stretch le long de l'axe d'impact (jusqu'à 15 %), ressort peu amorti qui oscille avant de revenir.
- Onde de choc à chaque fusion : les armes voisines sursautent et s'écartent.
- Visages expressifs : yeux > < quand une arme est coincée sous une plus lourde, yeux écarquillés après un gros choc.

## Partage
Sur l'écran de fin, « Partager mon score » envoie une image générée (score, meilleure arme, médaille) via `navigator.share` ; sinon le texte et le lien sont copiés dans le presse-papier.

## Armurerie (codex)
Touchez une arme de la barre d'évolution pour ouvrir sa fiche carte postale : anecdote chibi, date de découverte, nombre d'obtentions et record de déblocage (temps le plus court pour l'obtenir dans une partie).

## Vibrations
- Android / navigateurs compatibles : `navigator.vibrate` (15 ms au lâcher, `[15, 30, 20]` à la fusion).
- iPhone (Safari n'a pas `navigator.vibrate`) : approche hybride, au lâcher, aux impacts et aux fusions :
  1. clic du Taptic Engine via un interrupteur natif `<input switch>` invisible (iOS 18+, ressenti surtout pendant un toucher) ;
  2. impulsion sub-basse : sinus 35 Hz de 30 à 50 ms à attaque sèche via Web Audio, qui fait légèrement vibrer le châssis. Elle passe par le haut-parleur : coupée en mode silencieux, et faible car un haut-parleur de téléphone restitue mal 35 Hz.
- Désactivable dans Pause → Vibrations.

## Menu développeur
Un « Command Deck » caché (accès par geste secret + code PIN, voir `game.js`), en 4 onglets : *Économie* (douilles, score, high score, multiplicateur x1 à x10), *Sandbox* (placer ou larguer n'importe quelle arme, pluie de 15 munitions, vider la cuve), *Physique* (gravité de -1,5 à 3 avec préréglages Terrestre / Lunaire / Inversée / Zéro, rebond, frictions, God Mode), *Triche* (tout débloquer, pouvoirs illimités, C4 ou Secousse immédiats, reset usine). Fermeture par la croix ou en glissant l'en-tête vers le bas. Le code est vérifié dans le navigateur : il protège des curieux, pas d'une personne qui lit le code source.

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
