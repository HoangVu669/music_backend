# Performance Optimization Guide

## Tổng quan vấn đề

Dự án chạy mượt trên local nhưng chậm khi deploy lên server (Vercel). Các nguyên nhân chính:

1. **Vercel Serverless Cold Start**: Mỗi function phải khởi động lại sau thời gian không dùng
2. **Database Connection**: Connection bị mất giữa các requests trong serverless
3. **Thiếu Indexes**: Một số queries không có compound indexes tối ưu
4. **Queries chưa tối ưu**: N+1 queries, thiếu lean(), select không cần thiết

## Các cải tiến đã thực hiện

### 1. Database Connection Optimization (`src/config/db.js`)

- ✅ Tối ưu connection pooling cho serverless:
  - Giảm `maxPoolSize` từ 10 → 5 cho Vercel
  - Giảm `minPoolSize` từ 2 → 0 (không giữ connection khi idle)
  - Giảm `maxIdleTimeMS` từ 30s → 10s
  - Tăng `heartbeatFrequencyMS` từ 10s → 5s
  - Thêm `keepAlive` và `keepAliveInitialDelay`

- ✅ Giảm timeout cho serverless:
  - `serverSelectionTimeoutMS`: 5s → 3s

### 2. Compound Indexes

- ✅ **SongComment** (`src/models/SongComment.js`):
  - Thêm index: `{ songId: 1, isDeleted: 1, parentCommentId: 1, createdAt: -1 }`
  - Tối ưu query `getSongComments()`

- ✅ **CommentReply** (`src/models/CommentReply.js`):
  - Thêm index: `{ commentId: 1, isDeleted: 1, createdAt: 1 }`
  - Tối ưu query replies

### 3. Query Optimization (`src/services/user/socialService.js`)

- ✅ **getSongComments()**:
  - Thêm `.select()` để chỉ lấy fields cần thiết
  - Dùng `Map` thay vì object để group replies (O(1) lookup)
  - Early return nếu không có comments

- ✅ **getLikedSongs()**:
  - Dùng `Map` thay vì `find()` để lookup songs (O(1) thay vì O(n))
  - Giới hạn số lượng ZingMp3 API calls (max 5 songs missing)
  - Batch fetch missing songs thay vì từng cái một

### 4. Server Middleware (`src/server.js`)

- ✅ Tối ưu database middleware:
  - Skip health check và static files
  - Thêm timeout 3s cho database connection
  - Better error handling

### 5. Vercel Configuration (`vercel.json`)

- ✅ Tăng resources:
  - `maxDuration`: 10s → 30s
  - `memory`: 1024MB → 3008MB
  - Thêm `regions: ["sin1"]` (Singapore - gần Việt Nam)

### 6. Auth Controller (`src/controllers/user/authController.js`)

- ✅ Tối ưu login query:
  - Dùng `$or` để tìm user trong 1 query thay vì 2 queries riêng biệt
  - Dùng `.lean()` để tăng tốc độ

## Các khuyến nghị thêm (chưa implement)

### 1. Caching Layer

Cân nhắc thêm caching cho các queries thường dùng:

```javascript
// Ví dụ: Cache song info, home data, charts
// Có thể dùng Redis hoặc in-memory cache (node-cache)
```

**Endpoints nên cache:**
- `/api/v1/user/home` (5-10 phút)
- `/api/v1/user/charts/*` (15-30 phút)
- `/api/v1/user/songs/:songId` (1-5 phút)
- `/api/v1/user/artists/:artistId` (10-15 phút)

### 2. Database Indexes

Kiểm tra và thêm indexes cho các queries thường dùng:

```javascript
// Ví dụ: Thêm index cho UserFollow
UserFollowSchema.index({ followerId: 1, followingId: 1, createdAt: -1 });

// Thêm index cho Room queries
RoomSchema.index({ ownerId: 1, isActive: 1, updatedAt: -1 });
```

### 3. Response Compression

Thêm compression middleware:

```javascript
const compression = require('compression');
app.use(compression());
```

### 4. Connection Pooling cho External APIs

Nếu gọi ZingMp3 API nhiều, cân nhắc:
- Batch requests
- Connection pooling với axios
- Rate limiting

### 5. Monitoring & Logging

Thêm monitoring để track:
- Response times
- Database query times
- Cold start frequency
- Error rates

Có thể dùng:
- Vercel Analytics
- Sentry
- Custom logging với Winston

### 6. Database Query Optimization

Kiểm tra các queries chậm:

```javascript
// Enable query logging trong development
mongoose.set('debug', process.env.NODE_ENV === 'development');

// Sử dụng explain() để analyze queries
const explain = await Model.find({...}).explain('executionStats');
```

### 7. Consider Alternative Deployment

Nếu Vercel vẫn chậm, cân nhắc:
- **Railway**: Better cho long-running connections
- **Render**: Similar to Vercel nhưng có persistent connections
- **DigitalOcean App Platform**: More control
- **AWS Lambda + API Gateway**: More configuration options

## Testing Performance

### Local Testing

```bash
# Test với autocannon
npm install -g autocannon
autocannon -c 10 -d 30 http://localhost:4000/api/v1/user/home
```

### Production Testing

1. Monitor Vercel Analytics
2. Check response times trong browser DevTools
3. Test với different regions
4. Monitor database connection pool

## Metrics to Monitor

- **Response Time**: < 500ms cho cached, < 2s cho uncached
- **Database Connection Time**: < 100ms
- **Cold Start Time**: < 3s
- **Error Rate**: < 1%

## Next Steps

1. ✅ Đã hoàn thành: Database connection, indexes, query optimization
2. ⏳ Cần làm: Implement caching layer
3. ⏳ Cần làm: Add compression middleware
4. ⏳ Cần làm: Setup monitoring
5. ⏳ Cần làm: Performance testing

## Notes

- Vercel serverless có cold start ~1-3s, đây là limitation của platform
- Database connection pooling cần được tối ưu cho serverless (không giữ connections lâu)
- Compound indexes rất quan trọng cho queries phức tạp
- `.lean()` và `.select()` giúp giảm memory và tăng tốc độ đáng kể

