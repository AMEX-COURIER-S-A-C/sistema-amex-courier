param(
    [string]$WorkerPath = "worker/worker.js"
)

$ErrorActionPreference = "Stop"
$baseDir = Split-Path -Parent $PSScriptRoot
$envLocalPath = Join-Path $baseDir ".env.local"
$envValues = @{}

if (-not (Test-Path -LiteralPath $envLocalPath)) {
    throw "No se encontró .env.local; se necesitan las credenciales de conexión al VPS y de TIB."
}

foreach ($line in Get-Content -LiteralPath $envLocalPath) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
        $name = $matches[1]
        $value = $matches[2].Trim()
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        $envValues[$name] = $value
    }
}

$vpsHost = if ($envValues.VPS_HOST) { $envValues.VPS_HOST } else { "2.25.89.222" }
$vpsUser = if ($envValues.VPS_USER) { $envValues.VPS_USER } else { "root" }
$vpsPort = if ($envValues.VPS_SSH_PORT) { [int]$envValues.VPS_SSH_PORT } else { 22 }
$vpsPassword = if ($envValues.VPS_ROOT_PASSWORD) { $envValues.VPS_ROOT_PASSWORD } else { $env:VPS_ROOT_PASSWORD }
$sshKeyPath = $envValues.VPS_SSH_KEY_PATH
$tibApiUrl = if ($envValues.TIB_API_URL) { $envValues.TIB_API_URL } else { "https://www.tibcourier.com/api/list-warehouse" }
$tibEmail = $envValues.TIB_API_EMAIL
$tibPassword = $envValues.TIB_API_PASSWORD

if ($vpsUser -ne "root") {
    throw "El despliegue del contenedor existente requiere acceso SSH como root."
}
if (-not $tibEmail -or -not $tibPassword) {
    throw "Faltan TIB_API_EMAIL o TIB_API_PASSWORD en .env.local."
}
if (@($tibApiUrl, $tibEmail, $tibPassword) | Where-Object { $_.Contains("`n") -or $_.Contains("`r") }) {
    throw "Las variables TIB no pueden contener saltos de línea."
}

$workerFile = Join-Path $baseDir $WorkerPath
$tibSyncFile = Join-Path $baseDir "worker\tib-daily-sync.js"
if (-not (Test-Path -LiteralPath $workerFile)) { throw "No se encontró $workerFile" }
if (-not (Test-Path -LiteralPath $tibSyncFile)) { throw "No se encontró $tibSyncFile" }

$sshPath = (Get-Command ssh.exe -ErrorAction Stop).Source
$scpPath = (Get-Command scp.exe -ErrorAction Stop).Source
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$deployId = [guid]::NewGuid().ToString("N")
$tempRoot = [System.IO.Path]::GetTempPath()
$localTibEnv = Join-Path $tempRoot ("amex-worker-tib-{0}.env" -f $deployId)
$askPassPath = $null
$savedAskPass = $env:SSH_ASKPASS
$savedAskPassRequire = $env:SSH_ASKPASS_REQUIRE
$savedDisplay = $env:DISPLAY
$savedSecret = $env:AMEC_SSH_ASKPASS_SECRET

$remoteWorker = "/root/amex-worker-{0}.js" -f $deployId
$remoteTibSync = "/root/amex-worker-tib-sync-{0}.js" -f $deployId
$remoteTibEnv = "/root/amex-worker-tib-{0}.env" -f $deployId
$tibEnvContent = @(
    "TIB_API_URL=$tibApiUrl",
    "TIB_API_EMAIL=$tibEmail",
    "TIB_API_PASSWORD=$tibPassword",
    "TIB_DAILY_SYNC_ENABLED=true"
) -join "`n"

try {
    [System.IO.File]::WriteAllText($localTibEnv, $tibEnvContent, $utf8NoBom)
    $sshArgs = @("-p", [string]$vpsPort, "-o", "StrictHostKeyChecking=accept-new", "-o", "ConnectTimeout=15")
    $scpArgs = @("-P", [string]$vpsPort, "-o", "StrictHostKeyChecking=accept-new", "-o", "ConnectTimeout=15")

    if ($sshKeyPath -and (Test-Path -LiteralPath $sshKeyPath)) {
        $sshArgs += @("-i", $sshKeyPath, "-o", "IdentitiesOnly=yes")
        $scpArgs += @("-i", $sshKeyPath, "-o", "IdentitiesOnly=yes")
    } elseif ($vpsPassword) {
        $askPassPath = Join-Path $tempRoot ("amex-worker-askpass-{0}.cmd" -f $deployId)
        $askPassContent = @'
@echo off
powershell.exe -NoProfile -NonInteractive -Command "[Console]::Write($env:AMEC_SSH_ASKPASS_SECRET)"
'@
        [System.IO.File]::WriteAllText($askPassPath, $askPassContent, [System.Text.Encoding]::ASCII)
        $env:AMEC_SSH_ASKPASS_SECRET = $vpsPassword
        $env:SSH_ASKPASS = $askPassPath
        $env:SSH_ASKPASS_REQUIRE = "force"
        $env:DISPLAY = "1"
        $sshArgs += @("-o", "PreferredAuthentications=password", "-o", "PubkeyAuthentication=no")
        $scpArgs += @("-o", "PreferredAuthentications=password", "-o", "PubkeyAuthentication=no")
    } else {
        throw "No existe una clave SSH válida ni una contraseña VPS configurada."
    }

    $remoteWorkerTarget = "{0}@{1}:{2}" -f $vpsUser, $vpsHost, $remoteWorker
    $remoteTibSyncTarget = "{0}@{1}:{2}" -f $vpsUser, $vpsHost, $remoteTibSync
    $remoteTibEnvTarget = "{0}@{1}:{2}" -f $vpsUser, $vpsHost, $remoteTibEnv

    Write-Host "Copiando el Worker y la configuración TIB al contenedor existente en Hostinger..."
    & $scpPath @scpArgs $workerFile $remoteWorkerTarget
    if ($LASTEXITCODE -ne 0) { throw "Falló la copia de worker.js al VPS." }
    & $scpPath @scpArgs $tibSyncFile $remoteTibSyncTarget
    if ($LASTEXITCODE -ne 0) { throw "Falló la copia de tib-daily-sync.js al VPS." }
    & $scpPath @scpArgs $localTibEnv $remoteTibEnvTarget
    if ($LASTEXITCODE -ne 0) { throw "Falló la copia segura de las credenciales TIB al VPS." }

    $remoteCommand = @"
set -e
trap 'rm -f $remoteWorker $remoteTibSync $remoteTibEnv' EXIT
chmod 600 $remoteTibEnv
docker cp $remoteWorker amex-worker:/app/worker/worker.js
docker cp $remoteTibSync amex-worker:/app/worker/tib-daily-sync.js
docker cp $remoteTibEnv amex-worker:/app/.env.tib
docker exec amex-worker chmod 600 /app/.env.tib
docker exec amex-worker node --check /app/worker/worker.js
docker exec amex-worker node --check /app/worker/tib-daily-sync.js
docker restart amex-worker
sleep 2
docker exec amex-worker node -e 'fetch("http://127.0.0.1:10000/").then(r=>{if(!r.ok)process.exit(1);return r.json()}).then(x=>console.log(JSON.stringify({status:x.status,tibDailySync:x.tibDailySync}))).catch(e=>{console.error(e.message);process.exit(1)})'
"@
    & $sshPath @sshArgs ("{0}@{1}" -f $vpsUser, $vpsHost) $remoteCommand
    if ($LASTEXITCODE -ne 0) { throw "Falló la actualización o verificación del Worker existente." }
    Write-Host "Worker actualizado en el mismo contenedor; caché local y volúmenes existentes preservados."
} finally {
    Remove-Item -LiteralPath $localTibEnv -Force -ErrorAction SilentlyContinue
    if ($askPassPath) { Remove-Item -LiteralPath $askPassPath -Force -ErrorAction SilentlyContinue }

    foreach ($item in @(
        @{ Name = "SSH_ASKPASS"; Value = $savedAskPass },
        @{ Name = "SSH_ASKPASS_REQUIRE"; Value = $savedAskPassRequire },
        @{ Name = "DISPLAY"; Value = $savedDisplay },
        @{ Name = "AMEC_SSH_ASKPASS_SECRET"; Value = $savedSecret }
    )) {
        if ($null -eq $item.Value) {
            Remove-Item -Path ("Env:{0}" -f $item.Name) -ErrorAction SilentlyContinue
        } else {
            Set-Item -Path ("Env:{0}" -f $item.Name) -Value $item.Value
        }
    }
}
