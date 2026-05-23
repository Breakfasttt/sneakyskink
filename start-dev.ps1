# Script de démarrage automatique de l'écosystème SneakySkink
# Ouvre 3 fenêtres PowerShell distinctes pour lancer chaque service en local

Write-Host "🦎 Démarrage de l'écosystème SneakySkink en local..." -ForegroundColor Cyan

# Lancer le Harvester
Write-Host "-> Lancement du Harvester..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "[Console]::InputEncoding = [Console]::OutputEncoding = $OutputEncoding = [System.Text.Encoding]::UTF8; chcp 65001 >$null; npm run dev:harvester"

# Lancer l'API
Write-Host "-> Lancement de l'API REST..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "[Console]::InputEncoding = [Console]::OutputEncoding = $OutputEncoding = [System.Text.Encoding]::UTF8; chcp 65001 >$null; npm run dev:api"

# Lancer le Site Web
Write-Host "-> Lancement de l'interface Web..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "[Console]::InputEncoding = [Console]::OutputEncoding = $OutputEncoding = $OutputEncoding = [System.Text.Encoding]::UTF8; chcp 65001 >$null; npm run dev:web"

# Lancer la console d'Administration
Write-Host "-> Lancement de la console d'Administration..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "[Console]::InputEncoding = [Console]::OutputEncoding = $OutputEncoding = $OutputEncoding = [System.Text.Encoding]::UTF8; chcp 65001 >$null; npm run dev:admin"

Write-Host "✅ Les 4 terminaux ont été démarrés avec succès !" -ForegroundColor Green
