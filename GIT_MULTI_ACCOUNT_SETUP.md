# Hướng dẫn Setup Nhiều Tài Khoản Git cho Từng Dự Án

## 📋 Tổng Quan

Tài liệu này hướng dẫn cách cấu hình để mỗi dự án sử dụng một tài khoản Git khác nhau.

## 🔑 Các Tài Khoản

1. **hoangvu669**
   - Email: `hoangclhhd@gmail.com`
   - SSH Key: (cần xác định)
   - Dự án: `music_backend`

2. **HoangvhShoba**
   - Email: `hoangvh@shoba.asia`
   - SSH Key: (cần xác định)
   - Dự án: (các dự án khác)

## ✅ Cấu Hình Đã Hoàn Thành

### Dự án `music_backend`:
- ✅ Git config local đã được setup:
  ```bash
  user.name = hoangvu669
  user.email = hoangclhhd@gmail.com
  ```
- ✅ Remote URL đã được set:
  ```
  git@github.com:HoangVu669/music_backend.git
  ```

## 🚀 Cách Setup Cho Dự Án Mới

### Bước 1: Clone hoặc vào thư mục dự án
```bash
cd /path/to/your/project
```

### Bước 2: Set Git Config Local (chỉ áp dụng cho dự án này)

**Cho tài khoản hoangvu669:**
```bash
git config --local user.name "hoangvu669"
git config --local user.email "hoangclhhd@gmail.com"
```

**Cho tài khoản HoangvhShoba:**
```bash
git config --local user.name "HoangvhShoba"
git config --local user.email "hoangvh@shoba.asia"
```

### Bước 3: Kiểm tra cấu hình
```bash
# Xem cấu hình local
git config --local --list | Select-String "user"

# Xem remote URL
git remote -v
```

### Bước 4: Test push
```bash
# Tạo commit test
echo "# Test" >> README.md
git add README.md
git commit -m "Test commit with correct account"
git push origin master
```

## 📝 Cấu Hình SSH Keys (Nếu Cần)

Nếu bạn cần sử dụng SSH keys khác nhau cho từng tài khoản, cấu hình trong `~/.ssh/config`:

### Windows: `C:\Users\YourUsername\.ssh\config`

```ssh-config
# Tài khoản hoangvu669
Host github.com-hoangvu669
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_rsa_hoangvu669
    IdentitiesOnly yes

# Tài khoản HoangvhShoba  
Host github.com-shoba
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_rsa_shoba
    IdentitiesOnly yes
```

Sau đó sử dụng remote URL tương ứng:
```bash
# Cho hoangvu669
git remote set-url origin git@github.com-hoangvu669:HoangVu669/music_backend.git

# Cho HoangvhShoba
git remote set-url origin git@github.com-shoba:HoangVu669/other_repo.git
```

## 🔍 Kiểm Tra Cấu Hình Hiện Tại

### Xem tất cả cấu hình:
```bash
# Global config (áp dụng mặc định cho tất cả repo)
git config --global --list

# Local config (chỉ cho repo hiện tại)
git config --local --list
```

### Xem thông tin commit:
```bash
# Xem author của commit gần nhất
git log -1 --format="%an <%ae>"

# Xem author của tất cả commit
git log --format="%an <%ae>" | Select-Object -Unique
```

## 📌 Lưu Ý Quan Trọng

1. **Local config sẽ override global config**: Khi bạn set `--local`, nó sẽ được ưu tiên hơn `--global` cho repo đó.

2. **Mỗi repo cần setup riêng**: Nếu bạn có 5 dự án với 5 tài khoản khác nhau, bạn cần set local config cho từng repo.

3. **Kiểm tra trước khi commit**: Luôn kiểm tra `git config --local user.name` và `git config --local user.email` trước khi commit quan trọng.

4. **Vercel/GitHub Actions**: Đảm bảo tài khoản Git author có quyền truy cập vào Vercel project hoặc GitHub repository.

## 🛠️ Script Helper (Tùy Chọn)

Tạo file `setup-git-account.ps1` để dễ dàng setup:

```powershell
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("hoangvu669", "HoangvhShoba")]
    [string]$Account
)

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

Write-Host "`nCấu hình hiện tại:" -ForegroundColor Yellow
git config --local user.name
git config --local user.email
```

Sử dụng:
```powershell
.\setup-git-account.ps1 -Account hoangvu669
```

## ✅ Checklist Khi Setup Dự Án Mới

- [ ] Xác định tài khoản Git sẽ dùng cho dự án
- [ ] Set `user.name` local
- [ ] Set `user.email` local  
- [ ] Kiểm tra remote URL (đảm bảo đúng repository)
- [ ] Test commit và push
- [ ] Xác nhận trên GitHub/Vercel rằng commit được tạo bởi đúng tài khoản

## 🔗 Tài Liệu Tham Khảo

- [Git Config Documentation](https://git-scm.com/docs/git-config)
- [Multiple GitHub Accounts](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys)
- [Vercel Git Integration](https://vercel.com/docs/concepts/git)

---

**Lần cập nhật cuối**: $(Get-Date -Format "yyyy-MM-dd")
**Người tạo**: hoangvu669

