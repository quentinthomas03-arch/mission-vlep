# Ouvre un .xlsm dans Excel (macros coupées), recalcule, signale une réparation et les cellules en erreur
# (formules et constantes) des onglets visibles ; enregistre une copie recalculée si -Sortie est donné.
param([string]$Fichier, [string]$Sortie = "")
$avant = @(Get-ChildItem $env:TEMP -Filter "error*.xml" -ErrorAction SilentlyContinue | ForEach-Object FullName)
$x = New-Object -ComObject Excel.Application
$x.Visible = $false; $x.DisplayAlerts = $false; $x.AutomationSecurity = 3
try {
  $wb = $x.Workbooks.Open((Resolve-Path $Fichier).Path, 0, $false)
  $x.CalculateFull()
  "Classeur : " + $wb.Name + " - " + $wb.Worksheets.Count + " onglets"
  foreach ($ws in $wb.Worksheets) {
    $vis = $ws.Visible -eq -1
    $n = 0; $ex = @()
    foreach ($type in 16) {
      foreach ($quoi in -4123, 2) {   # formules, constantes
        try { $rg = $ws.UsedRange.SpecialCells($quoi, $type) } catch { $rg = $null }
        if ($rg) { foreach ($c in $rg.Cells) { $n++; if ($ex.Count -lt 6) { $ex += $c.Address(0,0) + "=" + $c.Text + " [" + $ws.Range("A" + $c.Row).Text + "]" } } }
      }
    }
    if ($n -gt 0) { "{0}{1} : {2} cellule(s) en erreur  ex. {3}" -f $ws.Name, $(if ($vis) { "" } else { " (masqué)" }), $n, ($ex -join " ; ") }
  }
  if ($Sortie) { $wb.SaveAs($Sortie, 52); "Enregistré : " + $Sortie }
  $wb.Close($false)
} catch { "ERREUR : " + $_.Exception.Message }
finally { $x.Quit(); [System.Runtime.InteropServices.Marshal]::ReleaseComObject($x) | Out-Null }
$apres = @(Get-ChildItem $env:TEMP -Filter "error*.xml" -ErrorAction SilentlyContinue | ForEach-Object FullName)
$nouveaux = $apres | Where-Object { $avant -notcontains $_ }
if ($nouveaux) { "REPARATION EXCEL : " + ($nouveaux -join ", "); foreach ($f in $nouveaux) { Get-Content $f -Raw } } else { "Pas de réparation." }
