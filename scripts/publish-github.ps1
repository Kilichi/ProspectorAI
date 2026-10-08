# Ejecutar desde PowerShell: powershell -ExecutionPolicy Bypass -File scripts/publish-github.ps1
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)

function Invoke-Git {
    param([string[]]$Arguments)
    & git @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw 'Git ha fallado. Revisa el mensaje anterior y tu acceso a GitHub.'
    }
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw 'Instala Git antes de publicar.'
}
if (-not (Test-Path -LiteralPath '.git')) {
    Invoke-Git -Arguments @('init', '-b', 'main')
}
# OpenSSL conserva la verificación TLS y evita el fallo de credenciales de Schannel.
Invoke-Git -Arguments @('config', 'http.sslBackend', 'openssl')
$repo = 'https://github.com/Kilichi/ProspectorAI.git'
$remote = & git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0) {
    if ($remote -ne $repo) { throw 'origin apunta a otro repositorio. Revísalo antes de publicar.' }
} else {
    Invoke-Git -Arguments @('remote', 'add', 'origin', $repo)
}
Invoke-Git -Arguments @('add', '.')
Invoke-Git -Arguments @('update-index', '--chmod=+x', 'startall.sh', 'startall.command', 'stopall.sh')

# Comprobar valores reales de secretos, sin mostrarlos ni enviarlos a GitHub.
$secretos = @()
if (Test-Path -LiteralPath 'backend/.env') {
    foreach ($linea in Get-Content -LiteralPath 'backend/.env') {
        if ($linea -match '^([A-Za-z0-9_]*(?:KEY|TOKEN|PASSWORD|SECRET)[A-Za-z0-9_]*)=(.*)$') {
            $valor = $Matches[2].Trim().Trim('"').Trim("'")
            if ($valor.Length -ge 12) { $secretos += $valor }
        }
    }
}
$archivos = & git -c core.quotepath=false diff --cached --name-only --diff-filter=ACMR
if ($LASTEXITCODE -ne 0) { throw 'No se ha podido revisar el contenido preparado.' }
foreach ($archivo in $archivos) {
    if ($archivo -match '(^|/)(node_modules|dist|\.env)(/|$)' -or
        ($archivo -match '\.env\.' -and $archivo -notmatch '\.env\.example$')) {
        throw "Archivo privado preparado para publicar: $archivo. No se ha realizado el commit."
    }
    $contenido = (& git show ":$archivo") -join "`n"
    if ($LASTEXITCODE -ne 0) { throw "No se ha podido revisar $archivo" }
    foreach ($secreto in $secretos) {
        if ($contenido.Contains($secreto)) { throw "Secreto local detectado en $archivo. Publicacion detenida." }
    }
    if ($contenido -match '(?:gsk_[A-Za-z0-9]{30,}|AIza[\w-]{30,}|gh[pousr]_[A-Za-z0-9]{30,})') {
        throw "Posible secreto detectado en $archivo. Publicacion detenida."
    }
}
& git diff --cached --quiet
$hayCambios = $LASTEXITCODE
if ($hayCambios -eq 1) {
    Invoke-Git -Arguments @('commit', '-m', 'ProspectorAI: aplicacion DWES, Docker, n8n y arranque macOS')
} elseif ($hayCambios -ne 0) {
    throw 'No se ha podido comprobar el estado del repositorio.'
}
# Sin force: si el remoto contiene trabajo previo, Git lo conserva y rechaza el push.
$rama = & git branch --show-current
if ($LASTEXITCODE -ne 0 -or -not $rama) { throw 'No se ha podido determinar la rama.' }
Invoke-Git -Arguments @('push', '-u', 'origin', $rama)
Write-Host "Publicado en $repo"
