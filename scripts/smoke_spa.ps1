param(
    [string]$BindHost = '127.0.0.1',
    [int]$AppPort = 8001,
    [int]$VitePort = 5174,
    [int]$TimeoutSec = 45,
    [string]$PhpExe = '',
    [string]$NpmCmd = '',
    [switch]$KeepRunning
)

$ErrorActionPreference = 'Stop'

function Resolve-PhpExe([string]$Override) {
    if ($Override) {
        return (Resolve-Path -LiteralPath $Override).Path
    }
    $candidates = @()
    $cmd = Get-Command php -ErrorAction SilentlyContinue
    if ($cmd) {
        $ver = $null
        try {
            $verText = & $cmd.Path -r "echo PHP_VERSION;" 2>$null
            if ($verText) { $ver = [Version]$verText }
        } catch {
            $ver = $null
        }
        $candidates += [pscustomobject]@{
            Exe = $cmd.Path
            Version = $ver
            LastWriteTime = (Get-Item -LiteralPath $cmd.Path).LastWriteTime
        }
    }
    $phpRoot = 'C:\laragon\bin\php'
    if (Test-Path -LiteralPath $phpRoot) {
        $candidates += Get-ChildItem -Directory -LiteralPath $phpRoot | ForEach-Object {
            $exe = Join-Path $_.FullName 'php.exe'
            if (Test-Path -LiteralPath $exe) {
                $version = $null
                if ($_.Name -match '^php-(\d+\.\d+\.\d+)') {
                    $version = [Version]$Matches[1]
                }
                [pscustomobject]@{
                    Exe = $exe
                    Version = $version
                    LastWriteTime = (Get-Item -LiteralPath $exe).LastWriteTime
                }
            }
        }
    }
    if ($candidates) {
        $ordered = $candidates | Sort-Object @{ Expression = { $_.Version }; Descending = $true }, @{ Expression = { $_.LastWriteTime }; Descending = $true }
        return ($ordered | Select-Object -First 1).Exe
    }
    throw 'php.exe not found. Provide -PhpExe.'
}

function Resolve-NpmCmd([string]$Override) {
    if ($Override) {
        return (Resolve-Path -LiteralPath $Override).Path
    }
    $cmd = Get-Command npm -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Path
    }
    $nodeRoot = 'C:\laragon\bin\nodejs'
    if (Test-Path -LiteralPath $nodeRoot) {
        $candidates = Get-ChildItem -Directory -LiteralPath $nodeRoot | ForEach-Object {
            $exe = Join-Path $_.FullName 'npm.cmd'
            if (Test-Path -LiteralPath $exe) { Get-Item -LiteralPath $exe }
        }
        if ($candidates) {
            return ($candidates | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
        }
    }
    throw 'npm.cmd not found. Provide -NpmCmd.'
}

function Port-Available([int]$Port) {
    try {
        $conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' } | Select-Object -First 1
        return -not $conn
    } catch {
        return $true
    }
}

function Get-ListeningPid([int]$Port) {
    try {
        return Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
            Where-Object { $_.State -eq 'Listen' -and $_.OwningProcess -gt 0 } |
            Select-Object -First 1 -ExpandProperty OwningProcess
    } catch {
        return $null
    }
}

function Wait-HttpOk([string]$Url, [int]$TimeoutSec) {
    $sw = [Diagnostics.Stopwatch]::StartNew()
    while ($sw.Elapsed.TotalSeconds -lt $TimeoutSec) {
        try {
            $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
            if ($resp.StatusCode -eq 200) {
                return $resp
            }
        } catch {
            # ignore
        }
        Start-Sleep -Milliseconds 500
    }
    return $null
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$logDir = Join-Path $repoRoot 'tmp'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$artisanOut = Join-Path $logDir 'smoke_spa_artisan_out.log'
$artisanErr = Join-Path $logDir 'smoke_spa_artisan_err.log'
$viteOut = Join-Path $logDir 'smoke_spa_vite_out.log'
$viteErr = Join-Path $logDir 'smoke_spa_vite_err.log'

if (-not (Port-Available $AppPort)) {
    throw "App port $AppPort is already in use."
}
if (-not (Port-Available $VitePort)) {
    throw "Vite port $VitePort is already in use."
}

$phpExePath = Resolve-PhpExe $PhpExe
$npmCmdPath = Resolve-NpmCmd $NpmCmd
$nodeDir = Split-Path -Parent $npmCmdPath

$origPath = $env:PATH
$artisanProc = $null
$viteProc = $null

try {
    if ($env:PATH -notlike "*$nodeDir*") {
        $env:PATH = "$nodeDir;$env:PATH"
    }

    $artisanProc = Start-Process -FilePath $phpExePath -ArgumentList @('artisan','serve','--host',$BindHost,'--port',$AppPort) -WorkingDirectory $repoRoot -RedirectStandardOutput $artisanOut -RedirectStandardError $artisanErr -PassThru

    $viteCmd = '"' + $npmCmdPath + '" run dev -- --host ' + $BindHost + ' --port ' + $VitePort
    $viteProc = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', $viteCmd) -WorkingDirectory $repoRoot -RedirectStandardOutput $viteOut -RedirectStandardError $viteErr -PassThru

    $viteResp = Wait-HttpOk "http://$BindHost`:$VitePort/@vite/client" $TimeoutSec
    $appResp = Wait-HttpOk "http://$BindHost`:$AppPort/" $TimeoutSec

    $viteOk = $viteResp -ne $null
    $appOk = $false
    $appHasAppDiv = $false
    $appHasViteEntry = $false

    if ($appResp) {
        $appHasAppDiv = $appResp.Content -match 'id="app"'
        $appHasViteEntry = ($appResp.Content -match '@vite/client') -or ($appResp.Content -match 'resources/js/app\.jsx')
        $appOk = $appResp.StatusCode -eq 200 -and $appHasAppDiv
    }

    $results = @(
        [pscustomobject]@{ Check = 'vite'; Status = $(if ($viteOk) { 'OK' } else { 'FAIL' }); Detail = "http://$BindHost`:$VitePort/@vite/client" },
        [pscustomobject]@{ Check = 'app'; Status = $(if ($appOk) { 'OK' } else { 'FAIL' }); Detail = "http://$BindHost`:$AppPort/" },
        [pscustomobject]@{ Check = 'app_div'; Status = $(if ($appHasAppDiv) { 'OK' } else { 'FAIL' }); Detail = 'id="app" present' },
        [pscustomobject]@{ Check = 'vite_entry'; Status = $(if ($appHasViteEntry) { 'OK' } else { 'WARN' }); Detail = 'vite script tag present' }
    )

    $results | Format-Table -AutoSize

    if (-not ($viteOk -and $appOk)) {
        throw 'Smoke test failed. See logs in tmp/.'
    }
} finally {
    $env:PATH = $origPath
    if (-not $KeepRunning) {
        if ($viteProc -and -not $viteProc.HasExited) {
            Stop-Process -Id $viteProc.Id -Force -ErrorAction SilentlyContinue
        }
        if ($artisanProc -and -not $artisanProc.HasExited) {
            Stop-Process -Id $artisanProc.Id -Force -ErrorAction SilentlyContinue
        }
        $vitePid = Get-ListeningPid $VitePort
        if ($vitePid) { Stop-Process -Id $vitePid -Force -ErrorAction SilentlyContinue }
        $appPid = Get-ListeningPid $AppPort
        if ($appPid) { Stop-Process -Id $appPid -Force -ErrorAction SilentlyContinue }
    }
}
