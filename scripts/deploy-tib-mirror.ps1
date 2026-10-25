param(
    [string]$VpsHost = "2.25.89.222"
)

$ErrorActionPreference = "Stop"
$baseDir = Split-Path -Parent $PSScriptRoot
$envLocalPath = Join-Path $baseDir ".env.local"
$askPassPath = Join-Path $baseDir "askpass.bat"
$workerFile = Join-Path $baseDir "worker\tib-mirror-daemon.mjs"

$vpsPassword = $env:VPS_ROOT_PASSWORD

if (Test-Path $envLocalPath) {
    $passMatch = Select-String -Path $envLocalPath -Pattern "^VPS_ROOT_PASSWORD=(.*)$"
    if ($passMatch) {
        $vpsPassword = $passMatch.Matches[0].Groups[1].Value.Trim()
    }
    $hostMatch = Select-String -Path $envLocalPath -Pattern "^VPS_HOST=(.*)$"
    if ($hostMatch) {
        $VpsHost = $hostMatch.Matches[0].Groups[1].Value.Trim()
    }
}

if ($vpsPassword) {
    "@echo $vpsPassword" | Set-Content -Path $askPassPath -Encoding ASCII
    $env:SSH_ASKPASS = (Resolve-Path $askPassPath).Path
    $env:SSH_ASKPASS_REQUIRE = "force"
}

Write-Host "1. Creando directorio /opt/amex-tib-mirror en VPS ($VpsHost)..."
ssh -n -o StrictHostKeyChecking=no -o ConnectTimeout=15 "root@$VpsHost" "mkdir -p /opt/amex-tib-mirror"

Write-Host "2. Copiando tib-mirror-daemon.mjs al VPS..."
scp -o StrictHostKeyChecking=no -o ConnectTimeout=15 "$workerFile" "root@${VpsHost}:/opt/amex-tib-mirror/tib-mirror-daemon.mjs"

Write-Host "3. Creando package.json en /opt/amex-tib-mirror..."
$pkgJson = @'
{
  "name": "amex-tib-mirror",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@supabase/supabase-js": "^2.49.1",
    "resend": "^4.1.2",
    "ws": "^8.18.0"
  }
}
'@
$pkgJsonEncoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($pkgJson))
ssh -n -o StrictHostKeyChecking=no -o ConnectTimeout=15 "root@$VpsHost" "echo $pkgJsonEncoded | base64 -d > /opt/amex-tib-mirror/package.json"

Write-Host "4. Configurando variables de entorno en /opt/amex-tib-mirror/.env..."
$tibEmail = "operaciones@amexcourierperu.com"
$tibUrl = "https://www.tibcourier.com/api/list-warehouse"
$tibPassMatch = Select-String -Path $envLocalPath -Pattern "^TIB_API_PASSWORD=(.*)$"
if ($tibPassMatch) { $tibPass = $tibPassMatch.Matches[0].Groups[1].Value.Trim() }

$portalKeyMatch = Select-String -Path $envLocalPath -Pattern "^PORTAL_SUPABASE_SERVICE_ROLE_KEY=(.*)$"
if ($portalKeyMatch) { $portalKey = $portalKeyMatch.Matches[0].Groups[1].Value.Trim() }

$resendKeyMatch = Select-String -Path $envLocalPath -Pattern "^RESEND_API_KEY=(.*)$"
if ($resendKeyMatch) { $resendKey = $resendKeyMatch.Matches[0].Groups[1].Value.Trim() }

$envLines = @(
    "PORTAL_SUPABASE_URL=https://zftkbolgcnnkkdfzmtix.supabase.co",
    "PORTAL_SUPABASE_SERVICE_ROLE_KEY=$portalKey",
    "TIB_API_URL=$tibUrl",
    "TIB_API_EMAIL=$tibEmail",
    "TIB_API_PASSWORD=$tibPass",
    "RESEND_API_KEY=$resendKey",
    "RESEND_FROM_EMAIL=info@sistemaamexcourier.online",
    "SYNC_INTERVAL_MINUTES=5"
)
$envContent = $envLines -join "`n"
$envEncoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($envContent))
ssh -n -o StrictHostKeyChecking=no -o ConnectTimeout=15 "root@$VpsHost" "echo $envEncoded | base64 -d > /opt/amex-tib-mirror/.env && chmod 600 /opt/amex-tib-mirror/.env"

Write-Host "5. Desplegando contenedor Docker amex-tib-mirror (Node 22)..."
$deployCmd = "docker stop amex-tib-mirror 2>/dev/null || true && docker rm amex-tib-mirror 2>/dev/null || true && docker run -d --name amex-tib-mirror --restart always -v /opt/amex-tib-mirror:/app -w /app node:22-alpine sh -c 'npm install && node tib-mirror-daemon.mjs'"
ssh -n -o StrictHostKeyChecking=no -o ConnectTimeout=30 "root@$VpsHost" $deployCmd

Write-Host "6. Esperando inicio del contenedor..."
Start-Sleep -Seconds 5

Write-Host "7. Verificando logs del contenedor amex-tib-mirror..."
ssh -n -o StrictHostKeyChecking=no -o ConnectTimeout=15 "root@$VpsHost" "docker ps --filter name=amex-tib-mirror; echo '--- LOGS: ---'; docker logs --tail 30 amex-tib-mirror"
