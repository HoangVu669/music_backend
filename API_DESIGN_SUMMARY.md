# Music Streaming API - Thiết kế API hoàn chỉnh

## Tổng quan
API được thiết kế theo chuẩn RESTful với cấu trúc rõ ràng giữa User và Admin, hỗ trợ đầy đủ các tính năng của ứng dụng nghe nhạc trực tuyến.

## Cấu trúc thư mục
```
src/
├── controllers/
│   ├── user/          # Controllers cho user
│   └── admin/         # Controllers cho admin
├── routes/
│   ├── user/          # Routes cho user
│   └── admin/         # Routes cho admin
├── middleware/
│   ├── user/          # Middleware cho user
│   └── admin/         # Middleware cho admin
└── models/            # Database models
```

## Models đã thiết kế

### 1. User Model (Cập nhật)
- Thông tin cơ bản: email, password, fullName, phone, avatar
- Role: user, artist, admin
- Subscription: free, premium, family
- Social: bio, website, location, birthDate, gender
- Stats: totalPlayTime, totalSongsPlayed, totalLikes, totalFollowers, etc.

### 2. Song Model
- Thông tin bài hát: title, artist, album, genre, duration
- File info: fileUrl, coverImage, lyrics, format, bitrate, sampleRate
- Stats: playCount, likeCount, downloadCount, shareCount
- Metadata: mood, bpm, key, tags, language

### 3. Artist Model
- Thông tin nghệ sĩ: name, bio, avatar, country, genres
- Stats: totalFollowers, followers array

### 4. Album Model
- Thông tin album: title, artist, description, coverImage, releaseDate
- Stats: totalTracks, duration

### 5. Playlist Model
- Thông tin playlist: name, description, owner, songs, coverImage
- Settings: isPublic, isCollaborative, allowDuplicates, autoShuffle
- Stats: totalSongs, totalDuration, playCount, likeCount
- Collaborators: users với roles (editor, viewer)

### 6. Comment Model
- Nội dung: content, user, song, parentComment, replies
- Stats: likeCount, likes array
- Features: timestamp, isEdited, isDeleted

### 7. Like Model
- Thông tin like: user, song, likedAt
- Compound index để đảm bảo 1 like/user/song

### 8. Follow Model
- Thông tin follow: follower, following, followedAt
- Compound index để đảm bảo 1 follow relationship

### 9. Group Model
- Thông tin phòng: name, description, owner, members
- Current song: song, startedAt, position, isPlaying
- Queue: danh sách bài hát chờ phát
- Chat: tin nhắn trong phòng
- Settings: isPublic, maxMembers, allowMemberAddSongs, etc.

### 10. Notification Model
- Thông tin thông báo: user, type, title, message, data
- Features: isRead, priority, expiresAt
- Types: like, comment, follow, group_invite, etc.

## API Endpoints

### User APIs

#### Authentication
- `POST /api/auth/register` - Đăng ký user
- `POST /api/auth/login` - Đăng nhập user
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Lấy thông tin cá nhân
- `PUT /api/auth/me` - Cập nhật thông tin cá nhân
- `PUT /api/auth/me/password` - Đổi mật khẩu

#### Users
- `GET /api/users/search?query=` - Tìm người dùng
- `GET /api/users/{id}` - Xem thông tin user khác
- `POST /api/users/{id}/follow` - Follow user
- `DELETE /api/users/{id}/follow` - Unfollow user
- `GET /api/users/{id}/followers` - Danh sách follower
- `GET /api/users/{id}/following` - Danh sách đang follow

#### Songs
- `GET /api/songs` - Danh sách bài hát (filter theo thể loại, ca sĩ, album)
- `GET /api/songs/{id}` - Chi tiết bài hát
- `GET /api/songs/{id}/stream` - Stream bài hát
- `POST /api/songs/{id}/like` - Like bài hát
- `DELETE /api/songs/{id}/like` - Bỏ like
- `GET /api/songs/{id}/likes` - Danh sách user đã like
- `POST /api/songs/{id}/comment` - Bình luận bài hát
- `GET /api/songs/{id}/comments` - Lấy danh sách bình luận
- `GET /api/songs/zing/{id}` - Lấy bài hát từ ZingMp3
- `GET /api/songs/zing/search?keyword=` - Tìm kiếm từ ZingMp3

#### Artists
- `GET /api/artists` - Danh sách nghệ sĩ
- `GET /api/artists/{id}` - Thông tin chi tiết nghệ sĩ
- `GET /api/artists/{id}/songs` - Danh sách bài hát của nghệ sĩ
- `GET /api/artists/{id}/albums` - Danh sách album của nghệ sĩ
- `GET /api/artists/zing/{name}` - Lấy nghệ sĩ từ ZingMp3
- `GET /api/artists/zing/{id}/songs` - Lấy bài hát nghệ sĩ từ ZingMp3

#### Albums
- `GET /api/albums` - Danh sách album
- `GET /api/albums/{id}` - Thông tin chi tiết album
- `GET /api/albums/{id}/songs` - Danh sách bài hát trong album
- `GET /api/albums/zing/{id}` - Lấy album từ ZingMp3

#### Playlists
- `GET /api/playlists` - Danh sách playlist
- `GET /api/playlists/my` - Danh sách playlist của user
- `GET /api/playlists/{id}` - Chi tiết playlist
- `POST /api/playlists` - Tạo playlist
- `PUT /api/playlists/{id}` - Cập nhật playlist
- `DELETE /api/playlists/{id}` - Xóa playlist
- `POST /api/playlists/{id}/songs` - Thêm bài hát vào playlist
- `DELETE /api/playlists/{id}/songs/{songId}` - Xóa bài hát khỏi playlist
- `POST /api/playlists/{id}/share` - Chia sẻ playlist (public/private)

#### Groups (Real-time Music Listening)
- `GET /api/groups` - Danh sách phòng nghe
- `GET /api/groups/my` - Danh sách phòng của user
- `GET /api/groups/{id}` - Thông tin phòng nghe
- `POST /api/groups` - Tạo phòng nghe nhạc chung
- `POST /api/groups/{id}/join` - Tham gia phòng
- `POST /api/groups/{id}/leave` - Rời phòng
- `POST /api/groups/{id}/play` - Play nhạc trong phòng
- `POST /api/groups/{id}/pause` - Pause nhạc trong phòng
- `POST /api/groups/{id}/skip` - Skip bài hát
- `POST /api/groups/{id}/chat` - Gửi chat trong phòng

#### Comments
- `PUT /api/comments/{id}` - Cập nhật bình luận
- `DELETE /api/comments/{id}` - Xóa bình luận
- `POST /api/comments/{id}/like` - Like bình luận
- `DELETE /api/comments/{id}/like` - Bỏ like bình luận
- `POST /api/comments/{id}/reply` - Trả lời bình luận

#### Notifications
- `GET /api/notifications` - Danh sách thông báo
- `GET /api/notifications/unread-count` - Số thông báo chưa đọc
- `PUT /api/notifications/read-all` - Đánh dấu tất cả đã đọc
- `PUT /api/notifications/{id}/read` - Đánh dấu đã đọc
- `DELETE /api/notifications/{id}` - Xóa thông báo

### Admin APIs

#### Authentication
- `POST /api/admin/auth/register` - Đăng ký admin (chỉ super-admin)
- `POST /api/admin/auth/login` - Đăng nhập admin
- `POST /api/admin/auth/logout` - Logout admin
- `GET /api/admin/auth/me` - Lấy thông tin admin
- `PUT /api/admin/auth/me` - Cập nhật thông tin admin
- `PUT /api/admin/auth/me/password` - Đổi mật khẩu admin

#### User Management
- `GET /api/admin/users` - Danh sách user
- `GET /api/admin/users/{id}` - Chi tiết user
- `GET /api/admin/users/{id}/activity` - Hoạt động của user
- `DELETE /api/admin/users/{id}` - Xóa user
- `PUT /api/admin/users/{id}/ban` - Ban user
- `PUT /api/admin/users/{id}/unban` - Unban user

#### Song Management
- `GET /api/admin/songs` - Danh sách bài hát
- `GET /api/admin/songs/{id}` - Chi tiết bài hát
- `POST /api/admin/songs` - Thêm bài hát mới
- `PUT /api/admin/songs/{id}` - Cập nhật bài hát
- `DELETE /api/admin/songs/{id}` - Xóa bài hát
- `POST /api/admin/songs/{id}/upload` - Upload file nhạc
- `POST /api/admin/songs/{id}/cover` - Upload ảnh bìa
- `PUT /api/admin/songs/{id}/approve` - Duyệt bài hát
- `PUT /api/admin/songs/{id}/reject` - Từ chối bài hát

#### Artist Management
- `GET /api/admin/artists` - Danh sách nghệ sĩ
- `GET /api/admin/artists/{id}` - Chi tiết nghệ sĩ
- `POST /api/admin/artists` - Thêm nghệ sĩ
- `PUT /api/admin/artists/{id}` - Cập nhật nghệ sĩ
- `DELETE /api/admin/artists/{id}` - Xóa nghệ sĩ
- `POST /api/admin/artists/{id}/avatar` - Upload avatar nghệ sĩ

#### Album Management
- `GET /api/admin/albums` - Danh sách album
- `GET /api/admin/albums/{id}` - Chi tiết album
- `POST /api/admin/albums` - Thêm album
- `PUT /api/admin/albums/{id}` - Cập nhật album
- `DELETE /api/admin/albums/{id}` - Xóa album
- `POST /api/admin/albums/{id}/cover` - Upload ảnh bìa album

#### Playlist Management
- `GET /api/admin/playlists` - Danh sách playlist
- `GET /api/admin/playlists/{id}` - Chi tiết playlist
- `DELETE /api/admin/playlists/{id}` - Xóa playlist vi phạm
- `PUT /api/admin/playlists/{id}/feature` - Feature/unfeature playlist

#### Reports & Analytics
- `GET /api/admin/reports` - Thống kê tổng quan
- `GET /api/admin/reports/users` - Thống kê user
- `GET /api/admin/reports/content` - Thống kê nội dung

## Tích hợp ZingMp3 API

### Endpoints tích hợp:
1. **Songs**: `/api/songs/zing/{id}`, `/api/songs/zing/search`
2. **Artists**: `/api/artists/zing/{name}`, `/api/artists/zing/{id}/songs`
3. **Albums**: `/api/albums/zing/{id}` (sử dụng playlist endpoint)

### Cách sử dụng:
- API có thể lấy dữ liệu từ ZingMp3 khi cần
- Dữ liệu được cache hoặc lưu vào database để tối ưu performance
- Fallback mechanism khi ZingMp3 API không khả dụng

## WebSocket Events (Cần implement)

### Group Events:
- `song:play` - Bài hát bắt đầu phát
- `song:pause` - Bài hát tạm dừng
- `song:skip` - Skip bài hát
- `chat:newMessage` - Tin nhắn mới
- `user:join` - User tham gia phòng
- `user:leave` - User rời phòng

## Validation & Security

### Input Validation:
- Sử dụng express-validator cho tất cả endpoints
- Validation rules được định nghĩa rõ ràng cho từng endpoint
- Error messages tiếng Việt

### Authentication & Authorization:
- JWT tokens cho authentication
- Role-based access control (user, artist, admin)
- Middleware riêng cho user và admin
- Password hashing với bcrypt

### File Upload:
- Multer middleware cho file uploads
- File type validation
- File size limits
- Secure file storage

## Database Indexes

### Performance Optimization:
- Text indexes cho search functionality
- Compound indexes cho relationships
- TTL indexes cho notifications
- Sparse indexes cho optional fields

## Error Handling

### Standardized Response Format:
```json
{
  "success": boolean,
  "message": string,
  "data": object,
  "errors": array
}
```

### Error Types:
- `VALIDATION_ERROR` - Input validation failed
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `INTERNAL_ERROR` - Server error

## Pagination

### Standard Pagination:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- Response includes pagination metadata

## Rate Limiting

### Global Rate Limiting:
- 100 requests per 15 minutes per IP
- Configurable per endpoint
- Different limits for authenticated vs anonymous users

## CORS Configuration

### Cross-Origin Support:
- Configurable allowed origins
- Credentials support
- Preflight request handling

## Environment Variables

### Required Environment Variables:
- `JWT_SECRET` - Secret key for JWT tokens
- `MONGODB_URI` - MongoDB connection string
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port
- `ALLOWED_ORIGINS` - CORS allowed origins

## Deployment Considerations

### Production Ready:
- Helmet for security headers
- Rate limiting
- Error logging
- Health check endpoint
- Graceful shutdown handling

## Next Steps

1. **WebSocket Implementation** - Real-time features cho groups
2. **File Storage** - Cloud storage cho audio files và images
3. **Caching** - Redis cho session và data caching
4. **Monitoring** - Logging và monitoring tools
5. **Testing** - Unit tests và integration tests
6. **Documentation** - API documentation với Swagger
7. **CI/CD** - Automated deployment pipeline

## Kết luận

API đã được thiết kế hoàn chỉnh với:
- ✅ Cấu trúc RESTful chuẩn
- ✅ Phân chia rõ ràng User/Admin
- ✅ Tích hợp ZingMp3 API
- ✅ Validation và security đầy đủ
- ✅ Models và relationships phù hợp
- ✅ Error handling và pagination
- ⏳ WebSocket cho real-time features (cần implement)

API sẵn sàng cho development và có thể mở rộng dễ dàng trong tương lai.
