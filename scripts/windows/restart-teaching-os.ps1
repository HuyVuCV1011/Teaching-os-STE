$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $ProjectRoot

if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
    throw "pm2 is not installed. Run: npm install -g pm2"
}

if (-not (Test-Path ".\node_modules\next\dist\bin\next")) {
    throw "Missing node_modules. Run: npm install"
}

pm2 describe teaching-os-ste *> $null
if ($LASTEXITCODE -eq 0) {
    pm2 restart teaching-os-ste --update-env
} else {
    pm2 start ecosystem.config.cjs --only teaching-os-ste
}

pm2 save
