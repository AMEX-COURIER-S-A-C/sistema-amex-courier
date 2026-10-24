# Script para configurar los dominios locales del Portal de Clientes de AMEX Courier
param (
    [switch]$Elevate = $false
)

$hostsPath = "$env:windir\System32\drivers\etc\hosts"
$domains = @(
    "cliente.sistemaamexcourier.online",
    "clientes.sistemaamexcourier.online"
)

# Verificar si se ejecuta como Administrador
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Elevando permisos de administrador..." -ForegroundColor Yellow
    Start-Process powershell -Verb RunAs -Wait -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    exit
}

$content = Get-Content $hostsPath -Raw -ErrorAction Stop

$entriesToAdd = @()
foreach ($d in $domains) {
    if ($content -notmatch [regex]::Escape($d)) {
        $entriesToAdd += "127.0.0.1 $d"
    }
}

if ($entriesToAdd.Count -gt 0) {
    $textToAppend = "`r`n# AMEX Courier - Desarrollo Local`r`n" + ($entriesToAdd -join "`r`n") + "`r`n"
    [System.IO.File]::AppendAllText($hostsPath, $textToAppend, [System.Text.Encoding]::ASCII)
    Clear-DnsClientCache -ErrorAction SilentlyContinue
    ipconfig /flushdns | Out-Null
    Write-Host "OK: Se agregaron exitosamente los dominios a $hostsPath" -ForegroundColor Green
    foreach ($entry in $entriesToAdd) {
        Write-Host "  -> $entry" -ForegroundColor Cyan
    }
} else {
    Write-Host "Los dominios ya se encuentran mapeados en el archivo hosts." -ForegroundColor Green
}
