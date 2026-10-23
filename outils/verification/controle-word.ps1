# Ouvre un .docx dans Word, met à jour les champs, signale les erreurs de champ et compte images/tableaux.
param([string]$Fichier, [string]$Pdf = "")
$w = New-Object -ComObject Word.Application
$w.Visible = $false; $w.DisplayAlerts = 0
try {
  $d = $w.Documents.Open((Resolve-Path $Fichier).Path, $false, $false, $false)
  "Ouvert : " + $d.Name + " - " + $d.ComputeStatistics(2) + " pages, " + $d.Tables.Count + " tableaux, " + $d.InlineShapes.Count + " images en ligne, " + $d.Shapes.Count + " formes"
  $null = $d.Fields.Update()
  $t = $d.Content.Text
  foreach ($motif in 'Erreur ! ', 'Error!', 'Signet non défini', 'Source du renvoi introuvable', 'xx/xx', 'XXXX', '[à compléter]') {
    $n = ([regex]::Matches($t, [regex]::Escape($motif))).Count
    if ($n) { "  « $motif » : $n" }
  }
  if ($Pdf) { $d.SaveAs2($Pdf, 17); "PDF : $Pdf" }
  $d.Close(0)
} catch { "ERREUR : " + $_.Exception.Message }
finally { $w.Quit(); [System.Runtime.InteropServices.Marshal]::ReleaseComObject($w) | Out-Null }
