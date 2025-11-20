# 🤖 Music App Crawler/Scheduler

Hệ thống crawler tự động để lấy dữ liệu từ ZingMp3 API và lưu vào MongoDB.

## 📋 Tổng quan

Crawler này sẽ:
- ✅ Lấy dữ liệu bài hát, nghệ sĩ, album, playlist, MV từ ZingMp3 API
- ✅ Map dữ liệu sang format MongoDB models
- ✅ Lưu vào database với upsert (không trùng lặp)
- ✅ Có thể chạy thủ công hoặc tự động theo lịch trình

## 🚀 Cài đặt

### 1. Cài đặt dependencies

```bash
cd music_backend
npm install axios node-cron dotenv
```

### 2. Cấu hình

Tạo file `.env` hoặc cập nhật các biến môi trường:

```env
# MongoDB
MONGO_URI=mongodb://127.0.0.1:27017/music_app

# ZingMp3 API
ZING_API_BASE_URL=http://localhost:4400

# Scheduler (optional)
SCHEDULER_ENABLED=true
```

## 📖 Sử dụng

### Chạy thủ công

```bash
# Chạy tất cả crawlers
node src/schedule/index.js

# Hoặc chỉ chạy một crawler cụ thể
node src/schedule/index.js songs
node src/schedule/index.js artists
node src/schedule/index.js albums
node src/schedule/index.js playlists
node src/schedule/index.js mvs
```

### Chạy tự động (Scheduler)

```bash
# Bật scheduler tự động
node src/schedule/index.js schedule
```

Scheduler sẽ:
- Chạy ngay lập tức lần đầu
- Sau đó chạy định kỳ theo cấu hình (mặc định: mỗi 6 giờ vào 2h sáng)

## 📁 Cấu trúc

```
schedule/
├── index.js                 # Entry point
├── scheduler.js             # Scheduler chính
├── config.js                # Cấu hình
├── services/
│   └── apiService.js        # Service gọi ZingMp3 API
├── utils/
│   └── dataMapper.js        # Map dữ liệu ZingMp3 → MongoDB
└── crawlers/
    ├── songCrawler.js       # Crawler cho Songs
    ├── artistCrawler.js     # Crawler cho Artists
    ├── albumCrawler.js      # Crawler cho Albums
    ├── playlistCrawler.js   # Crawler cho Playlists
    └── mvCrawler.js         # Crawler cho MVs
```

## 🎯 Các Crawler

### 1. Song Crawler
Lấy bài hát từ:
- Home page
- Top 100
- Chart Home
- New Release Chart
- Search (popular keywords)

**Dữ liệu lưu:**
- Thông tin bài hát (title, duration, thumbnail)
- Link streaming (128kbps, 320kbps)
- Lời bài hát (nếu có)
- Số lượt like, nghe, comment
- Artist IDs, Album ID, Genres

### 2. Artist Crawler
Lấy nghệ sĩ từ:
- Home page
- Search (popular artists)
- Songs đã có trong DB

**Dữ liệu lưu:**
- Tên nghệ sĩ
- Thumbnail
- Số lượt follow

### 3. Album Crawler
Lấy album từ:
- Songs đã có trong DB
- Artist pages

**Dữ liệu lưu:**
- Tên album
- Thumbnail
- Artist IDs
- Danh sách song IDs
- Số lượt like

### 4. Playlist Crawler
Lấy playlist từ:
- Home page
- Top 100
- Search

**Dữ liệu lưu:**
- Tên playlist
- Thumbnail, description
- Danh sách song IDs
- Số lượt like, follow, play

### 5. MV Crawler
Lấy MV từ:
- Search
- Artist pages

**Dữ liệu lưu:**
- Tên MV
- Thumbnail
- Link video (720p, 480p, 360p)
- Artist IDs
- Song ID (nếu có)

## ⚙️ Cấu hình

File `config.js`:

```javascript
{
  ZING_API_BASE_URL: 'http://localhost:4400',
  MONGO_URI: 'mongodb://127.0.0.1:27017/music_app',
  CRAWLER: {
    REQUEST_DELAY: 1000,        // Delay giữa các request (ms)
    MAX_SONGS_PER_BATCH: 50,    // Số song tối đa mỗi batch
    MAX_RETRIES: 3,             // Số lần retry khi lỗi
    REQUEST_TIMEOUT: 30000,     // Timeout (ms)
  },
  SCHEDULER: {
    CRAWL_INTERVAL_HOURS: 6,    // Chạy mỗi X giờ
    CRAWL_HOUR: 2,              // Chạy vào giờ Y (0-23)
    ENABLED: true,              // Bật/tắt scheduler
  }
}
```

## 📊 Logs

Crawler sẽ log chi tiết:
- ✅ Songs/Artists/Albums đã lưu
- 🔄 Songs/Artists/Albums đã cập nhật
- ❌ Lỗi xảy ra
- 📈 Tổng kết sau mỗi batch

## 🔧 Troubleshooting

### Lỗi kết nối MongoDB
```bash
# Kiểm tra MongoDB đang chạy
# Kiểm tra MONGO_URI trong .env
```

### Lỗi kết nối ZingMp3 API
```bash
# Kiểm tra API đang chạy ở http://localhost:4400
# Kiểm tra ZING_API_BASE_URL trong config
```

### Rate limit
- Tăng `REQUEST_DELAY` trong config
- Giảm số lượng requests mỗi batch

## 📝 Notes

- Crawler sử dụng **upsert** để tránh duplicate
- Streaming URLs có thể expire sau 24h (cần refresh)
- Một số dữ liệu có thể không có đầy đủ (do API ZingMp3)
- Crawler tự động skip các items đã xử lý trong cùng session

## 🎉 Kết quả

Sau khi chạy crawler, database sẽ có:
- ✅ Hàng trăm/thousands songs
- ✅ Hàng chục artists
- ✅ Nhiều albums và playlists
- ✅ MVs (nếu có)

Dữ liệu sẵn sàng cho app sử dụng! 🚀

