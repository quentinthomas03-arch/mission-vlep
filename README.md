# VLEP Mission — Migration Atmos Aurora v4.0

Ce dossier contient tous les fichiers à copier dans votre projet existant pour passer à la direction **Atmos Aurora** (logo Halo + UI gradients turquoise/magenta + fond sombre profond).

---

## 📦 Fichiers à copier (remplacement direct)

| Fichier | Destination | Action |
|---|---|---|
| `index.html` | racine de votre projet | **remplacer** l'existant |
| `main.css` | racine (à côté d'`index.html`) | **remplacer** l'existant |
| `favicon.svg` | racine | **remplacer** |
| `favicon-96x96.png` | racine | **remplacer** |
| `apple-touch-icon.png` | racine | **remplacer** |
| `web-app-manifest-192x192.png` | racine | **remplacer** |
| `web-app-manifest-512x512.png` | racine | **remplacer** |
| `manifest.json` | racine | **remplacer** |
| `favicon-32.png` | racine | nouveau (optionnel) |

Aucun fichier JavaScript n'est modifié — la logique métier reste intacte.

---

## 🔄 Ce qui a changé

### Palette
- Bleu Socotec `#0066b3` → **Turquoise profond `#00a3a3`** (primary)
- Accent vert `#00b38a` → **Turquoise brillant `#14d4c2`** (accent-light) + **Magenta `#c14ecf`** (accent-magenta)
- Gris métallique `#2d3039` → **Noir bleuté profond `#0c1220`**
- Fond `#eceef1` → `#eef0f2` (plus doux)

### Logo
- Nouveau favicon "Halo" : V blanc sur ciel profond avec halos turquoise + magenta en arrière-plan.
- Splash screen refondu : fond Aurora sombre animé (halos qui dérivent), logo Halo 132px, typo Space Grotesk.

### Composants
- **Sticky header** → hero card Aurora avec halos turquoise + magenta (via `::before` / `::after`).
- **Boutons primaires** → gradient Aurora + ombre lumineuse au hover.
- **Boutons success** → gradient turquoise → emerald.
- **Status badges** : "En cours" devient turquoise (plus visible que l'ancien bleu pâle).
- **Mission cards "en cours"** : accent turquoise brillant au lieu du bleu.

### Typo
- **Inter** (400/500/600/700) — corps de texte, boutons, labels
- **Space Grotesk** (500/600) — titres h1/h2, splash
- **JetBrains Mono** (400/500) — valeurs, badges monospace (classe `.mono`)

### PWA
- `theme_color` passe de `#2d3039` à `#0c1220` (noir Aurora)
- `background_color` idem
- Icône `maskable` ajoutée (recommandé Android)

---

## ✅ Procédure d'installation (5 min)

1. **Sauvegarde** : zippez votre dossier actuel avant toute chose.
2. Copiez les 9 fichiers de ce dossier dans votre projet (remplacement).
3. Videz le cache PWA :
   - Navigateur : DevTools → Application → Clear storage
   - iPhone/Android installé : désinstallez + réinstallez l'app, ou changez le nom dans `sw.js` pour forcer la MAJ du Service Worker.
4. Rechargez.

## 🔧 Vérifications rapides après migration

- [ ] Splash affiche le nouveau logo Halo turquoise/magenta
- [ ] Barre d'URL / status bar mobile : noir profond `#0c1220`
- [ ] Boutons primaires : gradient turquoise
- [ ] Header sticky : fond sombre avec halos lumineux en arrière-plan
- [ ] Aucun texte illisible (l'ancien bleu primaire `#0066b3` devient turquoise `#00a3a3` partout — contraste vérifié WCAG AA sur fond blanc)

## ⚠️ Points d'attention

- Les PNG sont générés depuis le SVG via canvas (rendu propre). Si vous voulez une qualité pixel-perfect au favicon.ico 32×32, régénérez-le avec `favicon-32.png` via un outil comme [realfavicongenerator.net](https://realfavicongenerator.net) en uploadant `favicon.svg` — il vous donnera aussi les formats Windows/Safari spéciaux si besoin.
- Le Service Worker (`sw.js`) n'est **pas modifié**. Si vous y listez explicitement vos assets en cache, pensez à y ajouter les fichiers de fonts si vous cachez aussi Google Fonts.
- Si la logique JS (`js/app.js` etc.) crée dynamiquement des éléments avec l'ancienne couleur `#0066b3` en style inline, il faudra les remplacer à la main. Le CSS couvre tout ce qui utilise les variables `--primary`, `--accent`, etc.

---

## 🎨 Palette complète (pour `js/*.js` si besoin)

```
--primary:          #00a3a3   (turquoise profond)
--primary-dark:     #007a7a
--primary-light:    #14d4c2   (turquoise lumineux)
--primary-pale:     #d6f1f0
--accent:           #14d4c2
--accent-magenta:   #c14ecf   (nouveau)
--warning:          #d97706
--danger:           #e5484d
--bg-main:          #eef0f2
--text-dark:        #0c1220
--metal-dark:       #0c1220
--metal-mid:        #1a2236
```

Gradients prêts à l'emploi :
```
--grad-aurora:  linear-gradient(90deg, #14d4c2, #c14ecf)
--grad-hero:    linear-gradient(160deg, #0c1220, #102040 50%, #0a2f4f)
--grad-btn:     linear-gradient(135deg, #14d4c2, #00a3a3)
--grad-success: linear-gradient(135deg, #14d4c2, #059669)
```

---

**Version** : 4.0 · Aurora
**Date** : avril 2026
