# 📬 Hướng dẫn Import Postman Collection

## 📥 Cách Import

### 1. Import Collection
1. Mở Postman
2. Click **Import** (góc trên bên trái)
3. Chọn file `Music_App_API.postman_collection.json`
4. Click **Import**

### 2. Import Environment (Optional nhưng khuyến nghị)
1. Click **Environments** (sidebar trái)
2. Click **Import**
3. Chọn file `Music_App_API.postman_environment.json`
4. Click **Import**

### 3. Setup Environment
1. Chọn environment **"Music App API - Environment"** ở dropdown góc trên bên phải
2. Kiểm tra các variables:
   - `base_url`: `http://localhost:4000/api/v1/user`
   - `auth_token`: (sẽ tự động set sau khi login)
   - `room_id`: (sẽ tự động set sau khi tạo room)
   - `playlist_id`: (sẽ tự động set sau khi tạo playlist)

---

## 🚀 Cách sử dụng

### Bước 1: Đăng ký/Đăng nhập
1. Mở folder **Authentication**
2. Chạy request **Register** để tạo tài khoản mới
3. Hoặc chạy request **Login** để đăng nhập
4. Token sẽ tự động được lưu vào variable `auth_token`

### Bước 2: Test các API
- **Songs**: Lấy bài hát, streaming URL, lyric, search...
- **Rooms**: Tạo phòng, join, leave, update playback...
- **Social**: Comment, like, follow, share, notifications...
- **Playlists**: Tạo, quản lý playlist...

---

## 📋 Collection Structure

```
Music App - User API
├── Authentication
│   ├── Register
│   ├── Login (auto-save token)
│   └── Update Profile
├── Songs
│   ├── Get Song (with streaming URL)
│   ├── Get Streaming URL
│   ├── Get Lyric
│   ├── Search Songs
│   ├── Get Popular Songs
│   ├── Get New Releases
│   └── Track Play History
├── Rooms (Real-time Group Listening)
│   ├── Create Room (auto-save room_id)
│   ├── Get Room Details
│   ├── Join Room
│   ├── Leave Room
│   ├── Update Playback State
│   ├── Add Song to Queue
│   ├── Remove Song from Queue
│   ├── Get Public Rooms
│   └── Get My Rooms
├── Social Features
│   ├── Comments
│   │   ├── Comment Song
│   │   ├── Get Song Comments
│   │   ├── Reply Comment
│   │   └── Like Comment
│   ├── Likes
│   │   ├── Like Song
│   │   ├── Like Album
│   │   ├── Check User Likes
│   │   └── Get Liked Songs
│   ├── Follow
│   │   ├── Follow User
│   │   ├── Follow Artist
│   │   └── Get Followed Artists
│   ├── Share
│   │   └── Share Song
│   └── Notifications
│       ├── Get Notifications
│       ├── Mark Notification as Read
│       ├── Mark All Notifications as Read
│       └── Get Unread Count
└── Playlists
    ├── Create Playlist (auto-save playlist_id)
    ├── Get My Playlists
    ├── Get Playlist Details
    ├── Update Playlist
    ├── Delete Playlist
    ├── Add Song to Playlist
    ├── Remove Song from Playlist
    ├── Reorder Playlist Songs
    ├── Like Playlist
    ├── Follow Playlist
    ├── Get Public Playlists
    └── Get Followed Playlists
```

---

## 🔑 Auto-save Variables

Collection tự động lưu các giá trị sau:

1. **Login**: Tự động lưu `auth_token` từ response
2. **Create Room**: Tự động lưu `room_id` từ response
3. **Create Playlist**: Tự động lưu `playlist_id` từ response

Các request khác sẽ tự động sử dụng các variables này.

---

## ⚙️ Environment Variables

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `base_url` | `http://localhost:4000/api/v1/user` | Base URL của API |
| `auth_token` | (empty) | JWT token (tự động set sau login) |
| `room_id` | (empty) | Room ID (tự động set sau khi tạo room) |
| `playlist_id` | (empty) | Playlist ID (tự động set sau khi tạo playlist) |
| `song_id` | `Z6Z0F6F6` | Song ID mẫu |
| `user_id` | (empty) | User ID |
| `artist_id` | (empty) | Artist ID |
| `album_id` | (empty) | Album ID |

---

## 📝 Lưu ý

1. **Authentication**: Hầu hết các API yêu cầu token. Đảm bảo đã login trước.

2. **Base URL**: Nếu server chạy ở port khác, sửa `base_url` trong environment.

3. **Song IDs**: Cần song ID thật từ ZingMp3. Có thể lấy từ:
   - Search API
   - Home API
   - Top 100 API

4. **Real-time**: Socket.IO không test được trong Postman. Cần dùng client khác (Flutter app, web app, hoặc Socket.IO client).

---

## 🧪 Test Flow Mẫu

### Flow 1: Nghe nhạc
1. **Login** → Lấy token
2. **Search Songs** → Tìm bài hát
3. **Get Song** → Lấy thông tin + streaming URL
4. **Get Lyric** → Lấy lời bài hát
5. **Track Play History** → Track lịch sử (cho AI)

### Flow 2: Tạo phòng nghe nhạc
1. **Login** → Lấy token
2. **Create Room** → Tạo phòng (lưu room_id)
3. **Add Song to Queue** → Thêm bài vào queue
4. **Update Playback State** → Update playback
5. (Socket.IO: Join room, sync playback)

### Flow 3: Tương tác xã hội
1. **Login** → Lấy token
2. **Get Song** → Lấy bài hát
3. **Comment Song** → Comment bài hát
4. **Like Song** → Like bài hát
5. **Share Song** → Chia sẻ bài hát
6. **Get Notifications** → Xem thông báo

### Flow 4: Quản lý Playlist
1. **Login** → Lấy token
2. **Create Playlist** → Tạo playlist (lưu playlist_id)
3. **Add Song to Playlist** → Thêm bài hát
4. **Get Playlist Details** → Xem chi tiết
5. **Reorder Songs** → Sắp xếp lại

---

*Generated: 15/11/2025*

