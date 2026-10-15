// docx-moteur.js - Lecture / modification d'un document Word (.docx) dans le navigateur
// © 2025 Quentin THOMAS
//
// Sert au rapport pré-rempli depuis la trame (rapport.js). Même principe que xlsm-moteur.js : l'archive est
// ouverte avec JSZip, les parties XML sont lues en arbre (petit analyseur sans dépendance, valable aussi sous
// Node pour les tests) puis réécrites telles quelles, seules les parties modifiées changent.
//   - signets : plage entre <w:bookmarkStart> et <w:bookmarkEnd> (comme Selection.GoTo de la macro)
//   - supprimer(signet) : efface la plage comme Selection.Delete de Word (paragraphes fusionnés au besoin)
//   - ecrire(signet, texte) : comme Selection.TypeText à l'emplacement du signet
//   - champs : champs de formulaire FORMTEXT / FORMCHECKBOX (texte affiché, remplacement par du texte simple)

(function (root) {
  'use strict';

  // ---------- Arbre XML ----------
  function decXml(s) { return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&'); }
  function encXml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function analyser(xml) {
    var racine = { name: '#doc', kids: [] }, pile = [racine], re = /<[^>]+>|[^<]+/g, m;
    while ((m = re.exec(xml))) {
      var t = m[0], haut = pile[pile.length - 1];
      if (t.charAt(0) !== '<') { haut.kids.push({ text: t, parent: haut }); continue; }
      if (t.charAt(1) === '?' || t.charAt(1) === '!') { haut.kids.push({ raw: t, parent: haut }); continue; }
      if (t.charAt(1) === '/') { pile.pop(); continue; }
      var auto = t.charAt(t.length - 2) === '/';
      var nm = /^<([^\s/>]+)/.exec(t)[1];
      var el = { name: nm, attrs: t.slice(1 + nm.length, auto ? -2 : -1), kids: [], parent: haut, auto: auto };
      haut.kids.push(el);
      if (!auto) pile.push(el);
    }
    return racine;
  }
  function serialiser(n) {
    if (n.text !== undefined) return n.text;
    if (n.raw !== undefined) return n.raw;
    var inner = n.kids.map(serialiser).join('');
    if (n.name === '#doc') return inner;
    if (n.auto && !n.kids.length) return '<' + n.name + n.attrs + '/>';
    return '<' + n.name + n.attrs + '>' + inner + '</' + n.name + '>';
  }
  function attr(n, nom) { var m = new RegExp('\\s' + nom.replace(':', '\\:') + '="([^"]*)"').exec(n.attrs || ''); return m ? decXml(m[1]) : null; }
  function el(name, attrs, kids) {
    var n = { name: name, attrs: attrs ? ' ' + attrs : '', kids: [], auto: !kids || !kids.length };
    (kids || []).forEach(function (k) { k.parent = n; n.kids.push(k); });
    return n;
  }
  function texteNode(v) { return { text: encXml(v) }; }
  function parcourir(n, fn) { if (fn(n) === false) return false; for (var i = 0; i < (n.kids || []).length; i++) if (parcourir(n.kids[i], fn) === false) return false; }
  function trouverTous(n, name) { var out = []; parcourir(n, function (x) { if (x.name === name) out.push(x); }); return out; }
  function enfant(n, name) { for (var i = 0; i < (n.kids || []).length; i++) if (n.kids[i].name === name) return n.kids[i]; return null; }
  function ancetre(n, name) { var p = n.parent; while (p && p.name !== name) p = p.parent; return p || null; }
  function retirer(n) { var p = n.parent; if (!p) return; var i = p.kids.indexOf(n); if (i !== -1) p.kids.splice(i, 1); n.parent = null; }
  function insererApres(ref, n) { var p = ref.parent, i = p.kids.indexOf(ref); n.parent = p; p.kids.splice(i + 1, 0, n); }
  function insererAvant(ref, n) { var p = ref.parent, i = p.kids.indexOf(ref); n.parent = p; p.kids.splice(i, 0, n); }
  function cloner(n) {
    if (n.text !== undefined) return { text: n.text };
    if (n.raw !== undefined) return { raw: n.raw };
    var c = { name: n.name, attrs: n.attrs, kids: [], auto: n.auto };
    n.kids.forEach(function (k) { var ck = cloner(k); ck.parent = c; c.kids.push(ck); });
    return c;
  }
  // Texte visible d'un nœud (w:t, tabulations), sans le code des champs
  function texte(n) {
    var s = '';
    parcourir(n, function (x) {
      if (x.name === 'w:t') s += decXml(x.kids.map(function (k) { return k.text || ''; }).join(''));
      else if (x.name === 'w:tab' && x.parent && x.parent.name === 'w:r') s += '\t';
      // w:instrText / w:delText ne contiennent pas de w:t : rien à exclure (et ne pas interrompre le parcours)
    });
    return s;
  }
  // Ordre de document : liste plate des nœuds (pré-ordre)
  function aplatir(n) { var out = []; parcourir(n, function (x) { out.push(x); }); return out; }

  // Run de texte simple, avec la mise en forme d'un run modèle
  function run(txt, rPrModele) {
    var kids = [];
    if (rPrModele) kids.push(cloner(rPrModele));
    String(txt).split('\n').forEach(function (ligne, i) {
      if (i) kids.push(el('w:br'));
      var parts = ligne.split('\t');
      parts.forEach(function (p, j) {
        if (j) kids.push(el('w:tab'));
        if (p) kids.push(el('w:t', 'xml:space="preserve"', [texteNode(p)]));
      });
    });
    return el('w:r', '', kids);
  }

  // ---------- Document ----------
  function Document(zip, parts) { this.zip = zip; this.parts = parts; this.arbres = {}; }

  Document.charger = function (data) {
    var J = root.JSZip || (typeof require === 'function' ? require('./jszip.min.js') : null);
    return J.loadAsync(data).then(function (zip) {
      var parts = Object.keys(zip.files).filter(function (n) { return /^word\/(document|header\d*|footer\d*|settings)\.xml$/.test(n); });
      var doc = new Document(zip, parts);
      return Promise.all(parts.map(function (p) { return zip.file(p).async('string').then(function (x) { doc.arbres[p] = analyser(x); }); })).then(function () { return doc; });
    });
  };

  Document.prototype.corps = function () { return this.arbres['word/document.xml']; };
  Document.prototype.pieds = function () { var self = this; return this.parts.filter(function (p) { return /footer|header/.test(p); }).map(function (p) { return self.arbres[p]; }); };

  // Signet : {debut, fin, arbre}
  Document.prototype.signet = function (nom) {
    var res = null, self = this, cle = String(nom).toLowerCase(); // Word : noms de signets sans casse
    Object.keys(this.arbres).some(function (p) {
      var a = self.arbres[p], d = null;
      parcourir(a, function (x) { if (x.name === 'w:bookmarkStart' && (attr(x, 'w:name') || '').toLowerCase() === cle) { d = x; return false; } });
      if (!d) return false;
      var id = attr(d, 'w:id'), f = null;
      parcourir(a, function (x) { if (x.name === 'w:bookmarkEnd' && attr(x, 'w:id') === id) { f = x; return false; } });
      res = { debut: d, fin: f, arbre: a };
      return true;
    });
    return res;
  };
  Document.prototype.existe = function (nom) { return !!this.signet(nom); };

  // Selection.Delete sur la plage du signet. Paragraphes entièrement couverts : retirés ; début et fin dans deux
  // paragraphes différents : le reste des deux est fusionné, avec la mise en forme du second (comme Word, où la
  // mise en forme est portée par la marque de fin du paragraphe conservé). Le signet lui-même disparaît.
  Document.prototype.supprimer = function (nom) {
    var s = this.signet(nom);
    if (!s || !s.fin) return false;
    var plat = aplatir(s.arbre), idx = new Map();
    plat.forEach(function (n, k) { idx.set(n, k); });
    var i0 = idx.get(s.debut), i1 = idx.get(s.fin);
    var dernierDesc = function (n) { while (n.kids && n.kids.length) n = n.kids[n.kids.length - 1]; return idx.get(n); };
    var contientFin = function (n) { var p = s.fin; while (p) { if (p === n) return true; p = p.parent; } return false; };
    var pD = ancetre(s.debut, 'w:p'), pF = ancetre(s.fin, 'w:p');
    // nœuds feuilles « porteurs de contenu » strictement entre les deux marques
    var aRetirer = [];
    for (var i = i0 + 1; i < i1; i++) {
      var x = plat[i];
      if (x.name === 'w:r' || x.name === 'w:hyperlink' || x.name === 'w:fldSimple' || x.name === 'w:tbl' || x.name === 'w:tr' || x.name === 'w:p' || x.name === 'w:sdt' || x.name === 'w:ins' || x.name === 'w:smartTag') {
        // le nœud est-il entièrement dans la plage ? (son dernier descendant avant i1, et pas un ancêtre des marques)
        var dernier = dernierDesc(x);
        if (dernier < i1 && !contientFin(x)) { aRetirer.push(x); i = dernier; }
      }
    }
    // repères d'autres signets dans la plage : comme Word, le signet dont un seul repère est effacé survit,
    // ce repère étant ramené au point de suppression (sinon un signet qui chevauche serait perdu)
    var reperes = {}, idsRetires = {};
    aRetirer.forEach(function (x) { parcourir(x, function (y) { if (y.name === 'w:bookmarkStart' || y.name === 'w:bookmarkEnd') { var id = attr(y, 'w:id'); (reperes[id] = reperes[id] || []).push(y); } }); });
    Object.keys(reperes).forEach(function (id) {
      if (reperes[id].length === 2) return; // signet entièrement dans la plage : effacé avec elle
      reperes[id].forEach(function (y) { retirer(y); insererAvant(s.fin, y); });
    });
    var tableaux = [];
    aRetirer.forEach(function (x) { var t = ancetre(x, 'w:tbl'); if (t && tableaux.indexOf(t) === -1) tableaux.push(t); retirer(x); });
    // plage qui s'arrête dans un tableau : lignes entièrement couvertes retirées, cellules vidées gardant
    // un paragraphe (Word refuse une cellule sans paragraphe), tableau sans ligne retiré
    tableaux.forEach(function (t) {
      if (!t.parent) return;
      parcourir(t, function (x) { if (x.name === 'w:tc' && !x.kids.some(function (k) { return k.name === 'w:p' || k.name === 'w:tbl'; })) { var p = el('w:p'); p.parent = x; x.kids.push(p); } });
      if (!t.kids.some(function (k) { return k.name === 'w:tr'; })) retirer(t);
    });
    if (pD && pF && pD !== pF && pD.parent && pF.parent) {
      // contenu de pF après la marque de fin rattaché à pD si pD garde du texte avant la marque de début,
      // sinon pD disparaît et pF reste (cas courant : plage qui commence en début de paragraphe)
      var avant = pD.kids.filter(function (k) { return k.name === 'w:r' || k.name === 'w:hyperlink' || k.name === 'w:fldSimple'; });
      if (avant.length) {
        var reste = pF.kids.filter(function (k) { return k.name !== 'w:pPr'; });
        var pprF = enfant(pF, 'w:pPr'), pprD = enfant(pD, 'w:pPr');
        if (pprD) retirer(pprD);
        if (pprF) { var c = cloner(pprF); c.parent = pD; pD.kids.unshift(c); }
        reste.forEach(function (k) { retirer(k); k.parent = pD; pD.kids.push(k); });
        retirer(pF);
      } else {
        // repères d'autres signets restés dans pD (avant la marque de début) : gardés au point de suppression
        pD.kids.filter(function (k) { return (k.name === 'w:bookmarkStart' || k.name === 'w:bookmarkEnd') && k !== s.debut; })
          .forEach(function (k) { retirer(k); insererAvant(s.fin, k); });
        retirer(pD);
      }
    }
    retirer(s.debut); if (s.fin) retirer(s.fin);
    return true;
  };

  // Lignes de tableau couvertes par le signet (Selection.Rows.Delete) ; tableau vide : retiré
  Document.prototype.supprimerLignes = function (nom) {
    var s = this.signet(nom);
    if (!s) return false;
    var tbl = ancetre(s.debut, 'w:tbl') || (s.debut.parent && s.debut.parent.name === 'w:body' ? null : null);
    if (!tbl) { var p = ancetre(s.debut, 'w:p'); if (p && p.parent) { var i = p.parent.kids.indexOf(p); for (var k = i + 1; k < p.parent.kids.length; k++) if (p.parent.kids[k].name === 'w:tbl') { tbl = p.parent.kids[k]; break; } } }
    if (!tbl) return false;
    var plat = aplatir(s.arbre), idx = new Map();
    plat.forEach(function (n, k) { idx.set(n, k); });
    var i0 = idx.get(s.debut), i1 = s.fin ? idx.get(s.fin) : i0;
    tbl.kids.filter(function (k) { return k.name === 'w:tr'; }).forEach(function (tr) {
      var d = aplatir(tr), a = idx.get(d[0]), b = idx.get(d[d.length - 1]);
      if (b >= i0 && a <= i1) retirer(tr);
    });
    if (!tbl.kids.some(function (k) { return k.name === 'w:tr'; })) retirer(tbl);
    if (s.debut.parent) retirer(s.debut); if (s.fin && s.fin.parent) retirer(s.fin);
    return true;
  };

  // Selection.TypeText à l'emplacement du signet : si le signet couvre du texte, il est remplacé
  Document.prototype.ecrire = function (nom, txt) {
    var s = this.signet(nom);
    if (!s) return false;
    var p = ancetre(s.debut, 'w:p'), modele = null;
    // mise en forme : run suivant la marque de début, sinon le précédent
    var plat = aplatir(p || s.arbre), i0 = plat.indexOf(s.debut);
    for (var i = i0 + 1; i < plat.length && !modele; i++) if (plat[i].name === 'w:r') modele = enfant(plat[i], 'w:rPr');
    for (var j = i0 - 1; j >= 0 && !modele; j--) if (plat[j].name === 'w:r') modele = enfant(plat[j], 'w:rPr');
    if (s.fin && texte({ kids: this._entre(s) }) !== '') {
      this._entre(s).forEach(retirer);
    }
    var lignes = String(txt).split('\n'), ref = s.debut, self = this;
    // plusieurs lignes : TypeParagraph de la macro -> nouveaux paragraphes avec la même mise en forme
    lignes.forEach(function (l, k) {
      if (k === 0) { var r0 = run(l, modele); insererApres(ref, r0); ref = r0; return; }
      var np = el('w:p', '', []), ppr = enfant(p, 'w:pPr');
      if (ppr) { var c = cloner(ppr); c.parent = np; np.kids.push(c); }
      var rr = run(l, modele); rr.parent = np; np.kids.push(rr);
      // la suite du paragraphe d'origine passe dans le nouveau paragraphe
      var apres = p.kids.slice(p.kids.indexOf(ref.parent === p ? ref : ref) + 1);
      apres.forEach(function (x) { retirer(x); x.parent = np; np.kids.push(x); });
      insererApres(p, np); p = np; ref = rr;
    });
    return true;
  };
  Document.prototype._entre = function (s) {
    var p = ancetre(s.debut, 'w:p');
    if (!p || ancetre(s.fin, 'w:p') !== p) return [];
    var i0 = p.kids.indexOf(s.debut), i1 = p.kids.indexOf(s.fin);
    if (i0 === -1 || i1 === -1) return [];
    return p.kids.slice(i0 + 1, i1).filter(function (k) { return k.name === 'w:r' || k.name === 'w:hyperlink' || k.name === 'w:fldSimple'; });
  };

  // ---------- Champs de formulaire ----------
  // Liste des champs complexes (fldChar begin … end) d'un arbre, dans l'ordre
  Document.prototype.champs = function (arbre) {
    var out = [], pile = [];
    parcourir(arbre || this.corps(), function (x) {
      if (x.name !== 'w:fldChar' && x.name !== 'w:instrText') return;
      var r = x.parent;
      if (x.name === 'w:instrText') { if (pile.length) pile[pile.length - 1].code += x.kids.map(function (k) { return k.text || ''; }).join(''); return; }
      var t = attr(x, 'w:fldCharType');
      if (t === 'begin') pile.push({ debut: r, code: '', sep: null, nom: (function () { var ff = enfant(x, 'w:ffData'), n = ff && enfant(ff, 'w:name'); return n ? attr(n, 'w:val') : null; })() });
      else if (t === 'separate' && pile.length) pile[pile.length - 1].sep = r;
      else if (t === 'end' && pile.length) { var c = pile.pop(); c.fin = r; c.code = c.code.trim(); c.type = c.code.split(/\s+/)[0].toUpperCase(); if (!pile.length) out.push(c); }
    });
    return out;
  };
  // Texte affiché par un champ
  Document.prototype.texteChamp = function (c) {
    var p = c.debut.parent, i0 = p.kids.indexOf(c.sep || c.debut), i1 = p.kids.indexOf(c.fin);
    if (i0 === -1 || i1 === -1) return '';
    return texte({ kids: p.kids.slice(i0 + 1, i1) });
  };
  // Remplace un champ par du texte simple (mise en forme du texte affiché par le champ)
  Document.prototype.remplacerChamp = function (c, txt) {
    var p = c.debut.parent, i0 = p.kids.indexOf(c.debut), i1 = p.kids.indexOf(c.fin);
    if (i0 === -1 || i1 === -1) return false; // champ à cheval sur plusieurs paragraphes : laissé tel quel
    var modele = null;
    var isep = c.sep ? p.kids.indexOf(c.sep) : i0;
    for (var i = isep + 1; i < i1 && !modele; i++) if (p.kids[i].name === 'w:r') modele = enfant(p.kids[i], 'w:rPr');
    if (!modele) modele = enfant(c.debut, 'w:rPr');
    if (modele) { modele = cloner(modele); modele.kids = modele.kids.filter(function (k) { return k.name !== 'w:noProof' && k.name !== 'w:shd' && k.name !== 'w:highlight'; }); }
    var morceaux = p.kids.slice(i0, i1 + 1);
    var r = run(txt, modele);
    insererAvant(c.debut, r);
    morceaux.forEach(retirer);
    return r;
  };

  // ---------- Images ----------
  // Image PNG ajoutée à l'archive ; renvoie un run w:drawing en ligne (largeur et hauteur en EMU)
  Document.prototype.chargerRelations = function () {
    var self = this;
    if (this.rels !== undefined) return Promise.resolve();
    var f = this.zip.file('word/_rels/document.xml.rels');
    return (f ? f.async('string') : Promise.resolve('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>'))
      .then(function (x) { self.rels = x; });
  };
  Document.prototype.imageRun = function (octets, cx, cy, titre) {
    var n = (this._nImages = (this._nImages || 0) + 1), max = 0;
    (this.rels.match(/Id="rId(\d+)"/g) || []).forEach(function (m) { max = Math.max(max, +/\d+/.exec(m)[0]); });
    var rid = 'rId' + (max + 1), nom = 'vlep-resultats-' + n + '.png';
    this.zip.file('word/media/' + nom, octets, { compression: 'STORE' }); // PNG déjà compressé
    this.rels = this.rels.replace('</Relationships>', '<Relationship Id="' + rid + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/' + nom + '"/></Relationships>');
    var id = 9000 + n, A = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"', P = 'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
    var xml = '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="' + cx + '" cy="' + cy + '"/><wp:effectExtent l="0" t="0" r="0" b="0"/>' +
      '<wp:docPr id="' + id + '" name="' + encXml(titre || nom) + '"/><wp:cNvGraphicFramePr><a:graphicFrameLocks ' + A + ' noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
      '<a:graphic ' + A + '><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic ' + P + '><pic:nvPicPr><pic:cNvPr id="' + id + '" name="' + nom + '"/><pic:cNvPicPr/></pic:nvPicPr>' +
      '<pic:blipFill><a:blip r:embed="' + rid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
    return analyser(xml).kids[0];
  };

  // ---------- Écriture ----------
  Document.prototype.generer = function (type) {
    var self = this;
    if (this.rels !== undefined) this.zip.file('word/_rels/document.xml.rels', this.rels);
    Object.keys(this.arbres).forEach(function (p) { self.zip.file(p, serialiser(self.arbres[p])); });
    return this.zip.generateAsync({ type: type || 'blob', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  };

  var api = {
    Document: Document, analyser: analyser, serialiser: serialiser, attr: attr, el: el, run: run, texte: texte,
    texteNode: texteNode, parcourir: parcourir, trouverTous: trouverTous, enfant: enfant, ancetre: ancetre,
    retirer: retirer, insererApres: insererApres, insererAvant: insererAvant, cloner: cloner, aplatir: aplatir, encXml: encXml
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.DocxMoteur = api;
})(typeof window !== 'undefined' ? window : this);
