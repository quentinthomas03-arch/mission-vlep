// rapport-resultats.js - Tableaux de résultats du rapport Word, relus dans la feuille de calcul enregistrée
// © 2025 Quentin THOMAS
//
// Étape 3 du rapport pré-rempli. La feuille de calcul complétée (résultats du laboratoire saisis, enregistrée par
// Excel) contient les valeurs qu'Excel a calculées : elles sont reprises telles qu'Excel les affiche (format de
// nombre, fusions, couleurs, gras, bordures), sans aucun recalcul. Même découpage que la macro « Extraire
// résultats » de la feuille :
//   - bloc RESULTATS (ligne « RESULTATS » → ligne avant « Validation des prélèvements »), par lot de 2 GEH
//     (onglets Reg) ou de 6 prélèvements (onglets non Reg) → « Résultats des mesures » du rapport ;
//   - détail de l'onglet (ligne 1 → 2 lignes avant « Calcul d'incertitudes »), lignes vides des supports, plages
//     et agents non utilisés masquées, en morceaux de 50 lignes au plus → annexe des résultats détaillés.
// Chaque plage est dessinée en image (canvas du navigateur), comme les images de la macro : non modifiable par
// nature, document léger. Hors navigateur (essais automatiques), des tableaux Word sont produits à la place.

var RR_ONGLETS = ['Cyclone silice Reg (séq)', 'CIP10 silice Reg (séq)', 'Cassette Reg', 'Cassette Reg (séq)', 'Cassette Reg (multi)', 'Tube Reg', 'Tube Reg (séq)', 'Tube Reg (multi)', 'Cassette+tube Reg', 'Fibres Reg', 'Fibres Reg (séq)', 'CIP10 silice Reg', 'CIP10 silice Reg (séq)', 'CIP10 sf silice Reg', 'CIP10 sf silice Reg (séq)', 'Cassette', 'Cassette (séq)', 'Tube', 'Tube (séq)', 'Cassette+tube', 'Fibres', 'Fibres (séq)', 'CIP10 silice', 'CIP10 silice (séq)', 'CIP10 sf silice', 'CIP10 sf silice (séq)', 'Analyseurs'];
var RR_SECTIONS = ['Matériel de mesure', 'Plages horaires de prélèvement, durée du prélèvement et durée d\'exposition', 'Calcul de la dérive de l\'analyseur', 'Prise en compte des Equipements de Protection Individuelle', 'Conditions ambiantes lors des prélèvements', 'Volume prélevé', 'Résultats du laboratoire d\'analyse', 'Résultats des mesures', 'Plages horaires de prélèvement, durée du prélèvement et durée d\'exposition\'', 'RESULTATS', 'Validation des prélèvements', 'Calcul d\'incertitudes'];
var RR_LARGEUR_PAGE = 9600; // largeur utile d'une page portrait de la trame (twips)

// Palette Excel par défaut (couleurs indexées 0 à 63)
var RR_PALETTE = ['000000', 'FFFFFF', 'FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', '00FFFF', '000000', 'FFFFFF', 'FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', '00FFFF',
  '800000', '008000', '000080', '808000', '800080', '008080', 'C0C0C0', '808080', '9999FF', '993366', 'FFFFCC', 'CCFFFF', '660066', 'FF8080', '0066CC', 'CCCCFF',
  '000080', 'FF00FF', 'FFFF00', '00FFFF', '800080', '800000', '008080', '0000FF', '00CCFF', 'CCFFFF', 'CCFFCC', 'FFFF99', '99CCFF', 'FF99CC', 'CC99FF', 'FFCC99',
  '3366FF', '33CCCC', '99CC00', 'FFCC00', 'FF9900', 'FF6600', '666699', '969696', '003366', '339966', '003300', '333300', '993300', '993366', '333399', '333333'];

// ---------- Styles de la feuille ----------
function rrAttr(s, nom) { var m = new RegExp('\\b' + nom + '="([^"]*)"').exec(s || ''); return m ? m[1] : null; }
function rrStyles(zip) {
  var lire = function (p) { return zip.file(p) ? zip.file(p).async('string') : Promise.resolve(''); };
  return Promise.all([lire('xl/styles.xml'), lire('xl/theme/theme1.xml')]).then(function (x) {
    var st = x[0], th = x[1], S = { numFmts: {}, fonts: [], fills: [], borders: [], xfs: [], palette: RR_PALETTE.slice(), theme: [] };
    (st.match(/<numFmt\b[^>]*\/>/g) || []).forEach(function (n) { S.numFmts[rrAttr(n, 'numFmtId')] = rrAttr(n, 'formatCode').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'); });
    var ic = /<indexedColors>([\s\S]*?)<\/indexedColors>/.exec(st);
    if (ic) (ic[1].match(/<rgbColor\b[^>]*\/>/g) || []).forEach(function (c, i) { S.palette[i] = (rrAttr(c, 'rgb') || '').slice(-6); });
    // élément vide (<xf …/>) ou avec enfants (<border>…</border>, dont les enfants vides <left/> ne ferment pas l'élément)
    var bloc = function (nom, el) { var b = new RegExp('<' + nom + '\\b[^>]*>([\\s\\S]*?)</' + nom + '>').exec(st); return b ? (b[1].match(new RegExp('<' + el + '\\b[^>]*?(?:/>|>[\\s\\S]*?</' + el + '>)', 'g')) || []) : []; };
    S.fonts = bloc('fonts', 'font');
    S.fills = bloc('fills', 'fill');
    S.borders = bloc('borders', 'border');
    S.xfs = bloc('cellXfs', 'xf');
    var cs = /<a:clrScheme[\s\S]*?<\/a:clrScheme>/.exec(th);
    if (cs) ['lt1', 'dk1', 'lt2', 'dk2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'].forEach(function (n, i) {
      var m = new RegExp('<a:' + (n === 'lt1' ? 'lt1' : n === 'dk1' ? 'dk1' : n) + '>([\\s\\S]*?)</a:').exec(cs[0]);
      S.theme[i] = m ? (rrAttr(m[1], 'lastClr') || rrAttr(m[1], 'val') || '000000') : '000000';
    });
    return S;
  });
}
function rrTeinte(hex, tint) {
  if (!tint) return hex;
  var r = parseInt(hex.slice(0, 2), 16) / 255, g = parseInt(hex.slice(2, 4), 16) / 255, b = parseInt(hex.slice(4, 6), 16) / 255;
  var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s = 0, d = mx - mn;
  if (d) { s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
  l = tint < 0 ? l * (1 + tint) : l * (1 - tint) + tint;
  var f = function (p, q, t) { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  var conv = function (v) { var x = Math.round(v * 255).toString(16).toUpperCase(); return x.length < 2 ? '0' + x : x; };
  return s ? conv(f(p, q, h + 1 / 3)) + conv(f(p, q, h)) + conv(f(p, q, h - 1 / 3)) : conv(l) + conv(l) + conv(l);
}
function rrCouleur(el, S) {
  if (!el) return null;
  var rgb = rrAttr(el, 'rgb'), th = rrAttr(el, 'theme'), ix = rrAttr(el, 'indexed'), tint = parseFloat(rrAttr(el, 'tint') || '0');
  var hex = rgb ? rgb.slice(-6) : (th !== null ? S.theme[+th] : (ix !== null ? (+ix === 64 ? null : S.palette[+ix]) : null));
  return hex ? rrTeinte(hex.toUpperCase(), tint) : null;
}
// Style d'une cellule (index s de la cellule), calculé une fois par index : les cellules partagent peu de styles
function rrStyleCellule(S, s) {
  var cache = S._cache || (S._cache = {}), cle = +s || 0;
  return cache[cle] || (cache[cle] = rrCalculerStyle(S, s));
}
function rrCalculerStyle(S, s) {
  var xf = S.xfs[+s || 0] || '', font = S.fonts[+(rrAttr(xf, 'fontId') || 0)] || '', fill = S.fills[+(rrAttr(xf, 'fillId') || 0)] || '', border = S.borders[+(rrAttr(xf, 'borderId') || 0)] || '';
  var al = /<alignment\b[^>]*\/?>/.exec(xf), fmtId = rrAttr(xf, 'numFmtId') || '0';
  var pat = /<patternFill\b[^>]*patternType="solid"[\s\S]*?(?:<\/patternFill>|\/>)/.exec(fill);
  var bord = {};
  ['left', 'right', 'top', 'bottom'].forEach(function (c) {
    var m = new RegExp('<' + c + '\\b([^>]*?)(?:/>|>([\\s\\S]*?)</' + c + '>)').exec(border);
    if (m && rrAttr(m[1], 'style')) bord[c] = { style: rrAttr(m[1], 'style'), color: rrCouleur((/<color\b[^>]*\/>/.exec(m[2] || '') || [''])[0], S) || '000000' };
  });
  return {
    fmt: S.numFmts[fmtId] || RR_FORMATS_INTEGRES[fmtId] || 'General',
    gras: /<b\/>|<b val="(1|true)"\/>/.test(font), italique: /<i\/>/.test(font), souligne: /<u\b/.test(font),
    taille: parseFloat(rrAttr((/<sz\b[^>]*\/>/.exec(font) || [''])[0], 'val') || '10'),
    police: rrAttr((/<name\b[^>]*\/>/.exec(font) || [''])[0], 'val') || 'Arial',
    couleur: rrCouleur((/<color\b[^>]*\/>/.exec(font) || [''])[0], S),
    fond: pat ? rrCouleur((/<fgColor\b[^>]*\/>/.exec(pat[0]) || [''])[0], S) : null,
    h: al ? rrAttr(al[0], 'horizontal') : null, v: al ? rrAttr(al[0], 'vertical') : null,
    renvoi: al ? rrAttr(al[0], 'wrapText') === '1' : false,
    bord: bord
  };
}

// ---------- Formats de nombre (affichage français, comme Excel) ----------
var RR_FORMATS_INTEGRES = { '0': 'General', '1': '0', '2': '0.00', '3': '#,##0', '4': '#,##0.00', '9': '0%', '10': '0.00%', '11': '0.00E+00', '12': '# ?/?', '14': 'dd/mm/yyyy', '15': 'd-mmm-yy', '16': 'd-mmm', '17': 'mmm-yy', '18': 'h:mm AM/PM', '19': 'h:mm:ss AM/PM', '20': 'hh:mm', '21': 'hh:mm:ss', '22': 'dd/mm/yyyy hh:mm', '37': '#,##0 ;(#,##0)', '38': '#,##0 ;[Red](#,##0)', '39': '#,##0.00;(#,##0.00)', '40': '#,##0.00;[Red](#,##0.00)', '45': 'mm:ss', '46': '[h]:mm:ss', '47': 'mmss.0', '48': '##0.0E+0', '49': '@' };
function rrSections(code) {
  var out = [], cur = '', q = false;
  for (var i = 0; i < code.length; i++) {
    var ch = code.charAt(i);
    if (ch === '"') q = !q;
    if (ch === '\\' && !q) { cur += ch + code.charAt(++i); continue; }
    if (ch === ';' && !q) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}
function rrMilliers(ent) { return ent.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0'); }
function rrGeneral(v) {
  if (!isFinite(v)) return String(v);
  if (v === 0) return '0';
  var a = Math.abs(v), s;
  if (a >= 1e11 || a < 1e-9) s = v.toExponential(5).replace(/\.?0+e/, 'E').replace('e', 'E');
  else s = String(parseFloat(v.toPrecision(10)));
  return s.replace('.', ',');
}
function rrDate(v, code) {
  var ms = Math.round((v - 25569) * 86400000), d = new Date(ms);
  var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
  var Y = d.getUTCFullYear(), M = d.getUTCMonth() + 1, D = d.getUTCDate(), H = d.getUTCHours(), Mi = d.getUTCMinutes(), Se = d.getUTCSeconds();
  var totH = Math.floor(v * 24 + 1e-9);
  var mois = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  var out = '', i = 0, apresH = false, c = code.replace(/\[\$[^\]]*\]/g, '').replace(/"([^"]*)"/g, function (a, t) { return '\u0001' + t + '\u0002'; });
  while (i < c.length) {
    var ch = c.charAt(i), low = ch.toLowerCase(), n = 1;
    if (ch === '\u0001') { var j = c.indexOf('\u0002', i); out += c.slice(i + 1, j); i = j + 1; continue; }
    if (ch === '\\') { out += c.charAt(i + 1); i += 2; continue; }
    if (c.slice(i, i + 3).toLowerCase() === '[h]') { out += totH; i += 3; apresH = true; continue; }
    while (c.charAt(i + n).toLowerCase() === low && /[ymdhs]/.test(low)) n++;
    if (low === 'y') { out += n <= 2 ? p2(Y % 100) : Y; }
    else if (low === 'd') { out += n === 1 ? D : n === 2 ? p2(D) : D; }
    else if (low === 'h') { out += n === 1 ? H : p2(H); apresH = true; }
    else if (low === 'm') {
      var minutes = apresH || /^[^a-z]*s/i.test(c.slice(i + n));
      out += minutes ? (n === 1 ? Mi : p2(Mi)) : (n === 1 ? M : n === 2 ? p2(M) : mois[M - 1]);
      if (minutes) apresH = false;
    }
    else if (low === 's') { out += n === 1 ? Se : p2(Se); }
    else { out += ch; n = 1; }
    i += n;
  }
  return out;
}
function rrFormater(v, code) {
  if (typeof v !== 'number') return v;
  code = code || 'General';
  var secs = rrSections(code), sec = secs[0];
  if (v < 0 && secs.length > 1) { sec = secs[1]; v = -v; }
  else if (v === 0 && secs.length > 2) sec = secs[2];
  var neg = v < 0 && (secs.length <= 1);
  sec = sec.replace(/\[(Red|Rouge|Black|Noir|Blue|Bleu|Green|Vert|White|Blanc|Yellow|Jaune|Magenta|Cyan|Color\d+)\]/gi, '').replace(/\[\$[^\]]*\]/g, '').replace(/_./g, ' ').replace(/\*./g, '');
  if (/^\s*General\s*$/i.test(sec) || sec.trim() === '') return (neg ? '-' : '') + rrGeneral(Math.abs(v));
  if (sec.trim() === '@') return rrGeneral(v);
  var sansTexte = sec.replace(/"[^"]*"/g, '').replace(/\\./g, '');
  if (/[dmyhs]/i.test(sansTexte) && !/[0#?]/.test(sansTexte.replace(/s/gi, ''))) return rrDate(v, sec);
  // nombre : partie avant / après la décimale, pourcentage, exposant, texte littéral
  var pct = /%/.test(sansTexte), exp = /E[+-]/i.exec(sansTexte);
  var x = Math.abs(v) * (pct ? 100 : 1);
  var m = /([#0?,\s]*)(\.([0#?]*))?/.exec(sansTexte.replace(/[^0#?.,E+\-%\s]/gi, ''));
  var dec = m && m[3] ? m[3].length : 0, decMin = m && m[3] ? (m[3].match(/0/g) || []).length : 0;
  var corps;
  if (exp) {
    var e = x === 0 ? 0 : Math.floor(Math.log10(x)), mant = x / Math.pow(10, e);
    if (+mant.toFixed(dec) >= 10) { mant /= 10; e += 1; }
    var ce = sansTexte.slice(exp.index + 2).replace(/[^0]/g, '').length || 1;
    var es = String(Math.abs(e)); while (es.length < ce) es = '0' + es;
    corps = mant.toFixed(dec).replace('.', ',') + 'E' + (e < 0 ? '-' : '+') + es;
  } else {
    var s = x.toFixed(dec), parts = s.split('.');
    var ent = parts[0], fr = parts[1] || '';
    while (fr.length > decMin && fr.charAt(fr.length - 1) === '0') fr = fr.slice(0, -1);
    if (/,/.test(m ? m[1] : '')) ent = rrMilliers(ent);
    if (ent === '0' && m && !/0/.test(m[1] || '') && fr) ent = '';
    corps = ent + (fr ? ',' + fr : '') + (pct ? '\u00a0%' : '');
  }
  // texte littéral autour du nombre
  var avant = '', apres = '', vu = false;
  sec.replace(/"([^"]*)"|\\(.)|([0#?.,%E+\-]+)|(.)/gi, function (a, q, esc, num, autre) {
    var t = q !== undefined ? q : esc !== undefined ? esc : num !== undefined ? null : autre;
    if (t === null) { vu = true; return a; }
    if (vu) apres += t; else avant += t;
    return a;
  });
  return (neg ? '-' : '') + avant.replace(/[()]/g, function (p) { return p; }) + corps + apres.replace(/%/g, '');
}

// ---------- Lecture d'un onglet ----------
function rrValeur(sheet, ref) {
  var c = sheet.cell(ref);
  if (!c) return { brut: '', type: 'vide', s: null };
  var t = rrAttr(c.attrs, 't'), s = rrAttr(c.attrs, 's');
  var txt = sheet.text(ref);
  if (t === 's' || t === 'str' || t === 'inlineStr') return { brut: txt, type: 'texte', s: s };
  if (t === 'b') return { brut: txt === '1' ? 'VRAI' : 'FAUX', type: 'texte', s: s };
  if (t === 'e') return { brut: txt, type: 'erreur', s: s };
  if (txt === '') return { brut: '', type: 'vide', s: s };
  var n = parseFloat(txt);
  return isFinite(n) ? { brut: n, type: 'nombre', s: s } : { brut: txt, type: 'texte', s: s };
}
function rrInfosOnglet(sheet) {
  var cols = {}, def = 8.43;
  var fp = /<sheetFormatPr\b[^>]*>/.exec(sheet.head);
  if (fp && rrAttr(fp[0], 'defaultColWidth')) def = parseFloat(rrAttr(fp[0], 'defaultColWidth'));
  (sheet.head.match(/<col\b[^>]*\/>/g) || []).forEach(function (c) {
    for (var i = +rrAttr(c, 'min'); i <= +rrAttr(c, 'max'); i++) cols[i] = { w: parseFloat(rrAttr(c, 'width') || def), cache: rrAttr(c, 'hidden') === '1' };
  });
  var fusions = [];
  (sheet.tail.match(/<mergeCell\b[^>]*\/>/g) || []).forEach(function (mc) {
    var r = /([A-Z]+)(\d+):([A-Z]+)(\d+)/.exec(rrAttr(mc, 'ref') || '');
    if (r) fusions.push({ c1: XlsmMoteur.colIdx(r[1]), r1: +r[2], c2: XlsmMoteur.colIdx(r[3]), r2: +r[4] });
  });
  return { cols: cols, def: def, fusions: fusions };
}
function rrLigneCachee(sheet, r) { var row = sheet.rows[r]; return !!(row && rrAttr(row.attrs, 'hidden') === '1'); }
function rrLibelle(sheet, r) { return (sheet.text('A' + r) + ' ' + sheet.text('B' + r)).replace(/\s+/g, ' ').trim(); }
function rrLigneDe(sheet, libelle) {
  var rows = Object.keys(sheet.rows).map(Number).sort(function (a, b) { return a - b; });
  for (var i = 0; i < rows.length; i++) if (sheet.text('A' + rows[i]).trim() === libelle) return rows[i];
  return null;
}
function rrDerniereColonne(sheet) {
  var max = 0;
  Object.keys(sheet.rows).forEach(function (r) { Object.keys(sheet.rows[r].cells).forEach(function (c) { var v = sheet.rows[r].cells[c]; if (v.inner && /<v>[^<]/.test(v.inner) && +c > max) max = +c; }); });
  return max;
}
// Lots de 12 colonnes de données à partir de C (2 GEH en Reg, 6 prélèvements sinon), avec données
function rrLots(sheet, rRes, rVal) {
  var der = rrDerniereColonne(sheet), lots = [];
  for (var c0 = 3; c0 <= der; c0 += 12) {
    var cols = []; for (var c = c0; c < c0 + 12; c++) cols.push(c);
    var plein = false;
    for (var r = rRes + 1; r < rVal && !plein; r++) cols.forEach(function (c) { var v = rrValeur(sheet, XlsmMoteur.colStr(c) + r); if (v.type === 'nombre' || (v.type === 'texte' && v.brut.trim())) plein = true; });
    if (plein) lots.push(cols);
  }
  return lots;
}
// Colonnes utiles d'un lot : prélèvements (2 colonnes) ayant une réf. d'échantillon dans le bloc RESULTATS. Le bloc
// vierge « 2 - intitulé » d'un onglet Reg, les jours non faits d'un GEH (J3 vide…) ou les prélèvements non utilisés
// d'un onglet non Reg ne sont donc pas repris dans le rapport. En Reg, la 1re paire d'un GEH gardé reste toujours :
// elle porte le GEH et l'agent (cellules fusionnées sur le bloc). Sans ligne de réf. (Analyseurs), tout est gardé.
function rrColonnesUtiles(sheet, cols, rRes, rVal, reg) {
  var rRef = [];
  for (var r = rRes; r < rVal; r++) if (/^(référence de l'échantillon|n° d'essai)/i.test(sheet.text('A' + r).trim())) rRef.push(r);
  if (!rRef.length) return cols;
  var aRef = function (c) { return rRef.some(function (r) { var t = String(sheet.text(XlsmMoteur.colStr(c) + r)).trim(); return t && t !== '0'; }); };
  var pas = reg ? 6 : 2, out = [];
  for (var i = 0; i < cols.length; i += pas) {
    var g = cols.slice(i, i + pas), paires = [];
    for (var j = 0; j < g.length; j += 2) if (g.slice(j, j + 2).some(aRef)) paires.push(j);
    if (!paires.length) continue;
    if (paires[0] !== 0) paires.unshift(0);
    paires.forEach(function (j) { out = out.concat(g.slice(j, j + 2)); });
  }
  return out;
}
// Plus grand numéro d'agent utilisé (« agent chimique n°k_ » renseigné) sur ces colonnes, comme la macro qui masque les
// lignes « n°k_ » des agents suivants ; null si l'onglet n'a pas de lignes numérotées par agent
function rrDernierAgent(sheet, cols, fin) {
  var max = null;
  for (var r = 1; r <= fin; r++) {
    var m = /^agent chimique n°(\d+)_/i.exec(sheet.text('A' + r).trim());
    if (!m) continue;
    if (max === null) max = 0;
    if (cols.some(function (c) { return String(sheet.text(XlsmMoteur.colStr(c) + r)).trim(); }) && +m[1] > max) max = +m[1];
  }
  return max;
}
// Ligne numérotée à masquer : agent « n°k_ » au-delà du dernier agent utilisé, ou ligne « n°… » vide sur ces colonnes
function rrLigneNumeroteeVide(sheet, r, cols, dernierAgent) {
  var lib = rrLibelle(sheet, r);
  if (!/n°C\d+-P\d+_|n°\d+_/.test(lib)) return false;
  var k = /(^|[^C\d])n°(\d+)_/.exec(lib);
  if (k && dernierAgent !== null) return +k[2] > dernierAgent;
  return !cols.some(function (c) { var v = rrValeur(sheet, XlsmMoteur.colStr(c) + r); return v.type === 'nombre' || (v.type === 'texte' && v.brut.trim()); });
}

// Type de prélèvement des colonnes d'un lot non Reg (ligne « type de prélèvement », 2 colonnes par prélèvement)
function rrTypes(sheet, cols, rRes, rVal) {
  var rT = null;
  for (var r = rRes; r < rVal; r++) if (/^type de prélèvement$/i.test(sheet.text('A' + r).trim())) { rT = r; break; }
  return cols.map(function (c, i) {
    var c0 = cols[i - i % 2];
    return rT ? String(sheet.text(XlsmMoteur.colStr(c0) + rT)).trim() : '';
  });
}

// ---------- Tableau Word ----------
function rrBordure(b) {
  if (!b) return null;
  var map = { thin: ['single', 4], hair: ['single', 2], medium: ['single', 12], thick: ['single', 18], dashed: ['dashed', 4], dotted: ['dotted', 4], double: ['double', 4], mediumDashed: ['dashed', 12], dashDot: ['dotDash', 4], mediumDashDot: ['dotDash', 12], dashDotDot: ['dotDotDash', 4], slantDashDot: ['dotDash', 12] };
  var v = map[b.style] || ['single', 4];
  return 'w:val="' + v[0] + '" w:sz="' + v[1] + '" w:space="0" w:color="' + (b.color || '000000') + '"';
}
// rows : numéros de lignes Excel, cols : numéros de colonnes Excel (A=1) ; renvoie un nœud w:tbl
function rrTableau(sheet, S, info, rows, cols, largeurMax) {
  var X = DocxMoteur, E = X.encXml;
  cols = cols.filter(function (c) { return !(info.cols[c] && info.cols[c].cache) && !(info.cols[c] && info.cols[c].w === 0); });
  var px = cols.map(function (c) { var w = info.cols[c] ? info.cols[c].w : info.def; return Math.max(4, Math.round(w * 7 + 5)); });
  var total = px.reduce(function (a, b) { return a + b; }, 0) * 15, f = Math.min(1, (largeurMax || RR_LARGEUR_PAGE) / total);
  var tw = px.map(function (p) { return Math.max(60, Math.round(p * 15 * f)); });
  var colPos = {}; cols.forEach(function (c, i) { colPos[c] = i; });
  var rowPos = {}; rows.forEach(function (r, i) { rowPos[r] = i; });
  // fusions ramenées aux lignes et colonnes gardées
  var couvert = {}, depart = {};
  info.fusions.forEach(function (fu) {
    var rs = rows.filter(function (r) { return r >= fu.r1 && r <= fu.r2; }), cs = cols.filter(function (c) { return c >= fu.c1 && c <= fu.c2; });
    if (!rs.length || !cs.length || (rs.length === 1 && cs.length === 1)) return;
    depart[rs[0] + ':' + cs[0]] = { span: cs.length, lignes: rs, cols: cs, r1: fu.r1, c1: fu.c1 };
    rs.forEach(function (r, i) { cs.forEach(function (c, j) { if (i || j) couvert[r + ':' + c] = { vmerge: j === 0 && i > 0, depart: rs[0] + ':' + cs[0] }; }); });
  });
  var xml = '<w:tbl><w:tblPr><w:tblW w:w="' + tw.reduce(function (a, b) { return a + b; }, 0) + '" w:type="dxa"/><w:jc w:val="center"/><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="20" w:type="dxa"/><w:right w:w="20" w:type="dxa"/></w:tblCellMar><w:tblLook w:val="0000"/></w:tblPr><w:tblGrid>' +
    tw.map(function (w) { return '<w:gridCol w:w="' + w + '"/>'; }).join('') + '</w:tblGrid>';
  var keepNext = rows.length <= 40; // tableau d'un seul tenant sur la page (comme une image), sauf très long
  rows.forEach(function (r, ri) {
    var garder = keepNext && ri < rows.length - 1 ? '<w:keepNext/>' : '';
    xml += '<w:tr><w:trPr><w:cantSplit/></w:trPr>';
    for (var i = 0; i < cols.length; i++) {
      var c = cols[i], cle = r + ':' + c, cv = couvert[cle];
      if (cv && !cv.vmerge) continue; // couvert horizontalement : la cellule de départ porte gridSpan
      var dep = depart[cle], span = dep ? dep.span : 1;
      if (cv && cv.vmerge) { var d0 = depart[cv.depart]; span = d0 ? d0.span : 1; }
      var refCel = XlsmMoteur.colStr(c) + r;
      // style : cellule elle-même (les bordures d'une fusion viennent de ses propres cellules)
      var val = rrValeur(sheet, cv ? XlsmMoteur.colStr(c) + r : refCel), st = rrStyleCellule(S, val.s);
      var w = 0; for (var k = 0; k < span; k++) w += tw[i + k];
      var tcPr = '<w:tcW w:w="' + w + '" w:type="dxa"/>' + (span > 1 ? '<w:gridSpan w:val="' + span + '"/>' : '');
      if (dep && dep.lignes.length > 1) tcPr += '<w:vMerge w:val="restart"/>';
      else if (cv && cv.vmerge) tcPr += '<w:vMerge/>';
      // bordures : gauche de la 1re colonne, droite de la dernière colonne couverte
      var stDroite = span > 1 ? rrStyleCellule(S, rrValeur(sheet, XlsmMoteur.colStr(cols[i + span - 1]) + r).s) : st;
      var bords = { top: st.bord.top, left: st.bord.left, bottom: st.bord.bottom, right: stDroite.bord.right };
      var bx = ''; ['top', 'left', 'bottom', 'right'].forEach(function (k) { var b = rrBordure(bords[k]); bx += b ? '<w:' + k + ' ' + b + '/>' : '<w:' + k + ' w:val="nil"/>'; });
      tcPr += '<w:tcBorders>' + bx + '</w:tcBorders>';
      if (st.fond && st.fond !== 'FFFFFF') tcPr += '<w:shd w:val="clear" w:color="auto" w:fill="' + st.fond + '"/>';
      tcPr += '<w:vAlign w:val="' + (st.v === 'top' ? 'top' : st.v === 'center' || st.v === 'justify' || st.v === 'distributed' ? 'center' : 'bottom') + '"/>';
      var texte = cv ? '' : (val.type === 'nombre' ? rrFormater(val.brut, st.fmt) : String(val.brut));
      var jc = st.h === 'center' || st.h === 'centerContinuous' ? 'center' : st.h === 'right' ? 'right' : st.h === 'left' ? 'left' : (val.type === 'nombre' ? 'right' : 'left');
      var taille = Math.max(9, Math.round(st.taille * 2 * f));
      var rpr = '<w:rPr><w:rFonts w:ascii="' + E(st.police) + '" w:hAnsi="' + E(st.police) + '" w:cs="' + E(st.police) + '"/>' + (st.gras ? '<w:b/>' : '') + (st.italique ? '<w:i/>' : '') + (st.souligne ? '<w:u w:val="single"/>' : '') +
        (st.couleur && st.couleur !== '000000' ? '<w:color w:val="' + st.couleur + '"/>' : '') + '<w:sz w:val="' + taille + '"/><w:szCs w:val="' + taille + '"/></w:rPr>';
      var runs = texte.split('\n').map(function (l, li) { return (li ? '<w:r>' + rpr + '<w:br/></w:r>' : '') + (l ? '<w:r>' + rpr + '<w:t xml:space="preserve">' + E(l) + '</w:t></w:r>' : ''); }).join('');
      xml += '<w:tc><w:tcPr>' + tcPr + '</w:tcPr><w:p><w:pPr>' + garder + '<w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="' + jc + '"/>' + rpr + '</w:pPr>' + runs + '</w:p></w:tc>';
      i += span - 1;
    }
    xml += '</w:tr>';
  });
  xml += '</w:tbl>';
  return X.analyser(xml).kids[0];
}
// ---------- Image (annexe des résultats détaillés, comme les images de la macro) ----------
// Fabrique de canvas du navigateur (remplaçable pour les essais) ; null hors navigateur : tableaux Word à la place
var rrCreerCanvas = function (w, h) {
  if (typeof document === 'undefined' || !document.createElement) return null;
  var c = document.createElement('canvas');
  if (!c || !c.getContext) return null;
  c.width = w; c.height = h;
  return c;
};
function rrPng(canvas) {
  if (canvas.toBlob) return new Promise(function (ok, ko) {
    canvas.toBlob(function (b) { if (!b) return ko(new Error('image impossible')); b.arrayBuffer().then(function (ab) { ok(new Uint8Array(ab)); }); }, 'image/png');
  });
  return Promise.resolve(new Uint8Array(canvas.toBuffer('image/png')));
}
// Dessine les lignes / colonnes comme Excel les affiche ; renvoie Promise<{ octets, l, h }> (pixels à 96 ppp) ou null
function rrImage(sheet, S, info, rows, cols) {
  cols = cols.filter(function (c) { return !(info.cols[c] && info.cols[c].cache) && !(info.cols[c] && info.cols[c].w === 0); });
  var k = 1.5, fp = /<sheetFormatPr\b[^>]*>/.exec(sheet.head), defH = fp && rrAttr(fp[0], 'defaultRowHeight') ? parseFloat(rrAttr(fp[0], 'defaultRowHeight')) : 15;
  var ws = cols.map(function (c) { var w = info.cols[c] ? info.cols[c].w : info.def; return Math.max(4, Math.round(w * 7 + 5)); });
  var hs = rows.map(function (r) { var row = sheet.rows[r], ht = row ? rrAttr(row.attrs, 'ht') : null; return Math.max(4, Math.round((ht ? parseFloat(ht) : defH) * 96 / 72)); });
  var xs = [0], ys = [0];
  ws.forEach(function (w, i) { xs.push(xs[i] + w); }); hs.forEach(function (h, i) { ys.push(ys[i] + h); });
  var W = xs[xs.length - 1] + 1, H = ys[ys.length - 1] + 1;
  var canvas = rrCreerCanvas(W * k, H * k);
  if (!canvas) return Promise.resolve(null);
  var g = canvas.getContext('2d');
  g.scale(k, k); g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W, H);
  var ci = {}; cols.forEach(function (c, i) { ci[c] = i; });
  var ri = {}; rows.forEach(function (r, i) { ri[r] = i; });
  // fusions : région (indices de lignes / colonnes gardées) de chaque cellule fusionnée
  var region = {};
  info.fusions.forEach(function (fu) {
    var rs = rows.filter(function (r) { return r >= fu.r1 && r <= fu.r2; }), cs = cols.filter(function (c) { return c >= fu.c1 && c <= fu.c2; });
    if (!rs.length || !cs.length) return;
    var reg = { r0: ri[rs[0]], r1: ri[rs[rs.length - 1]], c0: ci[cs[0]], c1: ci[cs[cs.length - 1]], depart: rs[0] + ':' + cs[0] };
    rs.forEach(function (r) { cs.forEach(function (c) { region[r + ':' + c] = reg; }); });
  });
  var lignesTexte = function (txt, police, larg, renvoi) {
    g.font = police;
    var out = [];
    String(txt).split('\n').forEach(function (para) {
      if (!renvoi) { out.push(para); return; }
      var mots = para.split(' '), cur = '';
      mots.forEach(function (m) { var t = cur ? cur + ' ' + m : m; if (cur && g.measureText(t).width > larg) { out.push(cur); cur = m; } else cur = t; });
      out.push(cur);
    });
    return out;
  };
  // fonds et textes
  rows.forEach(function (r, i) {
    cols.forEach(function (c, j) {
      var cle = r + ':' + c, reg = region[cle];
      if (reg && reg.depart !== cle) return;
      var x = xs[reg ? reg.c0 : j], y = ys[reg ? reg.r0 : i], w = xs[(reg ? reg.c1 : j) + 1] - x, h = ys[(reg ? reg.r1 : i) + 1] - y;
      var val = rrValeur(sheet, XlsmMoteur.colStr(c) + r), st = rrStyleCellule(S, val.s);
      if (st.fond && st.fond !== 'FFFFFF') { g.fillStyle = '#' + st.fond; g.fillRect(x, y, w, h); }
      var txt = val.type === 'nombre' ? rrFormater(val.brut, st.fmt) : String(val.brut || '');
      if (!txt) return;
      var taille = st.taille * 96 / 72, police = (st.italique ? 'italic ' : '') + (st.gras ? 'bold ' : '') + taille.toFixed(1) + 'px "' + st.police + '", Arial, sans-serif';
      var lignes = lignesTexte(txt, police, w - 4, st.renvoi), hl = taille * 1.2;
      var jc = st.h === 'center' || st.h === 'centerContinuous' ? 'center' : st.h === 'right' ? 'right' : st.h === 'left' ? 'left' : (val.type === 'nombre' ? 'right' : 'left');
      // comme Excel : un texte non renvoyé à la ligne, aligné à gauche, déborde sur les cellules vides à sa droite
      var wClip = w;
      if (!st.renvoi && jc === 'left' && val.type !== 'nombre') {
        for (var jj = (reg ? reg.c1 : j) + 1; jj < cols.length; jj++) {
          var cv = cols[jj], vv = rrValeur(sheet, XlsmMoteur.colStr(cv) + r);
          if (region[r + ':' + cv] || (vv.type !== 'vide' && String(vv.brut) !== '')) break;
          wClip = xs[jj + 1] - x;
          g.font = police;
          if (g.measureText(lignes[0] || '').width + 4 <= wClip) break;
        }
      }
      var y0 = st.v === 'top' ? y + 2 : st.v === 'center' || st.v === 'justify' || st.v === 'distributed' ? y + (h - lignes.length * hl) / 2 : y + h - lignes.length * hl - 1;
      g.save(); g.beginPath(); g.rect(x, y, wClip, h); g.clip();
      g.font = police; g.fillStyle = '#' + (st.couleur || '000000'); g.textBaseline = 'top'; g.textAlign = jc;
      var xt = jc === 'center' ? x + w / 2 : jc === 'right' ? x + w - 2 : x + 2;
      lignes.forEach(function (l, n) { g.fillText(l, xt, y0 + n * hl + 1); });
      g.restore();
    });
  });
  // bordures : chaque cellule trace les siennes, sauf à l'intérieur d'une fusion
  var largeur = { thin: 1, hair: 0.5, medium: 2, thick: 3, double: 3, dashed: 1, dotted: 1, mediumDashed: 2, dashDot: 1, mediumDashDot: 2, dashDotDot: 1, slantDashDot: 2 };
  rows.forEach(function (r, i) {
    cols.forEach(function (c, j) {
      var reg = region[r + ':' + c], st = rrStyleCellule(S, rrValeur(sheet, XlsmMoteur.colStr(c) + r).s);
      var cotes = { top: [xs[j], ys[i], xs[j + 1], ys[i]], bottom: [xs[j], ys[i + 1], xs[j + 1], ys[i + 1]], left: [xs[j], ys[i], xs[j], ys[i + 1]], right: [xs[j + 1], ys[i], xs[j + 1], ys[i + 1]] };
      Object.keys(cotes).forEach(function (cote) {
        var b = st.bord[cote];
        if (!b) return;
        if (reg && ((cote === 'top' && i > reg.r0) || (cote === 'bottom' && i < reg.r1) || (cote === 'left' && j > reg.c0) || (cote === 'right' && j < reg.c1))) return;
        var p = cotes[cote];
        g.strokeStyle = '#' + (b.color || '000000'); g.lineWidth = largeur[b.style] || 1;
        g.setLineDash(/dash/i.test(b.style) ? [4, 2] : /dot/i.test(b.style) ? [1, 2] : []);
        g.beginPath(); g.moveTo(p[0] + 0.5, p[1] + 0.5); g.lineTo(p[2] + 0.5, p[3] + 0.5); g.stroke();
      });
    });
  });
  g.setLineDash([]);
  return rrPng(canvas).then(function (octets) { return { octets: octets, l: W, h: H }; });
}

// ---------- Onglets de résultats de la feuille ----------
// [{ nom, reg, sheet, info, rRes, rVal, rCalc, lots: [{ cols, types }] }]
function rrOnglets(wb) {
  var etats = {}, out = [];
  (wb.workbookXml.match(/<sheet\b[^>]*\/>/g) || []).forEach(function (s) { etats[(rrAttr(s, 'name') || '').replace(/&amp;/g, '&')] = rrAttr(s, 'state') || 'visible'; });
  // onglets modèles d'origine (« Tube Reg »…, textes d'exemple « 1 - intitulé ») écartés s'ils n'ont aucune référence
  // d'échantillon : un technicien peut remplir le modèle sans le renommer (Bruker 2026 : onglet « Cassette »)
  var noms = Object.keys(wb.paths).filter(function (n) { return etats[n] === 'visible'; });
  var ordre = wb._ordre ? wb._ordre() : noms;
  noms.sort(function (a, b) { return ordre.indexOf(a) - ordre.indexOf(b); });
  var chain = Promise.resolve();
  noms.forEach(function (n) {
    chain = chain.then(function () { return wb.onglet(n); }).then(function (sh) {
      var a1 = sh.text('A1').trim();
      if (RR_ONGLETS.indexOf(a1) === -1) return;
      var rRes = rrLigneDe(sh, 'RESULTATS'), rVal = rrLigneDe(sh, 'Validation des prélèvements'), rCalc = rrLigneDe(sh, 'Calcul d\'incertitudes');
      if (!rRes || !rVal) return;
      if (n !== 'Analyseurs' && RR_ONGLETS.indexOf(n) !== -1 && !rrAReference(sh, rRes, rVal)) return;
      var lots = rrLots(sh, rRes, rVal).map(function (cols) { return rrColonnesUtiles(sh, cols, rRes, rVal, /Reg/.test(a1)); })
        .filter(function (cols) { return cols.length; })
        .map(function (cols) { return { cols: cols, types: /Reg/.test(a1) ? null : rrTypes(sh, cols, rRes, rVal) }; });
      if (lots.length) out.push({ nom: n, modele: a1, reg: /Reg/.test(a1), sheet: sh, info: rrInfosOnglet(sh), rRes: rRes, rVal: rVal, rCalc: rCalc || rVal, lots: lots });
    });
  });
  return chain.then(function () { return out; });
}
// Une référence d'échantillon au moins dans le bloc RESULTATS (onglet réellement rempli)
function rrAReference(sh, rRes, rVal) {
  for (var r = rRes; r < rVal; r++) {
    if (!/^référence de l'échantillon/i.test(sh.text('A' + r).trim())) continue;
    var der = rrDerniereColonne(sh);
    for (var c = 3; c <= der; c++) { var t = String(sh.text(XlsmMoteur.colStr(c) + r)).trim(); if (t && t !== '0') return true; }
  }
  return false;
}
// GEH (numéro) et agents d'un groupe de colonnes du bloc RESULTATS (lignes « GEH », « agent chimique… »)
function rrGroupeInfos(o, cols) {
  var sh = o.sheet, texteGeh = '', agents = [];
  for (var r = o.rRes; r < o.rVal; r++) {
    var lib = sh.text('A' + r).trim(), v = String(sh.text(XlsmMoteur.colStr(cols[0]) + r)).trim();
    if (lib === 'GEH') texteGeh = v;
    if (/^agent chimique/i.test(lib) && v && agents.indexOf(v) === -1) agents.push(v);
  }
  // GEH vide ou resté à « 2 - intitulé » (exemple du modèle) : numéro du nom d'onglet (« Tube Reg (multi) - 7 »)
  var geh = !texteGeh || /intitulé/.test(texteGeh) ? (/-\s*(\d+)\s*$/.exec(o.nom) || [])[1] : (/^(\d+)/.exec(texteGeh) || [])[1];
  return { geh: geh || null, agents: agents };
}
// Lignes du détail d'un lot : comme la macro, lignes numérotées (n°Cx-Py_, n°x_) vides sur le lot masquées
function rrLignesDetail(o, cols) {
  var sh = o.sheet, fin = o.rCalc - 2, rows = [], dernier = rrDernierAgent(sh, cols, fin);
  for (var r = 1; r <= fin; r++) {
    if (rrLigneCachee(sh, r) || rrLigneNumeroteeVide(sh, r, cols, dernier)) continue;
    rows.push(r);
  }
  return rows;
}
// Découpage du détail en morceaux de 50 lignes au plus, aux limites de sections (comme la macro)
function rrMorceaux(o, rows) {
  var sh = o.sheet, debuts = [1];
  rows.forEach(function (r) { if (RR_SECTIONS.indexOf(sh.text('A' + r).trim()) !== -1 && r !== 1) debuts.push(r); });
  var sections = debuts.map(function (d, i) { var f = i + 1 < debuts.length ? debuts[i + 1] - 1 : Infinity; return rows.filter(function (r) { return r >= d && r <= f; }); }).filter(function (s) { return s.length; });
  var out = [], cur = [];
  sections.forEach(function (s) {
    if (cur.length && cur.length + s.length > 50) { out.push(cur); cur = []; }
    cur = cur.concat(s);
  });
  if (cur.length) out.push(cur);
  return out;
}

// ---------- Placement dans le rapport ----------
function rrTitreSection(paras, i) {
  var X = DocxMoteur;
  for (var k = i; k >= 0; k--) {
    var ps = X.enfant(paras[k], 'w:pPr'), st = ps && X.enfant(ps, 'w:pStyle'), v = st ? X.attr(st, 'w:val') || '' : '';
    if (/^(Titre|Heading)1$/i.test(v)) return X.texte(paras[k]);
  }
  return '';
}
function rrParagrapheVide(saut) {
  return DocxMoteur.analyser('<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>' + (saut ? '<w:r><w:br w:type="page"/></w:r>' : '') + '</w:p>').kids[0];
}
// Image d'une plage de la feuille (comme celles de la macro : non modifiable par nature) ; tableau Word si aucun
// canvas n'est disponible (hors navigateur, essais automatiques). Renvoie Promise<nœud à insérer>.
// Un contrôle de contenu autour d'un tableau a été essayé pour le verrouiller : Word plante à la fermeture après un
// export PDF du rapport (2026-10-15), d'où les images.
// Renvoie Promise<[nœuds à insérer dans l'ordre]>. Chaque image est précédée d'un paragraphe d'espacement qui la suit
// sur la page (keepNext) : en haut de page, le logo de l'en-tête de la trame déborde d'environ 0,8 cm dans la zone de
// texte et Word rognerait l'image à droite pour le contourner ; l'espacement occupe cette zone.
function rrBloc(doc, S, d, titre, sautAvant) {
  var X = DocxMoteur;
  return rrImage(d.o.sheet, S, d.o.info, d.rows, d.cols).then(function (img) {
    if (!img) return [rrTableau(d.o.sheet, S, d.o.info, d.rows, d.cols), rrParagrapheVide(false)];
    // largeur de page au plus, hauteur d'une page au plus (EMU : 9525 par pixel à 96 ppp)
    var cx = img.l * 9525, cy = img.h * 9525, f = Math.min(1, RR_LARGEUR_PAGE * 635 / cx, 7300000 / cy); // hauteur : page moins marges, en-tête et espacement
    var esp = X.analyser('<w:p><w:pPr>' + (sautAvant ? '<w:pageBreakBefore/>' : '') + '<w:keepNext/><w:spacing w:before="0" w:after="0" w:line="560" w:lineRule="exact"/></w:pPr></w:p>').kids[0];
    var p = X.analyser('<w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:jc w:val="center"/></w:pPr></w:p>').kids[0];
    var run = doc.imageRun(img.octets, Math.round(cx * f), Math.round(cy * f), titre);
    run.parent = p; p.kids.push(run);
    return [esp, p];
  });
}
// Insère les blocs dans l'ordre après « ancre » ; renvoie Promise<dernier nœud>
function rrInserer(doc, S, ancre, descs, titre) {
  var X = DocxMoteur, chain = Promise.resolve(ancre);
  descs.forEach(function (d) {
    chain = chain.then(function (a) {
      return rrBloc(doc, S, d, titre, false).then(function (noeuds) {
        noeuds.forEach(function (n) { X.insererApres(a, n); a = n; });
        return a;
      });
    });
  });
  return chain;
}

// doc : rapport (DocxMoteur.Document) ; wbFeuille : feuille de calcul enregistrée (XlsmMoteur.Classeur)
// Renvoie Promise<{ reg, horsArrete, posteFixe, annexe, images, alertes }>
// m (facultatif) : mission, pour placer chaque GEH × agent dans sa partie (évaluation initiale ou contrôle périodique)
function rapportInsererResultats(doc, wbFeuille, m) {
  var X = DocxMoteur, res = { reg: 0, horsArrete: 0, posteFixe: 0, annexe: 0, images: 0, alertes: [] }, S;
  return Promise.all([rrStyles(wbFeuille.zip), rrOnglets(wbFeuille), doc.chargerRelations()]).then(function (x) {
    S = x[0]; var onglets = x[1];
    if (!onglets.length) { res.alertes.push('Aucun résultat trouvé dans la feuille de calcul (onglets de résultats vides ou feuille non enregistrée par Excel).'); return res; }
    var corps = doc.corps(), paras = X.trouverTous(corps, 'w:p');
    // tableaux d'exemple « RESULTATS » de la trame, par section
    var exemples = X.trouverTous(corps, 'w:tbl').filter(function (t) { return /^RESULTATS/.test(X.texte(t).trim()); }).map(function (t) {
      var p = t.parent.kids.slice(0, t.parent.kids.indexOf(t)).reverse().filter(function (k) { return k.name === 'w:p'; })[0];
      var titre = p ? rrTitreSection(paras, paras.indexOf(p)) : '';
      return { tbl: t, titre: titre, reg: !/hors arrêté/i.test(titre), etape: /hors arrêté/i.test(titre) ? 'hors' : (/contrôle périodique/i.test(titre) ? 'cp' : (/Evaluation initiale/i.test(titre) ? 'ei' : null)) };
    });
    var cibleReg = exemples.filter(function (e) { return e.reg; })[0] || null, cibleHors = exemples.filter(function (e) { return !e.reg; })[0] || null;
    var cibleEtape = function (et) { return exemples.filter(function (e) { return e.reg && e.etape === et; })[0] || cibleReg; };
    var dReg = [], dHors = [], dPf = [];
    // partie réglementaire (évaluation initiale ou contrôle périodique) d'un groupe de colonnes, d'après la carte « Rapport »
    var etapeGroupe = function (o, cols) {
      if (!m || typeof rapportEtapeAgentFeuille !== 'function') return null;
      var inf = rrGroupeInfos(o, cols);
      return inf.geh ? rapportEtapeAgentFeuille(m, inf.geh, inf.agents) : null;
    };
    onglets.forEach(function (o) {
      var lignesRes = function (cs) {
        var d = rrDernierAgent(o.sheet, cs, o.rCalc - 2), out = [];
        for (var r = o.rRes; r < o.rVal; r++) if (!rrLigneCachee(o.sheet, r) && !rrLigneNumeroteeVide(o.sheet, r, cs, d)) out.push(r);
        return out;
      };
      var aDonnees = function (cs) { return cs.some(function (c) { for (var r = o.rRes + 1; r < o.rVal; r++) { var v = rrValeur(o.sheet, XlsmMoteur.colStr(c) + r); if (v.type === 'nombre' || (v.type === 'texte' && v.brut.trim())) return true; } return false; }); };
      o.lots.forEach(function (lot) {
        if (o.reg) {
          // 2 groupes de 6 colonnes (un GEH et un type de VLEP chacun) : lot entier s'ils vont dans la même partie
          var gr = [lot.cols.slice(0, 6), lot.cols.slice(6, 12)].filter(aDonnees).map(function (cs) { return { cols: cs, etape: etapeGroupe(o, cs) }; });
          if (!gr.length) return;
          if (gr.every(function (g) { return g.etape === gr[0].etape; })) dReg.push({ o: o, rows: lignesRes(lot.cols), cols: [1, 2].concat(lot.cols), etape: gr[0].etape });
          else gr.forEach(function (g) { dReg.push({ o: o, rows: lignesRes(g.cols), cols: [1, 2].concat(g.cols), etape: g.etape }); });
          return;
        }
        var pf = lot.cols.filter(function (c, i) { return /poste fixe/i.test(lot.types[i]); }), ind = lot.cols.filter(function (c, i) { return !/poste fixe/i.test(lot.types[i]); });
        if (pf.length && aDonnees(pf)) dPf.push({ o: o, rows: lignesRes(pf), cols: [1, 2].concat(pf) });
        if (ind.length && aDonnees(ind)) dHors.push({ o: o, rows: lignesRes(ind), cols: [1, 2].concat(ind) });
      });
    });
    var placer = function (cible, descs, quoi, cle) {
      if (!descs.length) return Promise.resolve();
      if (!cible) { res.alertes.push(quoi + ' : partie absente du rapport (voir les cases de la carte « Rapport »), résultats repris dans l’annexe des résultats détaillés uniquement.'); return Promise.resolve(); }
      // consigne « Insérer le tableau … de la feuille » retirée
      var avant = cible.tbl.parent.kids.slice(0, cible.tbl.parent.kids.indexOf(cible.tbl)).reverse().filter(function (k) { return k.name === 'w:p'; })[0];
      if (avant && /^Insérer le tableau/.test(X.texte(avant).trim())) X.retirer(avant);
      var ancre = rrParagrapheVide(false); X.insererAvant(cible.tbl, ancre);
      X.retirer(cible.tbl);
      return rrInserer(doc, S, ancre, descs, quoi).then(function () { res[cle] = descs.length; });
    };
    // résultats réglementaires regroupés par partie cible (dans l'ordre des onglets)
    var parCible = [];
    dReg.forEach(function (d) {
      var c = cibleEtape(d.etape), e = parCible.filter(function (x) { return x.cible === c; })[0];
      if (!e) { e = { cible: c, descs: [] }; parCible.push(e); }
      e.descs.push(d);
    });
    var chainReg = Promise.resolve();
    parCible.forEach(function (e) {
      chainReg = chainReg.then(function () { var n = res.reg; return placer(e.cible, e.descs, 'Résultats réglementaires', 'reg').then(function () { res.reg = n + (e.cible ? e.descs.length : 0); }); });
    });
    return chainReg.then(function () {
      // partie réglementaire sans résultat (tous les agents dans l'autre partie) : tableau d'exemple retiré
      exemples.filter(function (e) { return e.reg && e.tbl.parent; }).forEach(function (e) { if (dReg.length) X.retirer(e.tbl); });
      return placer(cibleHors, dHors, 'Résultats hors arrêté', 'horsArrete');
    }).then(function () {
      // postes fixes : sous le texte de la partie « Mesures à poste fixe » des commentaires
      if (!dPf.length) return;
      var titrePf = X.trouverTous(corps, 'w:p').filter(function (p) { return X.texte(p).trim() === 'Mesures à poste fixe (hors accréditation)'; })[0];
      if (!titrePf) { res.alertes.push('Résultats à poste fixe trouvés dans la feuille, mais « Mesures à poste fixe » n’est pas cochée dans la carte « Rapport » : résultats repris dans l’annexe des résultats détaillés uniquement.'); return; }
      var texte = titrePf.parent.kids[titrePf.parent.kids.indexOf(titrePf) + 1];
      return rrInserer(doc, S, texte || titrePf, dPf, 'Résultats poste fixe').then(function () { res.posteFixe = dPf.length; });
    }).then(function () {
      // annexe des résultats détaillés : une image par page, comme la macro
      var titreAnnexe = X.trouverTous(corps, 'w:p').filter(function (p) { return /Résultats détaillés des mesures/.test(X.texte(p)); }).pop();
      if (!titreAnnexe) return;
      var morceaux = [];
      onglets.forEach(function (o) {
        o.lots.forEach(function (lot) {
          rrMorceaux(o, rrLignesDetail(o, lot.cols)).forEach(function (rows) { morceaux.push({ o: o, rows: rows, cols: [1, 2].concat(lot.cols) }); });
        });
      });
      var chain = Promise.resolve(titreAnnexe);
      morceaux.forEach(function (d, i) {
        chain = chain.then(function (a) {
          return rrBloc(doc, S, d, 'Résultats détaillés ' + (i + 1), i > 0).then(function (noeuds) {
            if (noeuds[0].name === 'w:tbl' && i < morceaux.length - 1) noeuds[1] = rrParagrapheVide(true);
            noeuds.forEach(function (n) { X.insererApres(a, n); a = n; });
            return a;
          });
        });
      });
      return chain.then(function () { res.annexe = morceaux.length; });
    }).then(function () {
      res.images = doc._nImages || 0;
      return res;
    });
  });
}

console.log('✓ Rapport — résultats chargé');
