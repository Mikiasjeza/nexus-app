# Legacy script kept only to prevent accidental stale deployments.
# Deploy directly from the repository root instead:
#   cd c:\Users\mikia\Documents
#   npx.cmd vercel --prod

$ErrorActionPreference = "Stop"
Set-Location "c:\Users\mikia\Documents"

Write-Host "The old nexus-app copy flow is disabled." -ForegroundColor Yellow
Write-Host "Deploy from the repository root with:" -ForegroundColor Cyan
Write-Host "  npx.cmd vercel --prod"
