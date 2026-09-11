# Exporte les tables Access vers scripts/access-export (UTF-8 BOM, delimiteur ;)
# Depuis la racine du projet :
#   powershell -ExecutionPolicy Bypass -File scripts/export-access-csv.ps1

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path     # …/scripts
$root = Split-Path -Parent $scriptDir                             # racine projet
$outDir = Join-Path $root 'scripts/access-export'

$accdbCandidates = @(Get-ChildItem -LiteralPath $root -Filter '*.accdb' -File -ErrorAction SilentlyContinue)
if ($accdbCandidates.Count -eq 0) {
  throw "ACCDB introuvable dans : $root (deposez le fichier .accdb a la racine du projet Next.js)"
}
$accdb = $accdbCandidates[0].FullName
Write-Host ('[INFO] Source : ' + $accdbCandidates[0].Name)

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function Escape-CsvField([string]$s) {
  if ($null -eq $s) { return '' }
  $t = $s -replace "`r`n", "`n" -replace "`r", "`n"
  if ($t -match '[;"`n]|^ | $') {
    '"' + ($t -replace '"', '""') + '"'
  } else {
    $t
  }
}

function Export-RecordsetRows($Records) {
  if ($Records.Fields.Count -lt 1) {
    return ""
  }
  $lines = New-Object System.Collections.Generic.List[string]
  $hdr = @()
  for ($i = 0; $i -lt $Records.Fields.Count; $i++) {
    $hdr += [string]$Records.Fields.Item($i).Name
  }
  [void]$lines.Add((($hdr | ForEach-Object { Escape-CsvField $_ }) -join ';'))

  while (-not $Records.EOF) {
    $vals = New-Object System.Collections.Generic.List[string]
    for ($i = 0; $i -lt $Records.Fields.Count; $i++) {
      try {
        $v = $Records.Fields.Item($i).Value
        if ($null -eq $v -or ([System.DBNull]::Value).Equals($v)) {
          [void]$vals.Add('')
        }
        elseif ($v -is [double] -or $v -is [float]) {
          [void]$vals.Add((Escape-CsvField ([System.Convert]::ToString($v, [System.Globalization.CultureInfo]::InvariantCulture))))
        }
        elseif ($v -is [decimal]) {
          [void]$vals.Add((Escape-CsvField ([System.Convert]::ToString($v, [System.Globalization.CultureInfo]::InvariantCulture))))
        }
        elseif ($v -is [datetime]) {
          [void]$vals.Add((Escape-CsvField ($v.ToUniversalTime().ToString('o'))))
        }
        elseif ($v -is [boolean]) {
          [void]$vals.Add((Escape-CsvField ([string]$v)))
        }
        else {
          [void]$vals.Add((Escape-CsvField ([string]$v)))
        }
      } catch {
        [void]$vals.Add('')
      }
    }
    [void]$lines.Add(($vals -join ';'))
    $Records.MoveNext()
  }

  (($lines.ToArray()) -join "`r`n")
}

function Get-AccessUserTableNames($ad) {
  $out = @()
  try {
    $rs = $ad.OpenSchema(20, @($null, $null, $null, 'TABLE'))
  } catch {
    $rs = $ad.OpenSchema(20)
  }
  while (-not $rs.EOF) {
    $name = [string]$rs.Fields.Item('TABLE_NAME').Value
    $tt = [string]$rs.Fields.Item('TABLE_TYPE').Value
    if ($tt -eq 'TABLE' -and $name -notlike 'MSys*' -and $name -notlike '~*') {
      $out += $name
    }
    $rs.MoveNext()
  }
  $rs.Close()
  return $out
}

function Resolve-TableName($tables, [string[]]$patterns) {
  foreach ($p in $patterns) {
    foreach ($t in $tables) {
      if ([string]$t -like $p) { return [string]$t }
    }
  }
  return $null
}

$tableMap = @(
  @{ File = 'fiche_entretien.csv'; Patterns = @('*fiche*entretien*') }
  @{ File = 'fiche_intervention_maintenance.csv'; Patterns = @('*FICHE*INTERVENTION*MAINTENANCE*') }
  @{ File = 'historique_machine.csv'; Patterns = @('*Historique*machine*') }
  @{ File = 'liste_pieces.csv'; Patterns = @('*Liste*Piece*rechange*','*Piece*rechange*') }
  @{ File = 'suivi_eau.csv'; Patterns = @('*Suivie*qualit*eau*','*Suivie*eau*','*qualit*eau*') }
  @{ File = 'table_intervention.csv'; Patterns = @('*table*intervention*') }
)

Write-Host ('[ACCESS] Ouverture de ' + $accdb)
try {
  $ad = New-Object -ComObject ADODB.Connection
} catch {
  throw "ADO non disponible. Installez Microsoft Access Database Engine 2016+."
}

$connStr = 'Provider=Microsoft.ACE.OLEDB.16.0; Data Source="{0}"; Persist Security Info=False;' -f $accdb
$ad.Open($connStr)

$userTables = @(Get-AccessUserTableNames $ad)
Write-Host ('[INFO] Tables utilisateur : ' + $userTables.Count)

foreach ($m in $tableMap) {
  $resolved = Resolve-TableName $userTables $m.Patterns
  if (-not $resolved) {
    Write-Host ('[SKIP] ' + $m.File + ' -- aucune table pour motifs : ' + ($m.Patterns -join ', '))
    continue
  }
  $escaped = '[' + (($resolved) -replace ']', ']]') + ']'
  $sql = "SELECT * FROM $escaped"
  Write-Host ('[TABLE] ' + $m.File + ' :: ' + $resolved)
  try {
    $rs = New-Object -ComObject ADODB.Recordset
    $rs.Open($sql, $ad, 1, 1) # adOpenKeyset, adLockReadOnly

    $content = Export-RecordsetRows $rs
    $rs.Close()

    $path = Join-Path $outDir $m.File
    $unicode = New-Object System.Text.UTF8Encoding $true
    [System.IO.File]::WriteAllText($path, $content, $unicode)
  } catch {
    Write-Host ('[SKIP] ' + $resolved + ' erreur ' + $_.Exception.Message)
  }
}

try { $ad.Close() } catch {}
Write-Host ('[OK] CSV dans : ' + $outDir)
