# Deploy Nexus to Vercel from the repository root.
# Do not deploy from the legacy nexus-app copy.

$ErrorActionPreference = "Stop"
Set-Location "c:\Users\mikia\Documents"

Write-Host "`nDeploying to Vercel..." -ForegroundColor Cyan
npx.cmd vercel --prod
