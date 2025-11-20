# 🔗 ZingMp3 API Integration

## ✅ Đã tích hợp ZingMp3 API vào Backend

ZingMp3 API đã được tích hợp trực tiếp vào backend, **chỉ cần chạy 1 port duy nhất** (4000).

---

## 🎯 Cách hoạt động

### **Trước đây (2 ports):**
- Backend: `http://localhost:4000`
- ZingMp3 API: `http://localhost:4400`
- Backend gọi HTTP → ZingMp3 API

### **Bây giờ (1 port):**
- Backend: `http://localhost:4000`
- ZingMp3 API: **Tích hợp internal** trong backend
- Backend gọi **direct library** → `zingmp3-api-full-v3`

---

## 📍 API Endpoints

### **ZingMp3 Direct API** (Internal)
Tất cả endpoints mount tại `/api/zing`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/zing/song` | GET | Lấy streaming URL |
| `/api/zing/infosong` | GET | Lấy thông tin bài hát |
| `/api/zing/lyric` | GET | Lấy lời bài hát |
| `/api/zing/home` | GET | Lấy dữ liệu trang chủ |
| `/api/zing/top100` | GET | Lấy Top 100 |
| `/api/zing/charthome` | GET | Lấy Chart Home |
| `/api/zing/newreleasechart` | GET | Lấy New Release Chart |
| `/api/zing/search` | GET | Tìm kiếm |
| `/api/zing/suggest` | GET | Lấy từ khóa gợi ý |
| `/api/zing/artist` | GET | Lấy thông tin nghệ sĩ |
| `/api/zing/artistsong` | GET | Lấy danh sách bài hát của nghệ sĩ |
| `/api/zing/detailplaylist` | GET | Lấy chi tiết playlist |
| `/api/zing/listmv` | GET | Lấy danh sách MV |
| `/api/zing/categorymv` | GET | Lấy danh mục MV |
| `/api/zing/video` | GET | Lấy link video |

### **User API** (Sử dụng ZingMp3 internal)
Tất cả endpoints mount tại `/api/v1/user`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/user/home` | GET | Lấy dữ liệu trang chủ |
| `/api/v1/user/charts/top100` | GET | Lấy Top 100 |
| `/api/v1/user/charts/home` | GET | Lấy Chart Home |
| `/api/v1/user/charts/new-release` | GET | Lấy New Release Chart |
| `/api/v1/user/songs/search` | GET | Tìm kiếm |
| `/api/v1/user/songs/:songId` | GET | Lấy bài hát (với streaming URL) |
| `/api/v1/user/songs/:songId/stream` | GET | Lấy streaming URL |
| `/api/v1/user/songs/:songId/lyric` | GET | Lấy lời bài hát |

---

## 🔄 Thay đổi

### **1. zingmp3Service.js**
- **Trước:** Gọi HTTP external (`http://localhost:4400`)
- **Bây giờ:** Gọi direct library (`zingmp3-api-full-v3`)

### **2. Thêm ZingMp3 Routes**
- Tạo `src/routes/zingmp3.js`
- Mount tại `/api/zing`
- Có thể gọi trực tiếp nếu cần

### **3. Thêm ZingMp3 Controller**
- Tạo `src/controllers/zingmp3Controller.js`
- Xử lý tất cả ZingMp3 API calls

---

## 🚀 Cách sử dụng

### **Option 1: Dùng User API (Khuyến nghị)**
```bash
# Home
GET http://localhost:4000/api/v1/user/home

# Top 100
GET http://localhost:4000/api/v1/user/charts/top100

# Search
GET http://localhost:4000/api/v1/user/songs/search?keyword=Sơn Tùng
```

### **Option 2: Dùng ZingMp3 Direct API**
```bash
# Home
GET http://localhost:4000/api/zing/home

# Top 100
GET http://localhost:4000/api/zing/top100

# Search
GET http://localhost:4000/api/zing/search?keyword=Sơn Tùng
```

---

## ⚙️ Environment Variables

**KHÔNG CẦN** `ZING_API_BASE_URL` nữa vì không gọi HTTP external.

Chỉ cần:
```env
MONGO_URI=mongodb://127.0.0.1:27017/music_app
PORT=4000
JWT_SECRET=your-secret
```

---

## 📊 So sánh

| Aspect | Trước (2 ports) | Bây giờ (1 port) |
|--------|-----------------|------------------|
| **Ports** | 4000 + 4400 | 4000 |
| **HTTP Calls** | Backend → ZingMp3 API | Direct library |
| **Performance** | Chậm hơn (HTTP overhead) | Nhanh hơn (direct call) |
| **Complexity** | Phức tạp hơn | Đơn giản hơn |
| **Dependencies** | Cần chạy 2 servers | Chỉ cần 1 server |

---

## ✅ Lợi ích

1. ✅ **Đơn giản hơn** - Chỉ cần chạy 1 server
2. ✅ **Nhanh hơn** - Không có HTTP overhead
3. ✅ **Ổn định hơn** - Không phụ thuộc external HTTP service
4. ✅ **Dễ deploy** - Chỉ cần deploy 1 service
5. ✅ **Ít resource** - Không cần 2 Node.js processes

---

## 🔧 Migration

Nếu bạn đang dùng ZingMp3 API external (port 4400):

1. ✅ **Đã tự động migrate** - `zingmp3Service` đã được update
2. ✅ **User APIs vẫn hoạt động** - Không cần thay đổi gì
3. ✅ **Có thể tắt ZingMp3 API server** - Không cần chạy port 4400 nữa

---

*Generated: 16/11/2025*


