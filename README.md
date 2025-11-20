## Music Backend (Node.js + Express + MongoDB)

### 🚀 Quick Start

```bash
npm install
npm run dev
```

Server sẽ chạy tại: `http://localhost:4000`

### 📍 API Endpoints

- **Health:** `GET /health`
- **User APIs:** `/api/v1/user/*`
- **Admin APIs:** `/api/v1/admin/*`
- **ZingMp3 Direct APIs:** `/api/zing/*` (internal - tích hợp sẵn)

### ⚙️ Environment Variables

```env
MONGO_URI=mongodb://127.0.0.1:27017/music_app
PORT=4000
JWT_SECRET=your-secret
```

**Lưu ý:** Không cần `ZING_API_BASE_URL` nữa vì ZingMp3 API đã được tích hợp internal.

### 📚 Documentation

- `API_DOCUMENTATION.md` - Full API documentation
- `ZINGMP3_INTEGRATION.md` - ZingMp3 integration details
- `POSTMAN_SETUP.md` - Postman collection setup
- `USER_API_SUMMARY.md` - User API summary

### 🔧 Scripts

- `npm run dev`: Start in watch mode
- `npm start`: Start server
- `npm run crawl`: Run crawlers manually
- `npm run crawl:songs`: Crawl songs only
- `npm run crawl:schedule`: Run scheduled crawlers


