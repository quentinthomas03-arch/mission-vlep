// xlsm-moteur.js - Remplissage direct de la feuille de calcul « Contrôle des VLEP » (.xlsm)
// © 2025 Quentin THOMAS
//
// Le modèle est ouvert comme une archive zip (JSZip) et seules les cellules de saisie sont écrites :
// formules, macros (vbaProject.bin), ruban, listes déroulantes et mise en forme restent ceux du modèle.
// Ajouter un GEH ou un prélèvement reproduit la macro « Ajouter GEH ou prélèvement » : le bloc de
// colonnes C:H (onglet Reg) ou C:D (non Reg) est recopié à droite, formules décalées comme Excel.
// À l'ouverture, Excel recalcule tout (fullCalcOnLoad).
//
// Fonctionne dans le navigateur (JSZip global) et sous Node (tests : outils/feuille-calcul/).

(function (root) {
  'use strict';

  // ---------- Colonnes ----------
  function colIdx(s) { var n = 0; for (var i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64); return n; }
  function colStr(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
  function splitRef(ref) { var m = /^([A-Z]+)(\d+)$/.exec(ref); return m ? { c: colIdx(m[1]), r: +m[2] } : null; }

  // ---------- XML ----------
  function dec(s) { return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&'); }
  function enc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function getAttr(attrs, name) { var m = new RegExp('\\b' + name + '="([^"]*)"').exec(attrs); return m ? m[1] : null; }
  function setAttr(attrs, name, val) {
    var re = new RegExp('\\s' + name + '="[^"]*"');
    if (val === null) return attrs.replace(re, '');
    return re.test(attrs) ? attrs.replace(re, function () { return ' ' + name + '="' + val + '"'; }) : attrs + ' ' + name + '="' + val + '"';
  }

  // ---------- Décalage de formule (comme une copie Excel) ----------
  // Les références relatives (sans $) bougent de dRow / dCol ; chaînes "..." et noms d'onglets intacts.
  var REF_RE = /(\$?)([A-Z]{1,3})(\$?)(\d{1,7})(?![A-Za-z0-9_(])/g;
  function shiftFormula(f, dRow, dCol) {
    if (!dRow && !dCol) return f;
    var out = '', i = 0;
    while (i < f.length) {
      var ch = f[i];
      if (ch === '"') { var j = f.indexOf('"', i + 1); while (j !== -1 && f[j + 1] === '"') j = f.indexOf('"', j + 2); j = j === -1 ? f.length : j + 1; out += f.slice(i, j); i = j; continue; }
      if (ch === "'") { var k = f.indexOf("'", i + 1); while (k !== -1 && f[k + 1] === "'") k = f.indexOf("'", k + 2); k = k === -1 ? f.length : k + 1; out += f.slice(i, k); i = k; continue; }
      // segment jusqu'à la prochaine chaîne ou nom d'onglet entre apostrophes
      var next = f.length;
      var q1 = f.indexOf('"', i), q2 = f.indexOf("'", i);
      if (q1 !== -1) next = Math.min(next, q1);
      if (q2 !== -1) next = Math.min(next, q2);
      var seg = f.slice(i, next);
      out += seg.replace(REF_RE, function (all, dc, c, dr, r, off, s) {
        var prev = off > 0 ? s[off - 1] : '';
        if (/[A-Za-z0-9_.]/.test(prev)) return all; // morceau d'un nom (Plage_FPA_2, LOG10…)
        var ci = colIdx(c), ri = +r;
        if (ci > 16384) return all;
        if (!dc) ci += dCol;
        if (!dr) ri += dRow;
        if (ci < 1 || ri < 1) return '#REF!';
        return dc + colStr(ci) + dr + ri;
      });
      i = next;
    }
    return out;
  }

  // Plages « A1:B2 C3 » : décalage de colonnes
  function shiftSqref(sqref, dCol) {
    return sqref.split(/\s+/).map(function (p) {
      return p.split(':').map(function (ref) { var s = splitRef(ref.replace(/\$/g, '')); return s ? colStr(s.c + dCol) + s.r : ref; }).join(':');
    }).join(' ');
  }
  function rangeCols(p) {
    var parts = p.replace(/\$/g, '').split(':'), a = splitRef(parts[0]), b = splitRef(parts[1] || parts[0]);
    return a && b ? { c1: a.c, r1: a.r, c2: b.c, r2: b.r } : null;
  }

  // ---------- Onglet ----------
  function Sheet(xml) {
    var i0 = xml.indexOf('<sheetData'), i1 = xml.indexOf('</sheetData>');
    if (i0 === -1) throw new Error('sheetData absent');
    var openEnd = xml.indexOf('>', i0) + 1;
    this.head = xml.slice(0, openEnd);
    this.tail = i1 === -1 ? xml.slice(openEnd).replace(/^/, '') : xml.slice(i1);
    var body = i1 === -1 ? '' : xml.slice(openEnd, i1);
    if (xml.slice(i0, openEnd).indexOf('/>') !== -1) { this.head = xml.slice(0, i0) + '<sheetData>'; this.tail = '</sheetData>' + xml.slice(openEnd); body = ''; }
    this.rows = {}; // r -> {attrs, cells: {c -> {attrs, inner}}}
    var shared = {}, children = [];
    var rowRe = /<row\b([^>]*?)(\/>|>([\s\S]*?)<\/row>)/g, m;
    while ((m = rowRe.exec(body))) {
      var r = +getAttr(m[1], 'r');
      var row = { attrs: setAttr(m[1], 'spans', null), cells: {} };
      var cellRe = /<c\b([^>]*?)(\/>|>([\s\S]*?)<\/c>)/g, cm;
      var inner = m[3] || '';
      while ((cm = cellRe.exec(inner))) {
        var ref = splitRef(getAttr(cm[1], 'r'));
        var cell = { attrs: cm[1], inner: cm[3] || '' };
        row.cells[ref.c] = cell;
        var fm = /<f\b([^>]*?)(\/>|>([\s\S]*?)<\/f>)/.exec(cell.inner);
        if (fm && getAttr(fm[1], 't') === 'shared') {
          var si = getAttr(fm[1], 'si');
          if (fm[3] !== undefined && fm[3] !== '') shared[si] = { r: r, c: ref.c, f: dec(fm[3]) };
          children.push({ cell: cell, si: si, r: r, c: ref.c });
        }
      }
      this.rows[r] = row;
    }
    // Formules partagées -> formules ordinaires (indispensable pour recopier des colonnes)
    children.forEach(function (ch) {
      var mst = shared[ch.si];
      if (!mst) return;
      var f = shiftFormula(mst.f, ch.r - mst.r, ch.c - mst.c);
      // remplacement par fonction : « $1 » dans une formule (C$102…) serait sinon interprété
      ch.cell.inner = ch.cell.inner.replace(/<f\b[^>]*?(\/>|>[\s\S]*?<\/f>)/, function () { return '<f>' + enc(f) + '</f>'; });
    });
  }

  Sheet.prototype.cell = function (ref) { var s = splitRef(ref); var row = this.rows[s.r]; return row ? row.cells[s.c] : null; };

  Sheet.prototype.text = function (ref) {
    var c = this.cell(ref);
    if (!c) return '';
    var t = getAttr(c.attrs, 't');
    if (t === 'inlineStr') { var m = /<t[^>]*>([\s\S]*?)<\/t>/.exec(c.inner); return m ? dec(m[1]) : ''; }
    var v = /<v>([\s\S]*?)<\/v>/.exec(c.inner);
    if (!v) return '';
    if (t === 's' && this.sharedStrings) return this.sharedStrings[+v[1]] || '';
    return dec(v[1]);
  };

  // Ligne d'un libellé (colonne A ou B), à partir de la ligne « depuis »
  Sheet.prototype.findRow = function (label, col, depuis) {
    var want = normLabel(label), rs = Object.keys(this.rows).map(Number).sort(function (a, b) { return a - b; });
    for (var i = 0; i < rs.length; i++) {
      if (depuis && rs[i] < depuis) continue;
      if (normLabel(this.text(col + rs[i])) === want) return rs[i];
    }
    return null;
  };

  // Écrit une valeur de saisie : nombre, texte ou vide ; le style du modèle est conservé, la formule retirée
  Sheet.prototype.set = function (ref, value) {
    var s = splitRef(ref);
    var row = this.rows[s.r] || (this.rows[s.r] = { attrs: ' r="' + s.r + '"', cells: {} });
    var old = row.cells[s.c];
    var style = old ? getAttr(old.attrs, 's') : null;
    var attrs = ' r="' + ref + '"' + (style ? ' s="' + style + '"' : '');
    if (value === null || value === undefined || value === '') { row.cells[s.c] = { attrs: attrs, inner: '' }; return; }
    if (typeof value === 'number' && isFinite(value)) { row.cells[s.c] = { attrs: attrs, inner: '<v>' + value + '</v>' }; return; }
    row.cells[s.c] = { attrs: attrs + ' t="inlineStr"', inner: '<is><t xml:space="preserve">' + enc(value) + '</t></is>' };
  };

  // Écrit une formule (sans « = »), style du modèle conservé ; Excel la calcule à l'ouverture
  Sheet.prototype.setFormula = function (ref, formule) {
    var s = splitRef(ref);
    var row = this.rows[s.r] || (this.rows[s.r] = { attrs: ' r="' + s.r + '"', cells: {} });
    var old = row.cells[s.c];
    var style = old ? getAttr(old.attrs, 's') : null;
    row.cells[s.c] = { attrs: ' r="' + ref + '"' + (style ? ' s="' + style + '"' : ''), inner: '<f>' + enc(formule) + '</f>' };
  };

  Sheet.prototype.hideRows = function (r1, r2, hidden) {
    for (var r = r1; r <= r2; r++) {
      var row = this.rows[r] || (this.rows[r] = { attrs: ' r="' + r + '"', cells: {} });
      row.attrs = setAttr(row.attrs, 'hidden', hidden ? '1' : null);
    }
  };

  // Dernière colonne utilisée sur une ligne
  Sheet.prototype.lastCol = function (r) {
    var row = this.rows[r]; if (!row) return 0;
    var cs = Object.keys(row.cells).map(Number).filter(function (c) { var cell = row.cells[c]; return cell.inner && /<(v|f|is)\b/.test(cell.inner); });
    return cs.length ? Math.max.apply(null, cs) : 0;
  };

  // Recopie des colonnes [src, src+width-1] vers dest (comme Columns("C:H").Copy Columns(k))
  Sheet.prototype.copyColumns = function (src, width, dest) {
    var d = dest - src, self = this;
    Object.keys(this.rows).forEach(function (r) {
      var row = self.rows[r];
      for (var c = src; c < src + width; c++) {
        var cell = row.cells[c];
        if (!cell) { delete row.cells[c + d]; continue; }
        var inner = cell.inner.replace(/<f\b([^>]*?)>([\s\S]*?)<\/f>/, function (all, fa, ft) {
          return '<f>' + enc(shiftFormula(dec(ft), 0, d)) + '</f>';
        });
        if (/<f>/.test(inner)) inner = inner.replace(/<v>[\s\S]*?<\/v>/, ''); // valeur en cache périmée
        row.cells[c + d] = { attrs: setAttr(cell.attrs, 'r', colStr(c + d) + r), inner: inner };
      }
    });
    this._extendRanges(src, width, d);
    this._extendCols(src, width, d);
  };

  Sheet.prototype._extendRanges = function (src, width, d) {
    var c2src = src + width - 1;
    function extend(sqref) {
      var add = [];
      sqref.split(/\s+/).forEach(function (p) {
        var rc = rangeCols(p); if (!rc) return;
        var a = Math.max(rc.c1, src), b = Math.min(rc.c2, c2src);
        if (a > b) return;
        add.push(colStr(a + d) + rc.r1 + (a + d !== b + d || rc.r1 !== rc.r2 ? ':' + colStr(b + d) + rc.r2 : ''));
      });
      return add.length ? sqref + ' ' + add.join(' ') : sqref;
    }
    var t = this.tail;
    t = t.replace(/(<dataValidation\b[^>]*?\ssqref=")([^"]*)(")/g, function (all, a, s, b) { return a + extend(s) + b; });
    t = t.replace(/(<conditionalFormatting\b[^>]*?\ssqref=")([^"]*)(")/g, function (all, a, s, b) { return a + extend(s) + b; });
    t = t.replace(/(<xm:sqref>)([^<]*)(<\/xm:sqref>)/g, function (all, a, s, b) { return a + extend(s) + b; });
    // Fusions : copie des fusions du bloc ; les en-têtes qui finissent au bord du bloc s'allongent
    var merges = [];
    t = t.replace(/<mergeCell ref="([^"]+)"\s*\/>/g, function (all, ref) {
      var rc = rangeCols(ref);
      if (rc && rc.c1 >= src && rc.c2 <= c2src) merges.push(colStr(rc.c1 + d) + rc.r1 + ':' + colStr(rc.c2 + d) + rc.r2);
      // en-tête (titre, préleveur, site) fusionné jusqu'à la dernière colonne : suit l'ajout en bout
      else if (rc && rc.c1 < src && rc.c2 === src + d - 1) return '<mergeCell ref="' + colStr(rc.c1) + rc.r1 + ':' + colStr(src + d + width - 1) + rc.r2 + '"/>';
      return all;
    });
    if (merges.length) {
      t = t.replace(/<\/mergeCells>/, merges.map(function (r) { return '<mergeCell ref="' + r + '"/>'; }).join('') + '</mergeCells>');
      t = t.replace(/(<mergeCells\b[^>]*?count=")(\d+)(")/, function (all, a, n, b) { return a + (+n + merges.length) + b; });
    }
    this.tail = t;
  };

  Sheet.prototype._extendCols = function (src, width, d) {
    var m = /<cols>([\s\S]*?)<\/cols>/.exec(this.head);
    if (!m) return;
    var per = {}, colRe = /<col\b([^>]*?)\/>/g, cm;
    while ((cm = colRe.exec(m[1]))) {
      var a = +getAttr(cm[1], 'min'), b = +getAttr(cm[1], 'max');
      for (var c = a; c <= Math.min(b, a + 300); c++) per[c] = cm[1];
    }
    for (var c2 = src; c2 < src + width; c2++) if (per[c2]) per[c2 + d] = per[c2];
    var keys = Object.keys(per).map(Number).sort(function (x, y) { return x - y; }), out = '';
    keys.forEach(function (c) { out += '<col' + setAttr(setAttr(per[c], 'min', String(c)), 'max', String(c)) + '/>'; });
    this.head = this.head.replace(m[0], function () { return '<cols>' + out + '</cols>'; });
  };

  // Supprime les colonnes au-delà de « dernière » (blocs en trop en bout d'onglet, comme « Supprimer GEH » :
  // rien n'est à droite, aucune formule à décaler)
  Sheet.prototype.truncateColumns = function (derniere) {
    var self = this;
    Object.keys(this.rows).forEach(function (r) {
      Object.keys(self.rows[r].cells).forEach(function (c) { if (+c > derniere) delete self.rows[r].cells[c]; });
    });
    function trim(sqref) {
      return sqref.split(/\s+/).map(function (p) {
        var rc = rangeCols(p); if (!rc) return p;
        if (rc.c1 > derniere) return '';
        if (rc.c2 > derniere) return colStr(rc.c1) + rc.r1 + ':' + colStr(derniere) + rc.r2;
        return p;
      }).filter(Boolean).join(' ');
    }
    this._remapRanges(trim);
  };

  // Retire des colonnes et des lignes d'un onglet SANS formules (synthèse Véolia), en décalant le reste
  Sheet.prototype.removeRowsCols = function (colsSuppr, rowsSuppr) {
    var cs = (colsSuppr || []).slice().sort(function (a, b) { return a - b; }), rs = (rowsSuppr || []).slice().sort(function (a, b) { return a - b; });
    function nc(c) { if (cs.indexOf(c) !== -1) return null; var n = 0; cs.forEach(function (x) { if (x < c) n++; }); return c - n; }
    function nr(r) { if (rs.indexOf(r) !== -1) return null; var n = 0; rs.forEach(function (x) { if (x < r) n++; }); return r - n; }
    this._nc = nc; this._nr = nr;
    var rows = {}, self = this;
    Object.keys(this.rows).forEach(function (r) {
      var r2 = nr(+r); if (r2 === null) return;
      var row = self.rows[r], cells = {};
      Object.keys(row.cells).forEach(function (c) {
        var c2 = nc(+c); if (c2 === null) return;
        var cell = row.cells[c];
        cells[c2] = { attrs: setAttr(cell.attrs, 'r', colStr(c2) + r2), inner: cell.inner };
      });
      rows[r2] = { attrs: setAttr(row.attrs, 'r', String(r2)), cells: cells };
    });
    this.rows = rows;
    function remap(sqref) {
      return sqref.split(/\s+/).map(function (p) {
        var rc = rangeCols(p); if (!rc) return p;
        var c1 = rc.c1, c2 = rc.c2, r1 = rc.r1, r2 = rc.r2;
        while (c1 <= c2 && nc(c1) === null) c1++;
        while (c2 >= c1 && nc(c2) === null) c2--;
        while (r1 <= r2 && nr(r1) === null) r1++;
        while (r2 >= r1 && nr(r2) === null) r2--;
        if (c1 > c2 || r1 > r2) return '';
        return colStr(nc(c1)) + nr(r1) + (c1 !== c2 || r1 !== r2 ? ':' + colStr(nc(c2)) + nr(r2) : '');
      }).filter(Boolean).join(' ');
    }
    this._remapRanges(remap);
    // largeurs de colonnes
    var m = /<cols>([\s\S]*?)<\/cols>/.exec(this.head);
    if (m) {
      var per = {}, re = /<col\b([^>]*?)\/>/g, cm;
      while ((cm = re.exec(m[1]))) {
        var a = +getAttr(cm[1], 'min'), b = Math.min(+getAttr(cm[1], 'max'), 1000);
        for (var c = a; c <= b; c++) { var c2 = nc(c); if (c2 !== null) per[c2] = cm[1]; }
      }
      var out = '';
      Object.keys(per).map(Number).sort(function (x, y) { return x - y; }).forEach(function (c) { out += '<col' + setAttr(setAttr(per[c], 'min', String(c)), 'max', String(c)) + '/>'; });
      this.head = this.head.replace(m[0], function () { return out ? '<cols>' + out + '</cols>' : ''; });
    }
  };

  // Applique une transformation à toutes les plages (fusions, listes, mises en forme conditionnelles)
  Sheet.prototype._remapRanges = function (fn) {
    var t = this.tail;
    t = t.replace(/(<dataValidation\b[^>]*?\ssqref=")([^"]*)(")/g, function (all, a, s, b) { return a + fn(s) + b; });
    t = t.replace(/(<conditionalFormatting\b[^>]*?\ssqref=")([^"]*)(")/g, function (all, a, s, b) { return a + fn(s) + b; });
    t = t.replace(/(<xm:sqref>)([^<]*)(<\/xm:sqref>)/g, function (all, a, s, b) { return a + fn(s) + b; });
    // éléments devenus vides : retirés
    t = t.replace(/<dataValidation\b[^>]*?\ssqref=""[^>]*?(\/>|>[\s\S]*?<\/dataValidation>)/g, '');
    t = t.replace(/<conditionalFormatting\b[^>]*?\ssqref=""[^>]*?>[\s\S]*?<\/conditionalFormatting>/g, '');
    var n = 0;
    t = t.replace(/<mergeCell ref="([^"]+)"\s*\/>/g, function (all, ref) {
      var r = fn(ref);
      if (!r || r.indexOf(':') === -1) return '';
      n++; return '<mergeCell ref="' + r + '"/>';
    });
    t = t.replace(/(<mergeCells\b[^>]*?count=")(\d+)(")/, function (all, a, x, b) { return a + n + b; });
    t = t.replace(/<mergeCells\b[^>]*?count="0"[^>]*>\s*<\/mergeCells>/, '');
    t = t.replace(/(<dataValidations\b[^>]*?count=")(\d+)(")/, function (all, a, x, b) { return a + ((t.match(/<dataValidation\b/g) || []).length) + b; });
    this.tail = t;
  };

  Sheet.prototype.toXml = function () {
    var self = this, rs = Object.keys(this.rows).map(Number).sort(function (a, b) { return a - b; });
    var maxR = 1, maxC = 1, body = '';
    rs.forEach(function (r) {
      var row = self.rows[r], cs = Object.keys(row.cells).map(Number).sort(function (a, b) { return a - b; });
      var inner = '';
      cs.forEach(function (c) {
        var cell = row.cells[c];
        inner += cell.inner ? '<c' + cell.attrs + '>' + cell.inner + '</c>' : '<c' + cell.attrs + '/>';
        if (c > maxC) maxC = c;
      });
      if (r > maxR) maxR = r;
      body += inner ? '<row' + row.attrs + '>' + inner + '</row>' : '<row' + row.attrs + '/>';
    });
    var head = this.head.replace(/<dimension ref="[^"]*"\s*\/>/, '<dimension ref="A1:' + colStr(maxC) + maxR + '"/>');
    return head + body + this.tail;
  };

  function normLabel(s) { return String(s || '').replace(/[’]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase(); }

  // ---------- Classeur ----------
  function Classeur(zip) { this.zip = zip; this.sheets = {}; this.paths = {}; }

  Classeur.charger = function (data, JSZipImpl) {
    var Z = JSZipImpl || root.JSZip;
    return Z.loadAsync(data).then(function (zip) {
      var c = new Classeur(zip);
      return Promise.all([zip.file('xl/workbook.xml').async('string'), zip.file('xl/_rels/workbook.xml.rels').async('string'),
        zip.file('xl/sharedStrings.xml') ? zip.file('xl/sharedStrings.xml').async('string') : Promise.resolve('')]).then(function (res) {
        c.workbookXml = res[0];
        var rels = {}, rm, relRe = /<Relationship\b([^>]*?)\/>/g;
        while ((rm = relRe.exec(res[1]))) rels[getAttr(rm[1], 'Id')] = getAttr(rm[1], 'Target');
        var sm, sRe = /<sheet\b([^>]*?)\/>/g;
        while ((sm = sRe.exec(c.workbookXml))) {
          var t = rels[getAttr(sm[1], 'r:id')];
          c.paths[dec(getAttr(sm[1], 'name'))] = 'xl/' + t.replace(/^\/?xl\//, '');
        }
        c.relsXml = res[1];
        c.sharedStrings = [];
        var si, siRe = /<si>([\s\S]*?)<\/si>/g;
        while ((si = siRe.exec(res[2]))) {
          var txt = '', tm, tRe = /<t[^>]*>([\s\S]*?)<\/t>/g;
          while ((tm = tRe.exec(si[1]))) txt += dec(tm[1]);
          c.sharedStrings.push(txt);
        }
        return c;
      });
    });
  };

  Classeur.prototype.onglet = function (nom) {
    var self = this;
    if (this.sheets[nom]) return Promise.resolve(this.sheets[nom]);
    var p = this.paths[nom];
    if (!p) return Promise.reject(new Error('Onglet absent du modèle : ' + nom));
    return this.zip.file(p).async('string').then(function (xml) {
      var s = new Sheet(xml); s.sharedStrings = self.sharedStrings; self.sheets[nom] = s; return s;
    });
  };

  // ---------- Copie d'onglet (bouton « Ajouter onglet » : ActiveSheet.Copy) ----------
  function dirOf(p) { return p.slice(0, p.lastIndexOf('/') + 1); }
  function relsPath(p) { return dirOf(p) + '_rels/' + p.slice(p.lastIndexOf('/') + 1) + '.rels'; }
  function resolve(base, target) {
    if (target.charAt(0) === '/') return target.slice(1);
    var parts = dirOf(base).split('/').filter(Boolean);
    target.split('/').forEach(function (s) { if (s === '..') parts.pop(); else if (s !== '.') parts.push(s); });
    return parts.join('/');
  }
  function relative(from, to) {
    var a = dirOf(from).split('/').filter(Boolean), b = to.split('/');
    var i = 0; while (i < a.length && i < b.length - 1 && a[i] === b[i]) i++;
    var up = a.length - i, out = [];
    for (var k = 0; k < up; k++) out.push('..');
    return out.concat(b.slice(i)).join('/');
  }

  // Nouveau nom libre dans le même dossier : drawing14.xml -> drawing34.xml
  Classeur.prototype._nomLibre = function (path) {
    var m = /^(.*\/)([A-Za-z]+)(\d*)(\.[a-z]+)$/.exec(path);
    var dir = m[1], pre = m[2], ext = m[4], max = 0;
    var re = new RegExp('^' + dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + pre + '(\\d+)' + ext.replace('.', '\\.') + '$');
    Object.keys(this.zip.files).forEach(function (f) { var mm = re.exec(f); if (mm && +mm[1] > max) max = +mm[1]; });
    if (this._reserves) this._reserves.forEach(function (f) { var mm = re.exec(f); if (mm && +mm[1] > max) max = +mm[1]; });
    var n = dir + pre + (max + 1) + ext;
    (this._reserves = this._reserves || []).push(n);
    return n;
  };

  // Copie une partie (et ses dépendances, sauf les images partagées) ; renvoie le nouveau chemin
  Classeur.prototype._copierPartie = function (path, ct) {
    var self = this, zip = this.zip;
    if (/^xl\/media\//.test(path)) return Promise.resolve({ path: path, ct: ct });
    var neuf = this._nomLibre(path);
    var isText = /\.(xml|vml|rels)$/.test(path);
    return zip.file(path).async(isText ? 'string' : 'uint8array').then(function (data) {
      if (/\.vml$/.test(path)) data = self._renumeroterVml(data);
      zip.file(neuf, data);
      // Override de type de contenu, si la partie d'origine en avait un
      var om = new RegExp('<Override\\b[^>]*PartName="/' + path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[^>]*/>').exec(ct);
      if (om) ct = ct.replace('</Types>', function () { return om[0].replace(/PartName="[^"]*"/, 'PartName="/' + neuf + '"') + '</Types>'; });
      var rp = relsPath(path);
      if (!zip.file(rp)) return { path: neuf, ct: ct };
      return zip.file(rp).async('string').then(function (rels) {
        var liste = [], m, re = /<Relationship\b([^>]*?)\/>/g;
        while ((m = re.exec(rels))) liste.push(m[1]);
        var chain = Promise.resolve(), out = rels;
        liste.forEach(function (a) {
          if (getAttr(a, 'TargetMode') === 'External') return;
          chain = chain.then(function () {
            var cible = resolve(path, getAttr(a, 'Target'));
            if (!zip.file(cible)) return;
            return self._copierPartie(cible, ct).then(function (r) {
              ct = r.ct;
              var nouvelleCible = relative(neuf, r.path);
              out = out.replace('Target="' + getAttr(a, 'Target') + '"', function () { return 'Target="' + nouvelleCible + '"'; });
            });
          });
        });
        return chain.then(function () { zip.file(relsPath(neuf), out); return { path: neuf, ct: ct }; });
      });
    });
  };

  // Commentaires (VML) : identifiants de formes uniques dans le classeur, sinon Excel répare le fichier
  Classeur.prototype._renumeroterVml = function (vml) {
    var m = /<o:idmap\b[^>]*data="(\d+)/.exec(vml);
    if (!m) return vml;
    // plage haute (1001, 1002…), hors de celles des onglets du modèle
    this._idmapN = (this._idmapN || 1000) + 1;
    var ancien = +m[1], neuf = this._idmapN, dec = (neuf - ancien) * 1024;
    return vml.replace(/(<o:idmap\b[^>]*data=")(\d+)/, function (a, b) { return b + neuf; })
      .replace(/_x0000_s(\d+)/g, function (a, n) { return '_x0000_s' + (+n + dec); });
  };

  // Copie l'onglet « modele » sous le nom « nom », placé en fin de classeur
  Classeur.prototype.copierOnglet = function (modele, nom) {
    var self = this, zip = this.zip, src = this.paths[modele];
    if (!src) return Promise.reject(new Error('Onglet modèle absent : ' + modele));
    if (this.paths[nom]) return Promise.reject(new Error('Onglet déjà présent : ' + nom));
    return (this._ct ? Promise.resolve(this._ct) : zip.file('[Content_Types].xml').async('string')).then(function (ct) {
      // l'onglet modèle peut avoir déjà été modifié en mémoire : on part de son XML d'origine
      return self._copierPartie(src, ct);
    }).then(function (r) {
      self._ct = r.ct;
      self.paths[nom] = r.path;
      // classeur : nouvelle relation et nouvel onglet
      var ids = [], m, re = /Id="rId(\d+)"/g;
      while ((m = re.exec(self.relsXml))) ids.push(+m[1]);
      var rid = 'rId' + (Math.max.apply(null, ids) + 1);
      self.relsXml = self.relsXml.replace('</Relationships>', function () {
        return '<Relationship Id="' + rid + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="' + r.path.replace(/^xl\//, '') + '"/></Relationships>';
      });
      var sids = [], sre = /sheetId="(\d+)"/g, sm;
      while ((sm = sre.exec(self.workbookXml))) sids.push(+sm[1]);
      self.workbookXml = self.workbookXml.replace('</sheets>', function () {
        return '<sheet name="' + enc(nom) + '" sheetId="' + (Math.max.apply(null, sids) + 1) + '" r:id="' + rid + '"/></sheets>';
      });
      return zip.file(r.path).async('string');
    }).then(function (xml) {
      xml = xml.replace(/\stabSelected="1"/, '');
      var s = new Sheet(xml); s.sharedStrings = self.sharedStrings; self.sheets[nom] = s;
      return s;
    });
  };

  // Ordre des onglets dans le classeur (indices utilisés par les noms définis locaux)
  Classeur.prototype._ordre = function () {
    var out = [], m, re = /<sheet\b([^>]*?)\/>/g;
    while ((m = re.exec(this.workbookXml))) out.push(dec(getAttr(m[1], 'name')));
    return out;
  };

  // Supprime un onglet (macro Véolia : modèles génériques retirés). Ses dépendances (dessins, commentaires)
  // restent dans l'archive sans référence, ce qu'Excel accepte.
  Classeur.prototype.supprimerOnglet = function (nom) {
    var ordre = this._ordre(), idx = ordre.indexOf(nom);
    if (idx === -1) return;
    var self = this, path = this.paths[nom];
    var sm = new RegExp('<sheet\\b[^>]*?name="' + enc(nom).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[^>]*?/>').exec(this.workbookXml);
    var rid = getAttr(sm[0], 'r:id');
    this.workbookXml = this.workbookXml.replace(sm[0], '');
    // noms définis propres à l'onglet supprimé ; indices suivants décalés
    this.workbookXml = this.workbookXml.replace(/<definedName\b([^>]*?)>([\s\S]*?)<\/definedName>/g, function (all, a, v) {
      var l = getAttr(a, 'localSheetId');
      if (l === null) return all;
      if (+l === idx) return '';
      if (+l > idx) return '<definedName' + setAttr(a, 'localSheetId', String(+l - 1)) + '>' + v + '</definedName>';
      return all;
    });
    this.workbookXml = this.workbookXml.replace(/(<workbookView\b[^>]*?)\sactiveTab="\d+"/, '$1 activeTab="0"').replace(/(<workbookView\b[^>]*?)\sfirstSheet="\d+"/, '$1');
    this.relsXml = this.relsXml.replace(new RegExp('<Relationship\\b[^>]*?Id="' + rid + '"[^>]*?/>'), '');
    this.zip.remove(path);
    if (this.zip.file(relsPath(path))) this.zip.remove(relsPath(path));
    delete this.sheets[nom]; delete this.paths[nom];
    var p = this._ct ? Promise.resolve(this._ct) : this.zip.file('[Content_Types].xml').async('string');
    return p.then(function (ct) { self._ct = ct.replace(new RegExp('<Override\\b[^>]*PartName="/' + path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[^>]*/>'), ''); });
  };

  Classeur.prototype.renommerOnglet = function (ancien, nouveau) {
    this.workbookXml = this.workbookXml.replace('name="' + enc(ancien) + '"', function () { return 'name="' + enc(nouveau) + '"'; });
    this.paths[nouveau] = this.paths[ancien]; delete this.paths[ancien];
    if (this.sheets[ancien]) { this.sheets[nouveau] = this.sheets[ancien]; delete this.sheets[ancien]; }
  };

  // Masque des onglets (clic droit › Afficher pour les retrouver dans Excel)
  Classeur.prototype.masquerOnglets = function (noms) {
    var self = this;
    noms.forEach(function (nom) {
      var re = new RegExp('<sheet\\b([^>]*?\\sname="' + enc(nom).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[^>]*?)/>');
      self.workbookXml = self.workbookXml.replace(re, function (all, a) { return '<sheet' + setAttr(a, 'state', 'hidden') + '/>'; });
    });
  };

  // Onglet affiché à l'ouverture : un seul onglet sélectionné, jamais un onglet masqué
  Classeur.prototype.activerOnglet = function (nom) {
    var self = this, ordre = this._ordre(), idx = ordre.indexOf(nom);
    if (idx === -1) return Promise.resolve();
    // seuls l'onglet actif d'origine (activeTab) et le nouveau portent tabSelected : inutile de décompresser les autres
    var vue = /<workbookView\b([^>]*?)\/>/.exec(this.workbookXml), ancien = ordre[+((vue && getAttr(vue[1], 'activeTab')) || 0)];
    this.workbookXml = this.workbookXml.replace(/<workbookView\b([^>]*?)\/>/, function (all, a) {
      return '<workbookView' + setAttr(setAttr(a, 'firstSheet', null), 'activeTab', String(idx)) + '/>';
    });
    var fix = function (x, actif) {
      x = x.replace(/(<sheetView\b[^>]*?)\stabSelected="1"/g, '$1');
      return actif ? x.replace(/<sheetView\b/, '<sheetView tabSelected="1"') : x;
    };
    return Promise.all(ordre.map(function (n) {
      if (self.sheets[n]) { self.sheets[n].head = fix(self.sheets[n].head, n === nom); return null; }
      if (n !== nom && n !== ancien) return null;
      var p = self.paths[n];
      if (!p || !self.zip.file(p)) return null;
      // réécrit seulement s'il change : un onglet réécrit est recompressé par generer (export bien plus lent)
      return self.zip.file(p).async('string').then(function (x) { var y = fix(x, n === nom); if (y !== x) self.zip.file(p, y); });
    }));
  };

  // Onglets visibles (ni hidden ni veryHidden), dans l'ordre du classeur
  Classeur.prototype.ongletsVisibles = function () {
    var out = [], m, re = /<sheet\b([^>]*?)\/>/g;
    while ((m = re.exec(this.workbookXml))) if (!getAttr(m[1], 'state')) out.push(dec(getAttr(m[1], 'name')));
    return out;
  };

  // Commentaires d'un onglet dont on a retiré lignes/colonnes (removeRowsCols) : décalés ou supprimés
  Classeur.prototype.recalerCommentaires = function (nom) {
    var self = this, s = this.sheets[nom], path = this.paths[nom], rp = relsPath(path);
    if (!s || !s._nc || !this.zip.file(rp)) return Promise.resolve();
    return this.zip.file(rp).async('string').then(function (rels) {
      var cible = function (type) { var m = new RegExp('<Relationship\\b[^>]*?Type="[^"]*/' + type + '"[^>]*?/>').exec(rels); return m ? resolve(path, getAttr(m[0], 'Target')) : null; };
      var pc = cible('comments'), pv = cible('vmlDrawing'), tasks = [];
      if (pc && self.zip.file(pc)) tasks.push(self.zip.file(pc).async('string').then(function (x) {
        x = x.replace(/<comment ref="([A-Z]+)(\d+)"([\s\S]*?)<\/comment>/g, function (all, c, r, rest) {
          var c2 = s._nc(colIdx(c)), r2 = s._nr(+r);
          return c2 === null || r2 === null ? '' : '<comment ref="' + colStr(c2) + r2 + '"' + rest + '</comment>';
        });
        self.zip.file(pc, x);
      }));
      if (pv && self.zip.file(pv)) tasks.push(self.zip.file(pv).async('string').then(function (x) {
        x = x.replace(/<v:shape\b[\s\S]*?<\/v:shape>/g, function (sh) {
          var r = /<x:Row>(\d+)<\/x:Row>/.exec(sh), c = /<x:Column>(\d+)<\/x:Column>/.exec(sh);
          if (!r || !c) return sh;
          var c2 = s._nc(+c[1] + 1), r2 = s._nr(+r[1] + 1);
          if (c2 === null || r2 === null) return '';
          return sh.replace(/<x:Row>\d+<\/x:Row>/, '<x:Row>' + (r2 - 1) + '</x:Row>').replace(/<x:Column>\d+<\/x:Column>/, '<x:Column>' + (c2 - 1) + '</x:Column>');
        });
        self.zip.file(pv, x);
      }));
      return Promise.all(tasks);
    });
  };

  // Écrit les onglets modifiés, retire calcChain et force le recalcul à l'ouverture
  Classeur.prototype.generer = function (type) {
    var self = this, zip = this.zip;
    Object.keys(this.sheets).forEach(function (nom) { zip.file(self.paths[nom], self.sheets[nom].toXml()); });
    if (zip.file('xl/calcChain.xml')) {
      zip.remove('xl/calcChain.xml');
      this.relsXml = this.relsXml.replace(/<Relationship\b[^>]*?Target="[^"]*calcChain\.xml"[^>]*?\/>/, '');
    }
    zip.file('xl/_rels/workbook.xml.rels', this.relsXml);
    var wb = this.workbookXml.replace(/<calcPr\b([^>]*?)\/>/, function (all, a) { return '<calcPr' + setAttr(a, 'fullCalcOnLoad', '1') + '/>'; });
    zip.file('xl/workbook.xml', wb);
    return (this._ct ? Promise.resolve(this._ct) : zip.file('[Content_Types].xml').async('string')).then(function (ct) {
      zip.file('[Content_Types].xml', ct.replace(/<Override\b[^>]*?PartName="\/xl\/calcChain\.xml"[^>]*?\/>/, ''));
      return zip.generateAsync({ type: type || 'blob', compression: 'DEFLATE', mimeType: 'application/vnd.ms-excel.sheet.macroEnabled.12' });
    });
  };

  var api = { Classeur: Classeur, Sheet: Sheet, shiftFormula: shiftFormula, colIdx: colIdx, colStr: colStr, normLabel: normLabel };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.XlsmMoteur = api;
})(typeof window !== 'undefined' ? window : this);
