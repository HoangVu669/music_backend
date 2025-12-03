# 🧪 Test API - Hướng Dẫn Thủ Công

## ✅ Tin tốt!

Từ kết quả test, tôi thấy:
- ✅ **Port 4000 đang lắng nghe** (TCP 0.0.0.0:4000 và TCP [::]:4000)
- ✅ **Server đang chạy** (PID: 2208)

Bây giờ test API:

---

## 🧪 Test API Local (Trong VPS)

### Cách 1: Dùng PowerShell

```powershell
Invoke-WebRequest -Uri "http://localhost:4000/health" -UseBasicParsing
```

**Hoặc chỉ xem nội dung:**

```powershell
(Invoke-WebRequest -Uri "http://localhost:4000/health" -UseBasicParsing).Content
```

### Cách 2: Dùng Browser trên VPS

1. Mở **Internet Explorer** hoặc **Microsoft Edge**
2. Truy cập: `http://localhost:4000/health`
3. Bạn sẽ thấy JSON response:
   ```json
   {
     "status": "ok",
     "database": "connected",
     "message": "API is healthy"
   }
   ```

### Cách 3: Dùng CMD với PowerShell

```cmd
powershell -Command "(Invoke-WebRequest -Uri 'http://localhost:4000/health' -UseBasicParsing).Content"
```

---

## 🌐 Lấy Public IP

### Cách 1: Dùng PowerShell

```powershell
(Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing).Content
```

### Cách 2: Dùng CMD

```cmd
powershell -Command "(Invoke-WebRequest -Uri 'https://api.ipify.org' -UseBasicParsing).Content"
```

### Cách 3: Từ Browser

Mở browser và truy cập: **https://whatismyipaddress.com/**

---

## 🧪 Test API từ Bên Ngoài

Sau khi có Public IP (ví dụ: `123.45.67.89`):

### Từ máy tính khác hoặc điện thoại:

1. **Mở browser** (Chrome, Firefox, Safari, etc.)
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

### Hoặc dùng Postman:

1. Method: **GET**
2. URL: `http://YOUR_PUBLIC_IP:4000/health`
3. Click **Send**

---

## ✅ Checklist

- [x] Port 4000 đang lắng nghe (đã thấy trong test)
- [ ] Test local API thành công
- [ ] Đã lấy Public IP
- [ ] Test từ bên ngoài thành công

---

## 🔍 Kiểm tra Server Status

### Xem PM2 status:

```cmd
pm2 status
```

### Xem logs:

```cmd
pm2 logs music_backend
```

### Xem port đang lắng nghe:

```cmd
netstat -ano | findstr :4000
```

**Kết quả bạn đã thấy:**
```
TCP    0.0.0.0:4000           0.0.0.0:0              LISTENING      2208
TCP    [::]:4000              [::]:0                 LISTENING      2208
```

Điều này có nghĩa:
- ✅ Server đang lắng nghe trên **tất cả interfaces** (0.0.0.0)
- ✅ Có thể truy cập từ **bên ngoài** (sau khi mở firewall)
- ✅ Process ID: **2208**

---

## 🎯 Quick Test Commands

### Test local:

```cmd
powershell -Command "(Invoke-WebRequest -Uri 'http://localhost:4000/health' -UseBasicParsing).Content"
```

### Lấy Public IP:

```cmd
powershell -Command "(Invoke-WebRequest -Uri 'https://api.ipify.org' -UseBasicParsing).Content"
```

### Test từ bên ngoài (sau khi có Public IP):

Mở browser và truy cập:
```
http://YOUR_PUBLIC_IP:4000/health
```

---

## ⚠️ Nếu không truy cập được từ bên ngoài

### Kiểm tra Firewall:

```cmd
netsh advfirewall firewall show rule name="Music Backend API"
```

Nếu không thấy rule, chạy lại:
```cmd
open-firewall.bat
```

### Kiểm tra Provider Firewall:

Một số VPS provider có firewall riêng. Kiểm tra trong control panel của provider:
- Security Groups
- Firewall Rules
- Network Settings

Cần mở port 4000 (TCP, Inbound).

---

## 🎉 Sau khi test thành công

API của bạn sẽ có thể truy cập từ bất cứ đâu tại:

```
http://YOUR_PUBLIC_IP:4000
```

**Ví dụ:**
- Health check: `http://123.45.67.89:4000/health`
- API base: `http://123.45.67.89:4000/api/v1/...`

**Bạn có thể dùng API này trong Flutter app!**

