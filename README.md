# 🎵 Music Streaming API

Ứng dụng nghe nhạc trực tuyến với API hoàn chỉnh, hỗ trợ quản lý bài hát, playlist, ca sĩ, tương tác xã hội và nghe nhạc theo nhóm trong thời gian thực.

## ✨ Tính năng chính

### 🎵 Quản lý nội dung
- Quản lý bài hát, ca sĩ, album
- Tạo và quản lý playlist
- Tích hợp ZingMp3 API để lấy dữ liệu nhạc
- Upload và stream file nhạc

### 👥 Tương tác xã hội
- Hệ thống follow/unfollow
- Like và comment bài hát
- Chia sẻ playlist
- Thông báo real-time

### 🎧 Nghe nhạc nhóm
- Tạo phòng nghe nhạc chung
- Chat trong phòng
- Điều khiển phát nhạc tập thể
- WebSocket cho real-time features

### 👨‍💼 Admin Panel
- Quản lý user và nội dung
- Duyệt bài hát và playlist
- Thống kê và báo cáo
- Upload và quản lý file

## 🚀 Công nghệ sử dụng

- **Backend**: Node.js, Express.js
- **Database**: MongoDB với Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **Validation**: express-validator
- **Security**: Helmet, bcryptjs, cors
- **Real-time**: WebSocket (Socket.io - planned)
- **External API**: ZingMp3 integration

## 📦 Cài đặt

1. **Clone repository:**
```bash
git clone <repository-url>
cd music_api
```

2. **Cài đặt dependencies:**
```bash
npm install
```

3. **Tạo file `.env` từ `env.example`:**
```bash
cp env.example .env
```

4. **Cấu hình environment variables trong `.env`:**
```env
# Database
MONGODB_URI=mongodb://localhost:27017/music_api

# JWT
JWT_SECRET=your_jwt_secret_key

# Server
PORT=3000
NODE_ENV=development

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

5. **Chạy server:**
```bash
# Development
npm run dev

# Production
npm start
```

## 📚 Cấu trúc API

### User APIs
- **Authentication**: `/api/auth/*`
- **Users**: `/api/users/*`
- **Songs**: `/api/songs/*`
- **Artists**: `/api/artists/*`
- **Albums**: `/api/albums/*`
- **Playlists**: `/api/playlists/*`
- **Groups**: `/api/groups/*`
- **Notifications**: `/api/notifications/*`
- **Comments**: `/api/comments/*`

### Admin APIs
- **Authentication**: `/api/admin/auth/*`
- **User Management**: `/api/admin/users/*`
- **Content Management**: `/api/admin/songs/*`, `/api/admin/artists/*`, `/api/admin/albums/*`
- **Reports**: `/api/admin/reports/*`

### ZingMp3 Integration
- **Songs**: `/api/songs/zing/*`
- **Artists**: `/api/artists/zing/*`
- **Albums**: `/api/albums/zing/*`

## 📖 API Documentation

Xem file `API_DESIGN_SUMMARY.md` để biết chi tiết về:
- Tất cả endpoints
- Request/Response format
- Validation rules
- Error handling
- Authentication flow

## 🗄️ Models

### Core Models
- **User**: Thông tin người dùng, subscription, stats
- **Song**: Bài hát với metadata và file info
- **Artist**: Thông tin ca sĩ
- **Album**: Album và thông tin liên quan
- **Playlist**: Playlist với collaborators

### Social Models
- **Comment**: Bình luận bài hát với replies
- **Like**: Like bài hát
- **Follow**: Follow user
- **Notification**: Thông báo hệ thống

### Group Models
- **Group**: Phòng nghe nhạc với queue và chat

## 🔐 Security Features

- JWT authentication
- Role-based access control
- Input validation với express-validator
- Password hashing với bcrypt
- Rate limiting
- CORS protection
- Helmet security headers

## 📁 File Upload

- Audio files: MP3, WAV, FLAC, AAC
- Images: JPEG, PNG, GIF
- File size limits
- Secure file storage
- File type validation

## ⚡ Real-time Features (Planned)

- WebSocket cho group listening
- Real-time chat
- Synchronized music playback
- Live notifications

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 🚀 Deployment

### Production Checklist
- [ ] Set production environment variables
- [ ] Configure MongoDB Atlas
- [ ] Set up file storage (AWS S3/Cloudinary)
- [ ] Configure reverse proxy (Nginx)
- [ ] Set up SSL certificates
- [ ] Configure monitoring and logging
- [ ] Set up CI/CD pipeline

### Docker Support
```bash
# Build image
docker build -t music-api .

# Run container
docker run -p 3000:3000 music-api
```

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Tạo Pull Request

## 🗺️ Roadmap

### Phase 1 ✅
- [x] Core API structure
- [x] User authentication
- [x] Basic CRUD operations
- [x] ZingMp3 integration

### Phase 2 ✅
- [x] Social features (like, comment, follow)
- [x] Playlist management
- [x] Admin panel
- [x] File upload system

### Phase 3 ⏳
- [ ] WebSocket implementation
- [ ] Real-time group listening
- [ ] Advanced analytics
- [ ] Mobile app support

### Phase 4 🔮
- [ ] AI recommendations
- [ ] Live streaming
- [ ] Podcast support
- [ ] International expansion

## 📄 License

MIT License - xem file [LICENSE](LICENSE) để biết thêm chi tiết.

## 🆘 Support

Nếu có vấn đề hoặc câu hỏi, vui lòng tạo issue trên GitHub hoặc liên hệ team development.

---

**Made with ❤️ for music lovers**