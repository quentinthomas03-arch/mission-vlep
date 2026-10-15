# Convertit la trame de rapport Word (.dot, format binaire) en .docx lisible (structure, champs, signets)
# sans exécuter ses macros. Sert à outils/extraire-trame-rapport.py.
# Usage : powershell -File outils/trame-rapport/convertir.ps1 -Source "<trame.dot>" -Sortie "<trame.docx>"
param([string]$Source, [string]$Sortie)
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$word.AutomationSecurity = 3   # msoAutomationSecurityForceDisable : AutoNew / AutoOpen ne s'exécutent pas
try {
  $doc = $word.Documents.Open($Source, $false, $true)
  $doc.SaveAs2($Sortie, 16)     # wdFormatDocumentDefault (.docx)
  "Champs : " + $doc.Fields.Count
  "Signets : " + $doc.Bookmarks.Count
  "Contrôles de contenu : " + $doc.ContentControls.Count
  "Variables : " + $doc.Variables.Count
  "Propriétés personnalisées : " + $doc.CustomDocumentProperties.Count
  "Tableaux : " + $doc.Tables.Count
  "Sections : " + $doc.Sections.Count
  $doc.Close(0)
} finally { $word.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word) }
