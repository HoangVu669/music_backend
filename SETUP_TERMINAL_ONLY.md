# ⚡ Setup Tối Ưu - Chỉ Dùng Terminal (Không Cần IDE)

## 🎯 Mục tiêu

**Tối ưu nhất có thể:**
- ✅ Chỉ dùng **PowerShell/Terminal**
- ✅ Không cần IDE (VS Code, Visual Studio, etc.)
- ✅ Không cần GUI tools
- ✅ Chỉ cài Node.js + PM2
- ✅ Quản lý hoàn toàn bằng lệnh

---

## 📦 Chỉ cần cài 1 thứ

### Node.js (Bao gồm npm)

**Download:**
```powershell
# Hoặc download từ browser: https://nodejs.org/
# Chọn: LTS version, Windows Installer (.msi) - 64-bit
```

**Sau khi cài, kiểm tra:**
```powershell
node --version
npm --version
```

**Kích thước:** ~50MB

---

## 🚀 Setup hoàn toàn bằng Terminal

### Bước 1: Tạo thư mục và clone/upload code

```powershell
# Tạo thư mục
mkdir C:\music_backend
cd C:\music_backend

# Nếu có Git (tùy chọn)
git clone <your-repo-url> .

# Hoặc upload code qua RDP (copy/paste folder)
```

### Bước 2: Tạo file .env bằng PowerShell

```powershell
# Tạo file .env
@"
NODE_ENV=production
PORT=4000
MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/music_app?retryWrites=true&w=majority
JWT_SECRET=
"@ | Out-File -FilePath ".env" -Encoding UTF8

# Tạo JWT Secret
$jwtSecret = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
Write-Host "JWT_SECRET=$jwtSecret" -ForegroundColor Green

# Chỉnh sửa .env (dùng notepad hoặc nano nếu có)
notepad .env
# Hoặc: nano .env (nếu đã cài)
```

**Hoặc chỉnh sửa trực tiếp bằng PowerShell:**
```powershell
# Đọc file
$content = Get-Content .env

# Thay thế JWT_SECRET
$content = $content -replace 'JWT_SECRET=', "JWT_SECRET=$jwtSecret"

# Lưu lại
$content | Set-Content .env
```

### Bước 3: Cài dependencies

```powershell
npm install --production
```

### Bước 4: Cài PM2 (Khuyến nghị)

```powershell
npm install -g pm2
```

### Bước 5: Chạy server

```powershell
# Start với PM2
pm2 start src/server.js --name music_backend

# Lưu config
pm2 save

# Xem status
pm2 status

# Xem logs
pm2 logs music_backend
```

### Bước 6: Mở Firewall (PowerShell as Administrator)

```powershell
New-NetFirewallRule -DisplayName "Music Backend API" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow
```

### Bước 7: Test

```powershell
# Test local
Invoke-WebRequest http://localhost:4000/health

# Hoặc dùng curl (nếu có)
curl http://localhost:4000/health
```

---

## 🔧 Quản lý hoàn toàn bằng Terminal

### Xem logs

```powershell
# Xem logs real-time
pm2 logs music_backend

# Xem logs cuối cùng (50 dòng)
pm2 logs music_backend --lines 50

# Chỉ xem errors
pm2 logs music_backend --err
```

### Restart/Stop/Start

```powershell
pm2 restart music_backend    # Restart
pm2 stop music_backend       # Stop
pm2 start music_backend      # Start
pm2 delete music_backend     # Xóa process
```

### Monitor

```powershell
# Monitor real-time (CPU, RAM, etc.)
pm2 monit

# Status
pm2 status

# Info chi tiết
pm2 info music_backend
```

### Auto-start khi reboot

```powershell
# Tạo startup script
pm2 startup

# Làm theo hướng dẫn hiển thị (sẽ có lệnh cần chạy as Administrator)
```

---

## 📝 Chỉnh sửa file bằng Terminal

### Dùng Notepad (Windows có sẵn)

```powershell
notepad .env
notepad src/server.js
```

### Dùng PowerShell để chỉnh sửa

```powershell
# Đọc file
Get-Content .env

# Tìm và thay thế
(Get-Content .env) -replace 'PORT=4000', 'PORT=5000' | Set-Content .env

# Thêm dòng mới
Add-Content .env "`nNEW_VAR=value"
```

### Dùng Nano (Nếu cài Git Bash hoặc WSL)

```powershell
# Trong Git Bash
nano .env

# Hoặc trong WSL
nano .env
```

---

## 🎯 Script Tự Động (Tối ưu nhất)

Tạo file `start.ps1`:

```powershell
# start.ps1
cd C:\music_backend
pm2 start src/server.js --name music_backend
pm2 logs music_backend
```

**Chạy:**
```powershell
.\start.ps1
```

---

## 📊 Tài nguyên tối thiểu

- **Node.js**: ~50MB (disk)
- **Dependencies**: ~100MB (disk)
- **PM2**: ~20MB (disk)
- **RAM khi chạy**: ~150-200MB
- **Tổng disk**: ~170MB
- **Tổng RAM**: ~200MB

**Với 1GB RAM, còn dư ~800MB!**

---

## ✅ Checklist Terminal-Only

- [ ] Node.js đã cài (`node --version`)
- [ ] Code đã upload/clone
- [ ] File .env đã tạo và cấu hình
- [ ] Dependencies đã cài (`npm install --production`)
- [ ] PM2 đã cài (`npm install -g pm2`)
- [ ] Server đã start (`pm2 start src/server.js --name music_backend`)
- [ ] Firewall đã mở (`New-NetFirewallRule ...`)
- [ ] Test thành công (`Invoke-WebRequest http://localhost:4000/health`)

---

## 🚀 Quick Commands

```powershell
# Start
pm2 start src/server.js --name music_backend

# Logs
pm2 logs music_backend

# Restart
pm2 restart music_backend

# Stop
pm2 stop music_backend

# Status
pm2 status

# Monitor
pm2 monit
```

---

## 💡 Tips

### 1. Tạo alias cho các lệnh thường dùng

```powershell
# Thêm vào PowerShell profile
notepad $PROFILE

# Thêm các alias:
function Start-Backend { pm2 start src/server.js --name music_backend }
function Stop-Backend { pm2 stop music_backend }
function Logs-Backend { pm2 logs music_backend }
function Restart-Backend { pm2 restart music_backend }

# Sau đó dùng:
Start-Backend
Logs-Backend
```

### 2. Chạy ở background (PM2 tự động làm)

PM2 tự động chạy ở background, không cần `&` hay `nohup`.

### 3. Xem tất cả processes

```powershell
# Xem tất cả Node.js processes
Get-Process node

# Xem tất cả processes
Get-Process | Sort-Object CPU -Descending
```

---

## 🎉 Kết luận

**Bạn chỉ cần:**
1. ✅ Node.js (1 lần cài)
2. ✅ Terminal (PowerShell - có sẵn)
3. ✅ PM2 (1 lần cài: `npm install -g pm2`)

**Không cần:**
- ❌ IDE (VS Code, Visual Studio, etc.)
- ❌ GUI tools
- ❌ Docker
- ❌ Các công cụ phát triển khác

**Tất cả quản lý bằng lệnh terminal!**

