// timers.js - Timers CT et dictée vocale
// © 2025 Quentin THOMAS
// Chronomètres CT 15min, dictée vocale améliorée

// ===================================================
// DICTÉE VOCALE (observations)
// Écoute continue relancée après chaque silence, texte provisoire affiché en direct, commandes de ponctuation,
// morceaux cumulés de Chrome sur Android fusionnés (dicteeFusion)
// ===================================================

var activeDictation = null;

// Remplacement des commandes vocales par de la ponctuation
var PONCTUATION_COMMANDS = [
  { pattern: /\bpoint virgule\b/gi,    replacement: '; ' },
  { pattern: /\bpoint d.interrogation\b/gi, replacement: '? ' },
  { pattern: /\bpoint d.exclamation\b/gi,   replacement: '! ' },
  { pattern: /\bnouvelle ligne\b/gi,   replacement: '\n' },
  { pattern: /\bretour.{0,5}ligne\b/gi,replacement: '\n' },
  { pattern: /\btiret\b/gi,            replacement: '- ' },
  { pattern: /\bvirgule\b/gi,          replacement: ', ' },
  { pattern: /\bdeuxpoints\b/gi,       replacement: ': ' },
  { pattern: /\bdeux points\b/gi,      replacement: ': ' },
  { pattern: /\bpoint\b/gi,            replacement: '. ' },
  { pattern: /\bouvrir parenthèse\b/gi,replacement: '(' },
  { pattern: /\bfermer parenthèse\b/gi,replacement: ')' },
];

function applyPonctuationCommands(text) {
  PONCTUATION_COMMANDS.forEach(function(cmd) {
    text = text.replace(cmd.pattern, cmd.replacement);
  });
  // Nettoyer les espaces multiples sauf les sauts de ligne ; pas d'espace avant une virgule, un point ou « ) »
  text = text.replace(/ {2,}/g, ' ').replace(/ +([,.)])/g, '$1');
  return text;
}

// Afficher le panel de dictée flottant
function showDictationPanel(prelId, subIdx) {
  var existing = document.getElementById('dictation-panel');
  if (existing) existing.remove();

  var panel = document.createElement('div');
  panel.id = 'dictation-panel';
  panel.style.cssText = [
    'position:fixed', 'bottom:0', 'left:0', 'right:0',
    'background:#1e293b', 'color:white', 'padding:16px',
    'z-index:9999', 'border-radius:16px 16px 0 0',
    'box-shadow:0 -4px 24px rgba(0,0,0,0.4)',
    'min-height:140px', 'display:flex', 'flex-direction:column', 'gap:10px'
  ].join(';');

  panel.innerHTML = [
    '<div style="display:flex;align-items:center;gap:10px;">',
      '<div id="dictation-dot" style="width:14px;height:14px;border-radius:50%;background:#ef4444;animation:dictPulse 1s infinite;flex-shrink:0;"></div>',
      '<span style="font-weight:700;font-size:14px;">Dictée en cours...</span>',
      '<button onclick="stopDictation();" style="margin-left:auto;background:#ef4444;color:white;border:none;border-radius:8px;padding:6px 14px;font-size:13px;font-weight:700;cursor:pointer;">Stop</button>',
    '</div>',
    '<div id="dictation-interim" style="',
      'background:#0f172a;border-radius:8px;padding:10px 12px;',
      'font-size:14px;min-height:50px;line-height:1.5;',
      'color:#94a3b8;font-style:italic;',
      'white-space:pre-wrap;word-break:break-word;',
    '">',
      '<span style="color:#475569;">En attente de voix...</span>',
    '</div>',
    '<div style="font-size:11px;color:#64748b;text-align:center;">',
      'Dites : "virgule" "point" "nouvelle ligne" "tiret"',
    '</div>',
  ].join('');

  document.body.appendChild(panel);

  // Injecter l'animation CSS si pas encore présente
  if (!document.getElementById('dictation-css')) {
    var style = document.createElement('style');
    style.id = 'dictation-css';
    style.textContent = '@keyframes dictPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.85)}}';
    document.head.appendChild(style);
  }
}

function updateDictationPanel(interimText, isFinal) {
  var el = document.getElementById('dictation-interim');
  if (!el) return;
  if (!interimText) {
    el.innerHTML = '<span style="color:#475569;">En attente de voix...</span>';
    return;
  }
  // Texte interim en gris, texte final en blanc
  var color = isFinal ? '#f1f5f9' : '#94a3b8';
  var style = isFinal ? '' : 'font-style:italic;';
  el.innerHTML = '<span style="color:' + color + ';' + style + '">' + escapeHtml(interimText) + '</span>';
}

function removeDictationPanel() {
  var panel = document.getElementById('dictation-panel');
  if (panel) panel.remove();
}

function stopDictation() {
  if (!activeDictation) return;
  activeDictation.stopped = true; // empêcher l'auto-relance
  activeDictation.recognition.stop();
}

function toggleDictation(prelId, subIdx) {
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('La dictée vocale n\'est pas supportée par votre navigateur.\n\nUtilisez Chrome sur Android pour cette fonctionnalité.');
    return;
  }

  var key = prelId + '_' + subIdx;

  // Si dictée active sur ce même champ → stop
  if (activeDictation && activeDictation.key === key) {
    stopDictation();
    return;
  }

  // Si dictée active sur un autre champ → stopper proprement d'abord
  if (activeDictation) {
    activeDictation.stopped = true;
    activeDictation.recognition.stop();
    activeDictation = null;
  }

  startDictationSession(prelId, subIdx, key);
}

// Fusion des résultats définitifs d'une écoute. Safari et Chrome sur ordinateur envoient des phrases successives
// (« bonjour », « je suis là ») ; Chrome sur Android envoie souvent des morceaux cumulés (« bonjour », « bonjour je »,
// « bonjour je suis là ») ou répète la phrase : un morceau qui reprend le texte déjà reconnu le remplace au lieu de
// s'y ajouter, une répétition exacte est ignorée.
function dicteeFusion(finals) {
  var acc = '';
  (finals || []).forEach(function (t) {
    t = String(t || '').trim();
    if (!t) return;
    var a = acc.toLowerCase(), b = t.toLowerCase();
    if (!acc) acc = t;
    else if (b.indexOf(a) === 0) acc = t;                 // morceau cumulé : remplace
    else if (a.slice(-b.length) === b) return;             // répétition de la fin : ignorée
    else acc += ' ' + t;                                   // phrase suivante
  });
  return acc;
}

function startDictationSession(prelId, subIdx, key) {
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  var textarea = document.getElementById('obs-' + prelId + '-' + subIdx);

  // Texte existant avant de commencer à dicter
  // On sépare le texte déjà validé du nouveau contenu dicté
  var confirmedText = textarea ? textarea.value : '';
  // Séparateur si texte préexistant
  if (confirmedText && !confirmedText.endsWith(' ') && !confirmedText.endsWith('\n')) {
    confirmedText += ' ';
  }

  var recognition = new SpeechRecognition();
  recognition.lang = 'fr-FR';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  var session = {
    key: key,
    prelId: prelId,
    subIdx: subIdx,
    recognition: recognition,
    base: confirmedText,   // texte du champ avant cette écoute (et des écoutes précédentes, après relance)
    courant: '',           // texte reconnu pendant l'écoute en cours (brut, sans ponctuation)
    stopped: false
  };
  session.texte = function () { return session.base + applyPonctuationCommands(session.courant); };

  activeDictation = session;

  // --- Résultats : relus en entier à chaque fois (pas seulement depuis resultIndex) et fusionnés par
  // dicteeFusion, qui gère les morceaux cumulés envoyés par Chrome sur Android. ---
  recognition.onresult = function(event) {
    var finals = [], interim = '';
    for (var i = 0; i < event.results.length; i++) {
      var r = event.results[i];
      if (r.isFinal) finals.push(r[0].transcript);
      else interim = r[0].transcript;
    }
    var courant = dicteeFusion(finals);
    if (courant !== session.courant) {
      session.courant = courant;
      updateSubFieldWithAutoDate(prelId, subIdx, 'observations', session.texte());
    }
    // texte provisoire : sans ce qui est déjà validé (Android le répète en tête)
    var dernier = finals.length ? finals[finals.length - 1].trim() : '';
    if (dernier && interim.trim().toLowerCase().indexOf(dernier.toLowerCase()) === 0) interim = interim.trim().slice(dernier.length);
    if (textarea) textarea.value = session.texte() + (interim.trim() ? (session.courant ? ' ' : '') + interim.trim() : '');
    updateDictationPanel(interim.trim() || applyPonctuationCommands(courant), !interim.trim());
  };

  // --- Fin d'écoute : relance automatique tant que le technicien n'a pas touché « Stop » ---
  recognition.onend = function() {
    var btn = document.getElementById('dict-btn-' + prelId + '-' + subIdx);
    // ce qui a été reconnu devient la base de l'écoute suivante
    if (session.courant.trim()) { session.base = session.texte().replace(/\s*$/, ' '); session.courant = ''; }

    if (session.stopped) {
      activeDictation = null;
      if (btn) btn.classList.remove('recording');
      removeDictationPanel();
      var finalVal = session.base.trimEnd();
      if (textarea) textarea.value = finalVal;
      updateSubFieldWithAutoDate(prelId, subIdx, 'observations', finalVal);
      return;
    }

    // relance après un silence (Android coupe l'écoute) ; petit délai contre l'erreur « already started »
    setTimeout(function() {
      if (!session.stopped && activeDictation && activeDictation.key === key) {
        try {
          recognition.start();
        } catch(e) {
          activeDictation = null;
          if (btn) btn.classList.remove('recording');
          removeDictationPanel();
          startDictationSession(prelId, subIdx, key);
        }
      }
    }, 200);
  };

  // --- Erreurs ---
  recognition.onerror = function(event) {
    var btn = document.getElementById('dict-btn-' + prelId + '-' + subIdx);
    // silence, arrêt volontaire, réseau : la relance de onend s'en charge
    if (event.error === 'no-speech' || event.error === 'aborted' || event.error === 'network') return;
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      alert('Micro refusé : autorisez le micro pour ce site dans les réglages du navigateur.');
    } else {
      console.warn('Dictée - erreur:', event.error);
    }
    session.stopped = true;
    activeDictation = null;
    if (btn) btn.classList.remove('recording');
    removeDictationPanel();
  };

  // Démarrer
  try {
    recognition.start();
    var btn = document.getElementById('dict-btn-' + prelId + '-' + subIdx);
    if (btn) btn.classList.add('recording');
    showDictationPanel(prelId, subIdx);
  } catch(e) {
    console.error('Impossible de démarrer la dictée:', e);
    activeDictation = null;
  }
}


// ===================================================
// TIMERS CT
// ===================================================

// L'heure de départ est sauvegardée (localStorage) : le chrono survit à un
// rechargement, une mise en veille ou une fermeture de l'appli, et le temps
// écoulé est toujours recalculé depuis l'heure de départ.
var ctTimers = {};
var CT_TIMERS_KEY = 'vlep_timers';
var CT_DUREE_MS = 15 * 60 * 1000;

function saveCTTimers() {
  var data = {};
  for (var key in ctTimers) {
    data[key] = { prelId: ctTimers[key].prelId, subIdx: ctTimers[key].subIdx, startTime: ctTimers[key].startTime };
  }
  try { localStorage.setItem(CT_TIMERS_KEY, JSON.stringify(data)); } catch (e) {}
}

function tickCTTimer(key) {
  var t = ctTimers[key];
  if (!t) return;
  t.elapsed = Date.now() - t.startTime;
  var el = document.getElementById('ct-timer-' + key);
  if (el) el.textContent = formatCTTime(t.elapsed);
  // Alertes vibrantes : 1 min avant puis à 15 min (une seule fois chacune)
  if (!t.alerte14 && t.elapsed >= CT_DUREE_MS - 60000) {
    t.alerte14 = true;
    try { if (navigator.vibrate) navigator.vibrate([300, 100, 300]); } catch (e) {}
  }
  if (!t.alerte15 && t.elapsed >= CT_DUREE_MS) {
    t.alerte15 = true;
    try { if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 1000]); } catch (e) {}
    // Pas de render() ici : il ferait perdre la saisie en cours ; la boîte passe au rouge au prochain affichage
    if (el) el.style.color = '#ef4444';
  }
}

function runCTTimer(prelId, subIdx, startTime) {
  var key = prelId + '_' + subIdx;
  var elapsed = Date.now() - startTime;
  ctTimers[key] = {
    prelId: prelId,
    subIdx: subIdx,
    startTime: startTime,
    elapsed: elapsed,
    // Un chrono restauré déjà au-delà du seuil ne revibre pas
    alerte14: elapsed >= CT_DUREE_MS - 60000,
    alerte15: elapsed >= CT_DUREE_MS,
    interval: setInterval(function() { tickCTTimer(key); }, 1000)
  };
}

function restoreCTTimers() {
  try {
    var data = JSON.parse(localStorage.getItem(CT_TIMERS_KEY) || '{}');
    for (var key in data) {
      var d = data[key];
      if (d && d.startTime && d.prelId !== undefined) runCTTimer(d.prelId, d.subIdx, d.startTime);
    }
  } catch (e) {}
}

// Au retour au premier plan, rafraîchir l'affichage sans attendre la seconde suivante
document.addEventListener('visibilitychange', function() {
  if (!document.hidden) for (var key in ctTimers) tickCTTimer(key);
});

// Retourne l'heure courante au format HH:MM
function getCurrentTimeHHMM() {
  var now = new Date();
  var h = now.getHours();
  var m = now.getMinutes();
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}

function startCTTimer(prelId, subIdx) {
  var key = prelId + '_' + subIdx;
  if (ctTimers[key]) return;

  // Auto-remplir l'heure de début dans la première plage
  var heureDebut = getCurrentTimeHHMM();
  var m = getCurrentMission();
  if (m) {
    var p = m.prelevements.find(function(x) { return x.id === prelId; });
    if (p && p.subPrelevements[subIdx]) {
      var sb = p.subPrelevements[subIdx];
      if (!sb.plages || sb.plages.length === 0) sb.plages = [{debut: '', fin: ''}];
      // Remplir la dernière plage sans début
      var targetPlage = sb.plages[sb.plages.length - 1];
      if (!targetPlage.debut) {
        targetPlage.debut = heureDebut;
        autoFillDate(p, subIdx);
        saveData('vlep_missions_v3', state.missions);
      }
    }
  }

  runCTTimer(prelId, subIdx, Date.now());
  saveCTTimers();

  render();
}

function stopCTTimer(prelId, subIdx) {
  var key = prelId + '_' + subIdx;
  if (!ctTimers[key]) return;
  clearInterval(ctTimers[key].interval);
  delete ctTimers[key];
  saveCTTimers();

  // Auto-remplir l'heure de fin dans la dernière plage
  var heureFin = getCurrentTimeHHMM();
  var m = getCurrentMission();
  if (m) {
    var p = m.prelevements.find(function(x) { return x.id === prelId; });
    if (p && p.subPrelevements[subIdx]) {
      var sb = p.subPrelevements[subIdx];
      if (sb.plages && sb.plages.length > 0) {
        var targetPlage = sb.plages[sb.plages.length - 1];
        if (!targetPlage.fin) {
          targetPlage.fin = heureFin;
          saveData('vlep_missions_v3', state.missions);
        }
      }
    }
  }

  render();
}

function isTimerRunning(prelId, subIdx) {
  return !!ctTimers[prelId + '_' + subIdx];
}

function formatCTTime(ms) {
  var totalSec = Math.floor(ms / 1000);
  var min = Math.floor(totalSec / 60);
  var sec = totalSec % 60;
  return (min < 10 ? '0' : '') + min + ':' + (sec < 10 ? '0' : '') + sec;
}

function getTimerDisplay(prelId, subIdx) {
  var key = prelId + '_' + subIdx;
  var t = ctTimers[key];
  var elapsed = t ? t.elapsed : 0;
  var pct = Math.min(elapsed / (15 * 60 * 1000) * 100, 100);
  var isOver = elapsed >= 15 * 60 * 1000;

  return [
    '<div class="ct-timer-box" style="background:' + (isOver ? '#fef2f2' : '#f0fdf4') + ';border:2px solid ' + (isOver ? '#ef4444' : '#22c55e') + ';border-radius:10px;padding:12px;margin:8px 0;">',
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">',
        '<span style="font-weight:700;color:' + (isOver ? '#ef4444' : '#16a34a') + ';display:inline-flex;align-items:center;gap:6px;"><span style="display:inline-flex;width:16px;height:16px;">' + ICONS.clock + '</span>Chrono CT</span>',
        '<span id="ct-timer-' + key + '" style="font-size:24px;font-weight:700;font-family:monospace;color:' + (isOver ? '#ef4444' : '#16a34a') + ';">' + formatCTTime(elapsed) + '</span>',
      '</div>',
      '<div style="background:#e5e7eb;border-radius:4px;height:6px;margin-bottom:10px;">',
        '<div style="background:' + (isOver ? '#ef4444' : '#22c55e') + ';height:6px;border-radius:4px;width:' + pct.toFixed(1) + '%;transition:width 1s;"></div>',
      '</div>',
      (isOver ? '<div style="font-size:11px;color:#ef4444;font-weight:700;text-align:center;margin-bottom:8px;">15 min dépassées</div>' : '<div style="font-size:11px;color:#6b7280;text-align:center;margin-bottom:8px;">Durée max CT : 15 min</div>'),
      '<button class="btn btn-danger" style="width:100%;" onclick="stopCTTimer(' + prelId + ',' + subIdx + ');">Arrêter le chrono</button>',
    '</div>'
  ].join('');
}

restoreCTTimers();

console.log('✓ Timers chargé');
