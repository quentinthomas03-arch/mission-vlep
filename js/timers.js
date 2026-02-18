// timers.js - Timers CT et dictÃƒÂ©e vocale
// Ã‚Â© 2025 Quentin THOMAS
// ChronomÃƒÂ¨tres CT 15min, dictÃƒÂ©e vocale amÃƒÂ©liorÃƒÂ©e

// ===================================================
// DICTÃƒâ€°E VOCALE - Version amÃƒÂ©liorÃƒÂ©e
// Corrections : bug de duplication, affichage live,
// auto-relance, commandes ponctuation
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
  { pattern: /\bouvrir parenthÃƒÂ¨se\b/gi,replacement: '(' },
  { pattern: /\bfermer parenthÃƒÂ¨se\b/gi,replacement: ')' },
];

function applyPonctuationCommands(text) {
  PONCTUATION_COMMANDS.forEach(function(cmd) {
    text = text.replace(cmd.pattern, cmd.replacement);
  });
  // Nettoyer les espaces multiples sauf les sauts de ligne
  text = text.replace(/ {2,}/g, ' ');
  return text;
}

// Afficher le panel de dictÃƒÂ©e flottant
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
      '<span style="font-weight:700;font-size:14px;">DictÃ©e en cours...</span>',
      '<button onclick="stopDictation();" style="margin-left:auto;background:#ef4444;color:white;border:none;border-radius:8px;padding:6px 14px;font-size:13px;font-weight:700;cursor:pointer;">â¹ Stop</button>',
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

  // Injecter l'animation CSS si pas encore prÃƒÂ©sente
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
  activeDictation.stopped = true; // empÃƒÂªcher l'auto-relance
  activeDictation.recognition.stop();
}

function toggleDictation(prelId, subIdx) {
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('La dictÃ©e vocale n\'est pas supportÃ©e par votre navigateur.\n\nUtilisez Chrome sur Android pour cette fonctionnalitÃ©.');
    return;
  }

  var key = prelId + '_' + subIdx;

  // Si dictÃ©e active sur ce mÃƒÂªme champ â†’ stop
  if (activeDictation && activeDictation.key === key) {
    stopDictation();
    return;
  }

  // Si dictÃ©e active sur un autre champ â†’ stopper proprement d'abord
  if (activeDictation) {
    activeDictation.stopped = true;
    activeDictation.recognition.stop();
    activeDictation = null;
  }

  startDictationSession(prelId, subIdx, key);
}

function startDictationSession(prelId, subIdx, key, inheritedConfirmedText) {
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  var textarea = document.getElementById('obs-' + prelId + '-' + subIdx);

  // Si un confirmedText est transmis (relance auto), on l'utilise directement
  // pour éviter de re-lire le textarea qui contient du texte intérimaire
  var confirmedText;
  if (inheritedConfirmedText !== undefined) {
    confirmedText = inheritedConfirmedText;
  } else {
    // Premier démarrage : lire le textarea
    confirmedText = textarea ? textarea.value : '';
    if (confirmedText && !confirmedText.endsWith(' ') && !confirmedText.endsWith('\n')) {
      confirmedText += ' ';
    }
  }

  // Purger le texte intérimaire du textarea avant de repartir
  if (textarea) textarea.value = confirmedText;

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
    confirmedText: confirmedText,
    stopped: false,
    lastFinalIndex: -1
  };

  activeDictation = session;

  // Gestionnaire principal : resultats
  recognition.onresult = function(event) {
    var interimTranscript = '';
    var newFinalText = '';

    for (var i = event.resultIndex; i < event.results.length; i++) {
      var result = event.results[i];
      var transcript = result[0].transcript;

      if (result.isFinal) {
        // Anti-duplication Android : ignorer resultats deja traites
        if (i <= session.lastFinalIndex) continue;
        session.lastFinalIndex = i;
        newFinalText += applyPonctuationCommands(transcript);
      } else {
        interimTranscript += transcript;
      }
    }

    // Accumuler le texte final valide
    if (newFinalText) {
      session.confirmedText += newFinalText;
      if (textarea) textarea.value = session.confirmedText;
      updateSubFieldWithAutoDate(prelId, subIdx, 'observations', session.confirmedText);
    }

    // Afficher : texte confirme + interim en cours
    if (textarea) textarea.value = session.confirmedText + interimTranscript;

    // Mettre a jour le panel visuel
    updateDictationPanel(interimTranscript || newFinalText, !interimTranscript);
  };

  // â”€â”€â”€ FIN DE SESSION : auto-relance si pas stoppÃƒÂ© volontairement â”€â”€â”€
  recognition.onend = function() {
    var btn = document.getElementById('dict-btn-' + prelId + '-' + subIdx);

    if (session.stopped) {
      // ArrÃƒÂªt volontaire
      activeDictation = null;
      if (btn) btn.classList.remove('recording');
      removeDictationPanel();
      // Sauvegarder la valeur finale proprement
      if (textarea) {
        var finalVal = session.confirmedText.trimEnd();
        textarea.value = finalVal;
        updateSubFieldWithAutoDate(prelId, subIdx, 'observations', finalVal);
      }
      return;
    }

    // Auto-relance après silence (comportement Android Chrome)
    // On passe session.confirmedText pour ne pas relire le textarea
    // (qui peut contenir du texte intérimaire → duplication)
    setTimeout(function() {
      if (!session.stopped && activeDictation && activeDictation.key === key) {
        try {
          recognition.start();
        } catch(e) {
          // Si échec de relance, créer une nouvelle session en transmettant le confirmedText
          activeDictation = null;
          if (btn) btn.classList.remove('recording');
          removeDictationPanel();
          startDictationSession(prelId, subIdx, key, session.confirmedText);
        }
      }
    }, 200);
  };

  // â”€â”€â”€ ERREURS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  recognition.onerror = function(event) {
    var btn = document.getElementById('dict-btn-' + prelId + '-' + subIdx);

    if (event.error === 'no-speech') {
      // Silence : normal sur le terrain, on laisse l'auto-relance gÃƒÂ©rer
      return;
    }

    if (event.error === 'aborted') {
      // ArrÃƒÂªt propre, gÃƒÂ©rÃƒÂ© par onend
      return;
    }

    if (event.error === 'not-allowed') {
      alert('Microphone refusÃ©. VÃ©rifiez les permissions dans les rÃ©glages Chrome.');
      session.stopped = true;
      activeDictation = null;
      if (btn) btn.classList.remove('recording');
      removeDictationPanel();
      return;
    }

    if (event.error === 'network') {
      // Erreur rÃƒÂ©seau : tenter de relancer
      return;
    }

    // Autres erreurs : afficher et stopper
    console.warn('DictÃ©e - erreur:', event.error);
    session.stopped = true;
    activeDictation = null;
    if (btn) btn.classList.remove('recording');
    removeDictationPanel();
  };

  // DÃƒÂ©marrer
  try {
    recognition.start();
    var btn = document.getElementById('dict-btn-' + prelId + '-' + subIdx);
    if (btn) btn.classList.add('recording');
    showDictationPanel(prelId, subIdx);
  } catch(e) {
    console.error('Impossible de dÃ©marrer la dictÃ©e:', e);
    activeDictation = null;
  }
}


// ===================================================
// TIMERS CT
// ===================================================

var ctTimers = {};

function startCTTimer(prelId, subIdx) {
  var key = prelId + '_' + subIdx;
  if (ctTimers[key]) return;

  ctTimers[key] = {
    prelId: prelId,
    subIdx: subIdx,
    startTime: Date.now(),
    elapsed: 0,
    interval: null
  };

  var t = ctTimers[key];
  t.interval = setInterval(function() {
    t.elapsed = Date.now() - t.startTime;
    var el = document.getElementById('ct-timer-' + key);
    if (el) el.textContent = formatCTTime(t.elapsed);
  }, 1000);

  render();
}

function stopCTTimer(prelId, subIdx) {
  var key = prelId + '_' + subIdx;
  if (!ctTimers[key]) return;
  clearInterval(ctTimers[key].interval);
  delete ctTimers[key];
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
        '<span style="font-weight:700;color:' + (isOver ? '#ef4444' : '#16a34a') + ';">â± Chrono CT</span>',
        '<span id="ct-timer-' + key + '" style="font-size:24px;font-weight:700;font-family:monospace;color:' + (isOver ? '#ef4444' : '#16a34a') + ';">' + formatCTTime(elapsed) + '</span>',
      '</div>',
      '<div style="background:#e5e7eb;border-radius:4px;height:6px;margin-bottom:10px;">',
        '<div style="background:' + (isOver ? '#ef4444' : '#22c55e') + ';height:6px;border-radius:4px;width:' + pct.toFixed(1) + '%;transition:width 1s;"></div>',
      '</div>',
      (isOver ? '<div style="font-size:11px;color:#ef4444;font-weight:700;text-align:center;margin-bottom:8px;">âš ï¸ 15 min dÃ©passÃ©es</div>' : '<div style="font-size:11px;color:#6b7280;text-align:center;margin-bottom:8px;">DurÃ©e max CT : 15 min</div>'),
      '<button class="btn btn-danger" style="width:100%;" onclick="stopCTTimer(' + prelId + ',' + subIdx + ');">â¹ ArrÃªter</button>',
    '</div>'
  ].join('');
}

console.log('âœ” Timers chargÃ©');
