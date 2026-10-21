// activite.js - Activité par GEH (annexe « Description des tâches » du rapport Word, voir rapport.js)
// © 2025 Quentin THOMAS
// L'ancien export « Activité (Word) » du menu ⋯ est retiré : le rapport Word reprend ces lignes en annexe.

// Lignes du tableau d'activité, par GEH ayant des prélèvements (annexe « Description des tâches » du rapport)
// [{ gehNum, gehNom, gehName, rows: [{ operateur, date, heures, duree, agents, vlep, epi, taches, ventEnv, ventGen, ventCapt }] }]
function activiteParGeh(m) {
  if (typeof missionRealisee === 'function') m = missionRealisee(m);
  var gehMap = {};
  var gehOrder = [];

  m.gehs.forEach(function(g) {
    if (!g.name) return;
    gehMap[g.id] = { gehNum: g.num, gehNom: g.name, gehName: g.num + ' - ' + g.name, rows: [] };
    gehOrder.push(g.id);
  });

  m.prelevements.forEach(function(p) {
    var gehId = p.gehId;
    if (!gehMap[gehId]) return;

    p.subPrelevements.forEach(function(sb) {
      // Agents : liste des noms séparés par " / "
      var agentNames = p.agents.map(function(a) { return a.name; }).join(' / ');

      // VLEP : "8h" ou "CT" selon le type de prélèvement
      var vlepStr = p.type === 'CT' ? 'CT' : '8h';

      // Date
      var dateStr = formatDateFR(sb.date) || '';

      // Plages horaires
      var plagesStr = '';
      // Prélèvement fractionné : plages de tous les supports, dans l'ordre
      var toutesPlages = expandSubSupports(sb).reduce(function(acc, s) { return acc.concat(s.plages || []); }, []);
      if (toutesPlages.length) {
        plagesStr = toutesPlages
          .filter(function(pl) { return pl.debut || pl.fin; })
          .map(function(pl) { return (pl.debut || '?') + ' - ' + (pl.fin || '?'); })
          .join(' / ');
      }

      // Tâches / activité = champ observations du sub-prélèvement
      var taches = sb.observations || sb.activite || '';

      // EPI : type + durée de port si concerné
      var epiStr = '';
      var epiType = (sb.epiType || '').trim();
      if (!epiType || epiType === 'sans objet') {
        epiStr = 'sans objet';
      } else {
        var epiD = parseInt(sb.epiDuree, 10);
        if (isFinite(epiD) && epiD > 0) {
          epiStr = epiType + ' (' + epiD + ' min)';
        } else {
          epiStr = epiType;
        }
      }

      // Durée d'exposition saisie sur le terrain (8h) ; court-terme : durée du prélèvement
      var dureeStr = formatHeuresMinutes(dureeExpositionMin(p, sb));

      // Ventilation et captage (Point 2)
      var ventEnvStr = '';
      var veRaw = (sb.ventEnv || '').trim();
      if (veRaw === 'Autre') ventEnvStr = (sb.ventEnvAutre || '').trim();
      else if (veRaw) ventEnvStr = veRaw;

      // Oui => Présence ; Non ou non renseigné => Absence ; Autre => texte libre
      var ventGenStr;
      if (sb.ventGenerale === 'oui') {
        ventGenStr = 'Pr\u00e9sence de ventilation g\u00e9n\u00e9rale m\u00e9canique';
      } else if (sb.ventGenerale === 'autre') {
        ventGenStr = (sb.ventGeneraleAutre || '').trim();
      } else {
        ventGenStr = 'Absence de ventilation g\u00e9n\u00e9rale m\u00e9canique';
      }

      // Captage : "Non" (ou vide) => rien ; sinon préfixer le texte libre saisi
      var ventCaptStr = '';
      var vcRaw = (sb.ventCaptage || '').trim();
      if (vcRaw && vcRaw !== 'Non') {
        var captDetail = (vcRaw === 'Autre') ? (sb.ventCaptageAutre || '').trim() : vcRaw;
        if (captDetail) ventCaptStr = 'Pr\u00e9sence de captage localis\u00e9 ' + captDetail;
      }

      gehMap[gehId].rows.push({
        operateur: (sb.operateur || '').trim(),
        date:      dateStr,
        heures:    plagesStr,
        duree:     dureeStr,
        agents:    agentNames,
        vlep:      vlepStr,
        epi:       epiStr,
        taches:    taches,
        ventEnv:   ventEnvStr,
        ventGen:   ventGenStr,
        ventCapt:  ventCaptStr,
        // pour le rapport : réalisé ou seulement prévu, tri chronologique
        fait:      typeof rapportSbFait === 'function' ? rapportSbFait(sb) : !!sb.completed,
        dateIso:   sb.date || '',
        debut:     (toutesPlages.filter(function(pl) { return pl.debut; })[0] || {}).debut || '',
        dureeMin:  dureeExpositionMin(p, sb)
      });
    });
  });

  return gehOrder.map(function(id) { return gehMap[id]; }).filter(function(g) { return g && g.rows.length > 0; });
}

console.log('✓ Activité chargée');
