# Script de démarrage automatique de l'écosystème SneakySkink
# Ouvre 3 fenêtres PowerShell distinctes pour lancer chaque service en local

Write-Host "🦎 Démarrage de l'écosystème SneakySkink en local..." -ForegroundColor Cyan

# Lancer le Harvester
Write-Host "-> Lancement du Harvester..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev:harvester"

# Lancer l'API
Write-Host "-> Lancement de l'API REST..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev:api"

# Lancer le Site Web
Write-Host "-> Lancement de l'interface Web..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev:web"

Write-Host "✅ Les 3 terminaux ont été démarrés avec succès !" -ForegroundColor Green
