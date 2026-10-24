// envoi-mail.js - Envoi d'un fichier par e-mail (même principe que l'appli Aération)
// © 2025 Quentin THOMAS
//
// Téléphone : partage natif avec le fichier joint (choisir Outlook, saisir le destinataire, envoyer).
// Ordinateur (pas de partage de fichier) : le fichier est téléchargé et un brouillon de mail s'ouvre
// dans Outlook avec l'objet et le texte prêts ; il ne reste qu'à y glisser la pièce jointe.

function downloadBlob(blob, filename) {
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
}

function mailSignature(m) {
  return [(m && m.preleveur) || '', 'SOCOTEC'].filter(Boolean).join('\n');
}

function sendFileByMail(blob, filename, mime, draft) {
  var file = null;
  try { file = new File([blob], filename, { type: mime }); } catch (e) { file = null; }
  if (file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: draft.subject, text: draft.body }).catch(function (err) {
      if (err && err.name === 'AbortError') return; // annulé par l'utilisateur
      mailWithDownload(blob, filename, draft);
    });
    return;
  }
  mailWithDownload(blob, filename, draft);
}

function mailWithDownload(blob, filename, draft) {
  downloadBlob(blob, filename);
  var href = 'mailto:?subject=' + encodeURIComponent(draft.subject) +
    '&body=' + encodeURIComponent(draft.body + '\n\n(Pièce jointe à glisser dans ce mail : ' + filename + ', dans vos Téléchargements)');
  setTimeout(function () { window.location.href = href; }, 400);
}

function missionMailDraft(m, objet, texte) {
  var site = m.clientSite || '';
  return {
    subject: objet + (site ? ' – ' + site : '') + ' – ' + new Date().toLocaleDateString('fr-FR'),
    body: 'Bonjour,\n\n' + texte + '\n\nCordialement,\n' + mailSignature(m)
  };
}

// Mission complète (.json) : à importer dans l'appli VLEP sur un autre appareil
function sendMissionByMail(id) {
  var m = state.missions.find(function (x) { return x.id === id; });
  if (!m) { alert('Mission introuvable'); return; }
  var built = buildMissionJSON(m);
  var draft = missionMailDraft(m, 'Mission VLEP',
    'Ci-joint le fichier de la mission VLEP' + (m.clientSite ? ' du site ' + m.clientSite : '') + ' (' + built.filename + ').\n' +
    'Pour l’ouvrir : Appli VLEP, « Importer une mission ».');
  sendFileByMail(built.blob, built.filename, 'application/json', draft);
}

console.log('✓ Envoi par e-mail chargé');
