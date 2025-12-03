# 🌐 Công bố Server - Cho phép truy cập từ bên ngoài

## ✅ Server đã chạy!

Từ hình ảnh, server của bạn đã chạy thành công:
- ✅ Status: **online**
- ✅ Memory: **76.3mb**
- ✅ Process ID: **0**

Bây giờ cần làm các bước sau để có thể truy cập API từ bất cứ đâu.

---

## 🔒 Bước 1: Mở Firewall (Quan trọng!)

Firewall đang chặn port 4000, cần mở để truy cập từ bên ngoài.

### Cách 1: Dùng PowerShell (as Administrator)

```powershell
New-NetFirewallRule -DisplayName "Music Backend API" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow
```

### Cách 2: Dùng CMD (as Administrator)

```cmd
netsh advfirewall firewall add rule name="Music Backend API" dir=in action=allow protocol=TCP localport=4000
```

### Cách 3: Dùng GUI

1. Mở **Windows Firewall with Advanced Security**
2. Click **Inbound Rules** → **New Rule**
3. Chọn **Port** → **Next**
4. Chọn **TCP** → **Specific local ports**: `4000` → **Next**
5. Chọn **Allow the connection** → **Next**
6. Chọn tất cả (Domain, Private, Public) → **Next**
7. Name: `Music Backend API` → **Finish**

---

## 🧪 Bước 2: Test API từ local

### Test trong CMD/PowerShell:

```cmd
curl http://localhost:4000/health
```

**Hoặc:**

```powershell
Invoke-WebRequest http://localhost:4000/health
```

**Kết quả mong đợi:**
```json
{
  "status": "ok",
  "database": "connected",
  "message": "API is healthy"
}
```

Nếu thấy kết quả này, server đang chạy tốt!

---

## 🌐 Bước 3: Lấy Public IP của VPS

### Cách 1: Từ VPS (PowerShell)

```powershell
# Lấy IP public
Invoke-RestMethod -Uri "https://api.ipify.org?format=json"
```

**Hoặc:**

```powershell
(Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing).Content
```

### Cách 2: Từ Browser trên VPS

Truy cập: https://whatismyipaddress.com/

### Cách 3: Từ Provider

Kiểm tra trong control panel của nhà cung cấp VPS (thường có thông tin Public IP).

---

## 🧪 Bước 4: Test API từ bên ngoài

### Từ máy tính khác hoặc điện thoại:

1. **Mở browser** hoặc dùng **Postman/curl**
2. Truy cập:
   ```
   http://YOUR_PUBLIC_IP:4000/health
   ```
   Thay `YOUR_PUBLIC_IP` bằng IP public của VPS.

**Kết quả mong đợi:**
```json
{
  "status": "ok",
  "database": "connected",
  "message": "API is healthy"
}
```

### Test bằng curl (từ máy khác):

```bash
curl http://YOUR_PUBLIC_IP:4000/health
```

### Test bằng Postman:

1. Method: **GET**
2. URL: `http://YOUR_PUBLIC_IP:4000/health`
3. Click **Send**

---

## 🔍 Bước 5: Kiểm tra Port đang lắng nghe

### Trong CMD/PowerShell:

```cmd
netstat -ano | findstr :4000
```

**Kết quả mong đợi:**
```
TCP    0.0.0.0:4000           0.0.0.0:0              LISTENING       <PID>
TCP    [::]:4000              [::]:0                 LISTENING       <PID>
```

Nếu thấy `0.0.0.0:4000` hoặc `[::]:4000`, server đang lắng nghe trên tất cả interfaces (có thể truy cập từ bên ngoài).

---

## ⚠️ Troubleshooting

### 1. Không truy cập được từ bên ngoài

**Kiểm tra Firewall:**
```powershell
Get-NetFirewallRule -DisplayName "Music Backend API"
```

**Kiểm tra Port:**
```cmd
netstat -ano | findstr :4000
```

**Kiểm tra PM2:**
```cmd
pm2 status
pm2 logs music_backend
```

### 2. Firewall đã mở nhưng vẫn không truy cập được

**Có thể do:**
- VPS đằng sau NAT/Router (cần port forwarding)
- Provider chặn port (kiểm tra security group/firewall của provider)
- Windows Firewall chưa apply rule

**Giải pháp:**
- Kiểm tra security group/firewall trong control panel của provider
- Liên hệ support của provider để mở port 4000

### 3. Server không chạy

```cmd
# Kiểm tra status
pm2 status

# Xem logs
pm2 logs music_backend

# Restart nếu cần
pm2 restart music_backend
```

---

## 📋 Checklist

- [ ] Server đã chạy (`pm2 status` → online)
- [ ] Firewall đã mở port 4000
- [ ] Test local thành công (`http://localhost:4000/health`)
- [ ] Đã lấy Public IP
- [ ] Test từ bên ngoài thành công (`http://YOUR_PUBLIC_IP:4000/health`)
- [ ] Port đang lắng nghe (`netstat -ano | findstr :4000`)

---

## 🎯 Quick Commands

```cmd
# Mở firewall
netsh advfirewall firewall add rule name="Music Backend API" dir=in action=allow protocol=TCP localport=4000

# Test local
curl http://localhost:4000/health

# Lấy Public IP
powershell -Command "(Invoke-WebRequest -Uri 'https://api.ipify.org' -UseBasicParsing).Content"

# Kiểm tra port
netstat -ano | findstr :4000

# Xem logs
pm2 logs music_backend

# Restart
pm2 restart music_backend
```

---

## ✅ Sau khi hoàn thành

API của bạn sẽ có thể truy cập từ bất cứ đâu tại:

```
http://YOUR_PUBLIC_IP:4000
```

**Ví dụ:**
- Health check: `http://123.45.67.89:4000/health`
- API base: `http://123.45.67.89:4000/api/v1/...`

---

## 🔐 Bảo mật (Tùy chọn - Sau này)

Sau khi test thành công, bạn có thể:
1. **Thêm authentication** cho các endpoints
2. **Dùng HTTPS** (cần SSL certificate)
3. **Giới hạn IP** truy cập (nếu cần)
4. **Rate limiting** để tránh abuse

Nhưng trước tiên, hãy test xem API có hoạt động từ bên ngoài không!

