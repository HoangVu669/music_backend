# ⚠️ Node.js trên Windows Server 2012 R2

## 🔴 Vấn đề

Windows Server 2012 R2 (Version 6.3.9600) **không được Node.js hỗ trợ chính thức**.

Node.js chỉ hỗ trợ:
- ✅ Windows 10
- ✅ Windows Server 2016 trở lên

---

## ✅ Giải pháp: Bỏ qua kiểm tra nền tảng

Bạn có thể set biến môi trường `NODE_SKIP_PLATFORM_CHECK=1` để bỏ qua kiểm tra này.

**⚠️ Lưu ý:** Node.js có thể hoạt động, nhưng không được đảm bảo 100% và có thể gặp lỗi.

---

## 🚀 Cách 1: Set biến môi trường tạm thời (Chỉ cho session hiện tại)

### Trong CMD:

```cmd
set NODE_SKIP_PLATFORM_CHECK=1
node --version
```

### Trong PowerShell:

```powershell
$env:NODE_SKIP_PLATFORM_CHECK=1
node --version
```

**Lưu ý:** Biến này chỉ có hiệu lực trong cửa sổ terminal hiện tại. Khi đóng terminal, biến sẽ mất.

---

## 🚀 Cách 2: Set biến môi trường vĩnh viễn (Khuyến nghị)

### Bước 1: Mở System Properties

1. Nhấn `Windows + Pause/Break` (hoặc Right-click "This PC" → Properties)
2. Click **"Advanced system settings"**
3. Click **"Environment Variables"**

### Bước 2: Thêm biến môi trường

1. Trong phần **"User variables"** hoặc **"System variables"**, click **"New"**
2. **Variable name:** `NODE_SKIP_PLATFORM_CHECK`
3. **Variable value:** `1`
4. Click **"OK"** → **"OK"** → **"OK"**

### Bước 3: Mở lại CMD/PowerShell

**Quan trọng:** Phải đóng và mở lại terminal để biến môi trường có hiệu lực.

```cmd
node --version
```

Bây giờ sẽ không còn cảnh báo nữa!

---

## 🚀 Cách 3: Set bằng lệnh (Nhanh nhất)

### Trong CMD (as Administrator):

```cmd
setx NODE_SKIP_PLATFORM_CHECK 1
```

### Trong PowerShell (as Administrator):

```powershell
[Environment]::SetEnvironmentVariable("NODE_SKIP_PLATFORM_CHECK", "1", "User")
```

**Sau đó đóng và mở lại terminal.**

---

## 🔧 Tạo script khởi động tự động

Để đảm bảo biến môi trường luôn được set, bạn có thể tạo script khởi động:

### Tạo file `start-with-check.bat`:

```batch
@echo off
REM Set biến môi trường và chạy server
set NODE_SKIP_PLATFORM_CHECK=1
cd /d C:\music_backend
pm2 start src/server.js --name music_backend
pm2 logs music_backend
```

### Tạo file `start-with-check.ps1`:

```powershell
# Set biến môi trường và chạy server
$env:NODE_SKIP_PLATFORM_CHECK=1
cd C:\music_backend
pm2 start src/server.js --name music_backend
pm2 logs music_backend
```

---

## ⚠️ Cảnh báo và Lưu ý

### 1. Node.js có thể không hoạt động hoàn hảo

- Một số tính năng có thể không hoạt động
- Có thể gặp lỗi không mong đợi
- Không được hỗ trợ chính thức

### 2. Khuyến nghị

**Option 1: Upgrade Windows Server**
- Upgrade lên Windows Server 2016/2019/2022 (hỗ trợ Node.js tốt hơn)

**Option 2: Dùng Linux VPS**
- Linux nhẹ hơn, hỗ trợ Node.js tốt hơn
- 1GB RAM đủ cho Linux + Node.js

**Option 3: Thử Node.js phiên bản cũ**
- Node.js v16 hoặc v14 có thể hoạt động tốt hơn trên Windows Server 2012 R2
- Download từ: https://nodejs.org/en/download/releases/

---

## 🧪 Test Node.js sau khi set biến môi trường

```cmd
# Test version
node --version

# Test npm
npm --version

# Test chạy script đơn giản
node -e "console.log('Hello from Node.js!')"
```

Nếu tất cả đều chạy được, bạn có thể tiếp tục!

---

## 🚀 Setup sau khi fix

Sau khi set `NODE_SKIP_PLATFORM_CHECK=1`, tiếp tục setup như bình thường:

```cmd
# 1. Điều hướng
cd C:\music_backend

# 2. Cài dependencies
npm install --production

# 3. Cài PM2
npm install -g pm2

# 4. Chạy server
pm2 start src/server.js --name music_backend
pm2 logs music_backend
```

---

## 📝 Checklist

- [ ] Đã set biến môi trường `NODE_SKIP_PLATFORM_CHECK=1`
- [ ] Đã đóng và mở lại terminal
- [ ] `node --version` chạy được (không còn cảnh báo)
- [ ] `npm --version` chạy được
- [ ] Đã test chạy script Node.js đơn giản
- [ ] Tiếp tục setup như bình thường

---

## 🎯 Quick Fix (Copy/Paste)

### CMD (as Administrator):

```cmd
setx NODE_SKIP_PLATFORM_CHECK 1
```

**Đóng và mở lại CMD, sau đó:**

```cmd
cd C:\music_backend
node --version
npm install --production
npm install -g pm2
pm2 start src/server.js --name music_backend
```

### PowerShell (as Administrator):

```powershell
[Environment]::SetEnvironmentVariable("NODE_SKIP_PLATFORM_CHECK", "1", "User")
```

**Đóng và mở lại PowerShell, sau đó:**

```powershell
cd C:\music_backend
node --version
npm install --production
npm install -g pm2
pm2 start src/server.js --name music_backend
```

---

## ✅ Kết luận

Sau khi set `NODE_SKIP_PLATFORM_CHECK=1`, Node.js sẽ chạy được trên Windows Server 2012 R2, nhưng:
- ⚠️ Không được hỗ trợ chính thức
- ⚠️ Có thể gặp lỗi không mong đợi
- ✅ Thường vẫn hoạt động tốt cho các ứng dụng cơ bản

**Nếu gặp lỗi nghiêm trọng, nên cân nhắc upgrade Windows Server hoặc dùng Linux VPS.**

