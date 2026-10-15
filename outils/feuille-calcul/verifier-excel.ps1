# Ouvre une feuille de calcul générée dans Excel (macros désactivées), recalcule et liste, pour chaque
# onglet « GEH … », les lignes remplies : libellé (A/B) et valeurs affichées des colonnes demandées.
# Détecte aussi une réparation silencieuse (journal error*.xml créé par Excel dans %TEMP%).
#
# Usage : powershell -File outils/feuille-calcul/verifier-excel.ps1 -Fichier "<.xlsm>" [-Colonnes "C,E,G"] [-Lignes 140]
param([string]$Fichier, [string]$Colonnes = "C,E,G", [int]$Lignes = 140)
$avant = @(Get-ChildItem $env:TEMP -Filter "error*.xml" -ErrorAction SilentlyContinue | ForEach-Object FullName)
$x = New-Object -ComObject Excel.Application
$x.Visible = $false
$x.DisplayAlerts = $false
$x.AutomationSecurity = 3   # aucune macro ne tourne
try {
  $wb = $x.Workbooks.Open((Resolve-Path $Fichier).Path, 0, $true)
  $x.CalculateFull()
  "Classeur : " + $wb.Name + " - " + $wb.Worksheets.Count + " onglets"
  foreach ($ws in $wb.Worksheets) {
    if ($ws.Name -notlike "GEH *") { continue }
    "`n===== " + $ws.Name + "  (modèle : " + $ws.Range("A1").Text + ", débitmètre : " + $ws.Range("B11").Text + $ws.Range("B10").Text + ")"
    for ($r = 1; $r -le $Lignes; $r++) {
      $vals = @()
      foreach ($c in $Colonnes.Split(',')) { $vals += $ws.Range("$c$r").Text }
      if (($vals -join '').Trim() -eq '') { continue }
      $lib = ($ws.Range("A$r").Text + " | " + $ws.Range("B$r").Text).Trim(' ', '|')
      $cache = if ($ws.Rows($r).Hidden) { " [masquée]" } else { "" }
      "{0,4} {1,-60} {2}{3}" -f $r, ($lib.Substring(0, [Math]::Min(60, $lib.Length))), ($vals -join "  ||  "), $cache
    }
  }
  $wb.Close($false)
} catch { "ERREUR : " + $_.Exception.Message }
finally { $x.Quit(); [System.Runtime.InteropServices.Marshal]::ReleaseComObject($x) | Out-Null }
$apres = @(Get-ChildItem $env:TEMP -Filter "error*.xml" -ErrorAction SilentlyContinue | ForEach-Object FullName)
$nouveaux = $apres | Where-Object { $avant -notcontains $_ }
if ($nouveaux) { "`nATTENTION : Excel a réparé le fichier (journal : " + ($nouveaux -join ', ') + ")" } else { "`nAucune réparation par Excel." }
