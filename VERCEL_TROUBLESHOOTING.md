# Hướng dẫn xử lý lỗi Vercel và MongoDB Atlas

## 1. Xem Log trên Vercel

### Cách 1: Qua Dashboard
1. Vào [Vercel Dashboard](https://vercel.com/dashboard)
2. Chọn project của bạn
3. Vào tab **"Deployments"**
4. Click vào deployment mới nhất
5. Vào tab **"Functions"** hoặc **"Logs"**
6. Xem các log real-time

### Cách 2: Qua CLI
```bash
# Xem log của deployment mới nhất
vercel logs

# Xem log real-time (follow mode)
vercel logs --follow

# Xem log của một deployment cụ thể
vercel logs [deployment-url]
```

## 2. Kiểm tra Environment Variables

1. Vào Vercel Dashboard → Project → **Settings** → **Environment Variables**
2. Đảm bảo có các biến sau:
   - `MONGO_URI`: Connection string từ MongoDB Atlas
   - `JWT_SECRET`: Secret key cho JWT (nếu cần)
   - `NODE_ENV`: `production` (tự động set bởi Vercel)

3. **Quan trọng**: Sau khi thêm/sửa environment variables, bạn **PHẢI redeploy**:
   - Vào tab **"Deployments"**
   - Click **"Redeploy"** trên deployment mới nhất
   - Hoặc push một commit mới lên Git

## 3. Kiểm tra MongoDB Atlas Connection

### 3.1. Network Access (IP Whitelisting)
**Đây là nguyên nhân phổ biến nhất của lỗi connection!**

1. Vào [MongoDB Atlas Dashboard](https://cloud.mongodb.com/)
2. Chọn cluster của bạn
3. Vào **"Network Access"** (bên trái)
4. Click **"Add IP Address"**
5. Có 2 lựa chọn:
   - **Option 1 (Khuyến nghị cho development)**: Click **"Allow Access from Anywhere"** → Điền `0.0.0.0/0`
   - **Option 2 (Bảo mật hơn)**: Thêm IP của Vercel (nhưng Vercel dùng nhiều IP động, nên option 1 dễ hơn)
6. Click **"Confirm"**

**Lưu ý**: Thay đổi này có thể mất vài phút để có hiệu lực.

### 3.2. Database User
1. Vào **"Database Access"** (bên trái)
2. Đảm bảo bạn có một user với quyền **"Read and write to any database"**
3. Nếu chưa có, tạo user mới:
   - Click **"Add New Database User"**
   - Chọn **"Password"** authentication
   - Tạo username và password (lưu lại!)
   - Chọn **"Atlas admin"** role
   - Click **"Add User"**

### 3.3. Connection String
1. Vào **"Database"** → Click **"Connect"** trên cluster
2. Chọn **"Connect your application"**
3. Copy connection string, format:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/<database-name>?retryWrites=true&w=majority
   ```
4. Thay `<username>`, `<password>`, và `<database-name>` bằng giá trị thực tế
5. Đảm bảo password được URL-encoded (ví dụ: `@` thành `%40`)

### 3.4. Set MONGO_URI trong Vercel
1. Vào Vercel Dashboard → Project → **Settings** → **Environment Variables**
2. Thêm biến:
   - **Key**: `MONGO_URI`
   - **Value**: Connection string đã chỉnh sửa ở bước trên
   - **Environment**: Chọn tất cả (Production, Preview, Development)
3. Click **"Save"**
4. **Redeploy** project!

## 4. Test Connection

Sau khi đã cấu hình xong, test bằng cách:

```bash
# Test health endpoint
curl https://your-project.vercel.app/health

# Kết quả mong đợi:
{
  "status": "ok",
  "uptime": 123.45,
  "database": "connected",
  "environment": "production",
  "mongoUriSet": true
}
```

Nếu `database: "error"`, xem `databaseError` trong response để biết lỗi cụ thể.

## 5. Các lỗi thường gặp

### Lỗi: "MongooseServerSelectionError: Could not connect to any servers"
**Nguyên nhân**: IP không được whitelist trong MongoDB Atlas
**Giải pháp**: Xem mục 3.1 (Network Access)

### Lỗi: "MongooseError: Operation buffering timed out"
**Nguyên nhân**: 
- IP không được whitelist
- Connection string sai
- Database user không có quyền
**Giải pháp**: Kiểm tra lại mục 3.1, 3.2, 3.3

### Lỗi: "Authentication failed"
**Nguyên nhân**: Username/password sai trong connection string
**Giải pháp**: 
- Kiểm tra lại username/password
- Đảm bảo password được URL-encoded
- Tạo lại database user nếu cần

### Lỗi: "MONGO_URI environment variable is not set"
**Nguyên nhân**: Chưa set biến môi trường trong Vercel
**Giải pháp**: Xem mục 2 và 3.4

## 6. Debug Tips

1. **Xem log chi tiết**: Vercel logs sẽ hiển thị lỗi cụ thể
2. **Test connection string local**: Copy `MONGO_URI` và test bằng MongoDB Compass hoặc `mongosh`
3. **Kiểm tra format**: Đảm bảo connection string đúng format MongoDB Atlas
4. **Wait time**: Sau khi thay đổi Network Access, đợi 2-3 phút
5. **Redeploy**: Luôn nhớ redeploy sau khi thay đổi environment variables

## 7. Checklist

- [ ] MongoDB Atlas cluster đã được tạo
- [ ] Database user đã được tạo với quyền admin
- [ ] Network Access đã allow `0.0.0.0/0` hoặc IP của Vercel
- [ ] Connection string đã được copy và chỉnh sửa đúng
- [ ] `MONGO_URI` đã được set trong Vercel Environment Variables
- [ ] Project đã được redeploy sau khi set environment variables
- [ ] `/health` endpoint trả về `database: "connected"`


