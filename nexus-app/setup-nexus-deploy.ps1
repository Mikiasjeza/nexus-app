# Creates nexus-app subfolder with only project files (excludes My Music, My Pictures, My Videos)
# Run this, then deploy from nexus-app:  cd nexus-app; npx.cmd vercel --prod

$src = "c:\Users\mikia\Documents"
$dest = "c:\Users\mikia\Documents\nexus-app"

$exclude = @("My Music", "My Pictures", "My Videos", "nexus-app", "node_modules", ".next", ".git")

if (Test-Path $dest) {
    Remove-Item $dest -Recurse -Force
}
New-Item -ItemType Directory -Path $dest | Out-Null

Get-ChildItem $src -Force | Where-Object { $_.Name -notin $exclude } | ForEach-Object {
    Copy-Item $_.FullName -Destination (Join-Path $dest $_.Name) -Recurse -Force
}

Write-Host "Created nexus-app with project files. Deploy with:"
Write-Host "  cd nexus-app"
Write-Host "  npx.cmd vercel --prod"
