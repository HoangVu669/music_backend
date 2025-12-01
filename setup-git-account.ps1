# Script để setup Git account cho repository hiện tại
# Usage: .\setup-git-account.ps1 -Account hoangvu669

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("hoangvu669", "HoangvhShoba")]
    [string]$Account
)

Write-Host "`n🔧 Đang setup Git account cho repository hiện tại..." -ForegroundColor Cyan
Write-Host "Repository: $(Get-Location)" -ForegroundColor Gray

switch ($Account) {
    "hoangvu669" {
        git config --local user.name "hoangvu669"
        git config --local user.email "hoangclhhd@gmail.com"
        Write-Host "✅ Đã setup cho tài khoản hoangvu669" -ForegroundColor Green
    }
    "HoangvhShoba" {
        git config --local user.name "HoangvhShoba"
        git config --local user.email "hoangvh@shoba.asia"
        Write-Host "✅ Đã setup cho tài khoản HoangvhShoba" -ForegroundColor Green
    }
}

Write-Host "`n📋 Cấu hình hiện tại:" -ForegroundColor Yellow
Write-Host "   User Name: $(git config --local user.name)" -ForegroundColor White
Write-Host "   User Email: $(git config --local user.email)" -ForegroundColor White

Write-Host "`n🔍 Remote URL:" -ForegroundColor Yellow
git remote -v

Write-Host "`n✅ Hoàn tất! Bây giờ bạn có thể commit và push với tài khoản này." -ForegroundColor Green

