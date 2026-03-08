# Deploy Nexus to Vercel - ALWAYS run this from Documents, not from nexus-app directly
# This copies project to nexus-app (excluding Windows folders) then deploys

$ErrorActionPreference = "Stop"
Set-Location "c:\Users\mikia\Documents"

Write-Host "Copying project to nexus-app..." -ForegroundColor Cyan
& .\setup-nexus-deploy.ps1

Write-Host "`nDeploying to Vercel..." -ForegroundColor Cyan
Set-Location nexus-app
npx.cmd vercel --prod
