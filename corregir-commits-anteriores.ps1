# Script para corregir el autor de commits anteriores
# Ejecutar desde PowerShell en el directorio del proyecto

Write-Host "Corrigiendo commits anteriores..." -ForegroundColor Yellow

# Ver commits actuales
Write-Host "`nCommits actuales:" -ForegroundColor Cyan
git log --format="%h - %an <%ae> - %s" -5

Write-Host "`n¿Deseas corregir el commit 'c9092ac' (chore: configurar Git...)? (S/N)" -ForegroundColor Yellow
$respuesta = Read-Host

if ($respuesta -eq "S" -or $respuesta -eq "s") {
    Write-Host "`nCorrigiendo commits..." -ForegroundColor Green
    
    # Hacer rebase interactivo manualmente
    # Primero, crear un script temporal
    $rebaseScript = @"
edit c9092ac
exec git commit --amend --author='producto-mercap <producto@mercapsoftware.com>' --no-edit
continue
"@
    
    $rebaseScript | Out-File -FilePath ".git-rebase-todo" -Encoding utf8
    
    Write-Host "Para corregir el commit, ejecuta manualmente:" -ForegroundColor Yellow
    Write-Host "1. git rebase -i HEAD~2" -ForegroundColor Cyan
    Write-Host "2. En el editor, cambia 'pick' por 'edit' en el commit c9092ac" -ForegroundColor Cyan
    Write-Host "3. Guarda y cierra el editor" -ForegroundColor Cyan
    Write-Host "4. Ejecuta: git commit --amend --author='producto-mercap <producto@mercapsoftware.com>' --no-edit" -ForegroundColor Cyan
    Write-Host "5. Ejecuta: git rebase --continue" -ForegroundColor Cyan
    Write-Host "6. Ejecuta: git push origin main --force" -ForegroundColor Cyan
    Write-Host "`n⚠️ ADVERTENCIA: --force solo si eres el único trabajando en el repo" -ForegroundColor Red
} else {
    Write-Host "`nOperación cancelada. Los commits futuros usarán el email correcto." -ForegroundColor Green
}

Write-Host "`nConfiguración actual:" -ForegroundColor Cyan
git config --local --list | Select-String "user\."




