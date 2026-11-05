param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Command
)

$ErrorActionPreference = "Stop"
$baseDir = Split-Path -Parent $PSScriptRoot
$envLocalPath = Join-Path $baseDir ".env.local"
$config = @{}

if (Test-Path -LiteralPath $envLocalPath) {
    foreach ($line in Get-Content -LiteralPath $envLocalPath) {
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
            $value = $matches[2].Trim()
            if (($value.StartsWith('"') -and $value.EndsWith('"')) -or
                ($value.StartsWith("'") -and $value.EndsWith("'"))) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            $config[$matches[1]] = $value
        }
    }
}

$vpsHost = if ($config.VPS_HOST) { $config.VPS_HOST } else { "2.25.89.222" }
$vpsUser = if ($config.VPS_USER) { $config.VPS_USER } else { "root" }
$vpsPort = if ($config.VPS_SSH_PORT) { [int]$config.VPS_SSH_PORT } else { 22 }
$vpsPassword = if ($config.VPS_ROOT_PASSWORD) { $config.VPS_ROOT_PASSWORD } else { $env:VPS_ROOT_PASSWORD }
$sshKeyPath = $config.VPS_SSH_KEY_PATH

$sshPath = (Get-Command ssh.exe -ErrorAction Stop).Source
$askPassPath = $null
$exitCode = 1
$savedAskPass = $env:SSH_ASKPASS
$savedAskPassRequire = $env:SSH_ASKPASS_REQUIRE
$savedDisplay = $env:DISPLAY
$savedSecret = $env:AMEC_SSH_ASKPASS_SECRET

try {
    $sshArgs = @(
        "-n", "-p", [string]$vpsPort,
        "-o", "StrictHostKeyChecking=accept-new",
        "-o", "ConnectTimeout=15"
    )

    if ($sshKeyPath -and (Test-Path -LiteralPath $sshKeyPath)) {
        $sshArgs += @("-i", $sshKeyPath, "-o", "IdentitiesOnly=yes")
    } elseif ($vpsPassword) {
        $askPassPath = Join-Path ([System.IO.Path]::GetTempPath()) ("amec-ssh-askpass-{0}.cmd" -f [guid]::NewGuid().ToString("N"))
        @(
            "@echo off",
            'powershell.exe -NoProfile -NonInteractive -Command "[Console]::Write($env:AMEC_SSH_ASKPASS_SECRET)"'
        ) | Set-Content -LiteralPath $askPassPath -Encoding ASCII

        $env:AMEC_SSH_ASKPASS_SECRET = $vpsPassword
        $env:SSH_ASKPASS = $askPassPath
        $env:SSH_ASKPASS_REQUIRE = "force"
        $env:DISPLAY = "1"
        $sshArgs += @("-o", "PreferredAuthentications=password", "-o", "PubkeyAuthentication=no")
    } else {
        throw "No existe una clave SSH válida ni una contraseña VPS configurada en .env.local."
    }

    & $sshPath @sshArgs ("{0}@{1}" -f $vpsUser, $vpsHost) $Command
    $exitCode = $LASTEXITCODE
} finally {
    if ($askPassPath) {
        Remove-Item -LiteralPath $askPassPath -Force -ErrorAction SilentlyContinue
    }

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

exit $exitCode
