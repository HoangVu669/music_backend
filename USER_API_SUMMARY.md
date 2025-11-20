# 📋 TÓM TẮT USER API

## ✅ Đã hoàn thành

### 1. **Cấu trúc thư mục**
```
src/
├── services/
│   ├── zingmp3Service.js          # Call trực tiếp ZingMp3 API
│   └── user/
│       ├── songService.js          # Song service (lazy load + cache)
│       ├── roomService.js          # Room service (real-time)
│       ├── socialService.js        # Social service (comment, like, follow)
│       └── playlistService.js      # Playlist service
├── controllers/
│   └── user/
│       ├── songController.js
│       ├── roomController.js
│       ├── socialController.js
│       └── playlistController.js
└── routes/
    └── user/
        └── index.js                # Tất cả routes user
```

---

## 🎯 Chiến lược Streaming URL

### **KHÔNG crawl streaming URL vào DB**
- Streaming URL được call trực tiếp từ ZingMp3 API mỗi lần user nghe
- Có cơ chế cache thông minh:
  - Lần đầu: Call ZingMp3 → Cache vào DB (24h)
  - Lần sau: Nếu cache còn hạn (>1h) → Dùng cache
  - Nếu cache sắp expire (<1h) → Fetch mới và update cache

### **Metadata được lazy load**
- Khi user request bài hát chưa có trong DB:
  - Fetch metadata từ ZingMp3 → Lưu vào DB (KHÔNG lưu streamingUrl)
  - Khi user cần stream → Fetch streamingUrl và cache

---

## 📦 Services

### **1. zingmp3Service.js**
- Call trực tiếp ZingMp3 API
- Methods:
  - `getStreamingUrl(songId)` - Lấy streaming URL (128kbps)
  - `getSongInfo(songId)` - Lấy thông tin bài hát
  - `getLyric(songId)` - Lấy lời bài hát
  - `search(keyword)` - Tìm kiếm
  - `getHome()`, `getTop100()`, `getChartHome()`, etc.

### **2. songService.js**
- Lazy loading + caching
- Methods:
  - `getSongInfo(songId)` - Lấy metadata (lazy load nếu chưa có)
  - `getStreamingUrl(songId, cache)` - Lấy streaming URL (có cache)
  - `getSongWithStream(songId, userId, cache)` - Lấy cả metadata + streaming URL
  - `trackPlayHistory(userId, songId, data)` - Track cho AI

### **3. roomService.js**
- Quản lý phòng nghe nhạc real-time
- Methods:
  - `createRoom(ownerId, ownerName, data)`
  - `joinRoom(roomId, userId, userName)`
  - `updatePlaybackState(roomId, data)`
  - `addSongToQueue(roomId, songId, addedBy)`
  - `getRoomWithSongs(roomId)` - Lấy room + streaming URLs

### **4. socialService.js**
- Tương tác xã hội
- Methods:
  - Comments: `commentSong()`, `replyComment()`, `likeComment()`, `getSongComments()`
  - Likes: `likeSong()`, `likeAlbum()`, `checkUserLikes()`, `getLikedSongs()`
  - Follow: `followUser()`, `followArtist()`, `getFollowedArtists()`
  - Share: `shareSong()`
  - Notifications: `createNotification()`, `getUserNotifications()`, etc.

### **5. playlistService.js**
- Quản lý playlist
- Methods:
  - `createPlaylist()`, `getUserPlaylists()`, `getPlaylistById()`
  - `addSongToPlaylist()`, `removeSongFromPlaylist()`, `reorderPlaylistSongs()`
  - `likePlaylist()`, `followPlaylist()`

---

## 🔌 Socket.IO (Real-time)

### **SocketService**
- Xử lý real-time communication cho rooms
- Events:
  - `room:join` - Join phòng
  - `room:leave` - Leave phòng
  - `room:playback-update` - Update playback state
  - `room:queue-add` - Thêm bài vào queue
  - `room:queue-remove` - Xóa bài khỏi queue
  - `room:chat` - Chat trong phòng

---

## 🛣️ Routes

### **Songs**
- `GET /api/v1/user/songs/:songId` - Lấy bài hát (với streaming URL)
- `GET /api/v1/user/songs/:songId/stream` - Lấy streaming URL
- `GET /api/v1/user/songs/:songId/lyric` - Lấy lời bài hát
- `GET /api/v1/user/songs/search` - Tìm kiếm
- `GET /api/v1/user/songs/popular` - Bài hát phổ biến
- `GET /api/v1/user/songs/new-releases` - Bài hát mới
- `POST /api/v1/user/songs/:songId/play` - Track play history

### **Rooms**
- `POST /api/v1/user/rooms` - Tạo phòng
- `GET /api/v1/user/rooms/:roomId` - Lấy thông tin phòng
- `POST /api/v1/user/rooms/:roomId/join` - Join phòng
- `POST /api/v1/user/rooms/:roomId/leave` - Leave phòng
- `PUT /api/v1/user/rooms/:roomId/playback` - Update playback
- `POST /api/v1/user/rooms/:roomId/queue` - Thêm bài vào queue
- `DELETE /api/v1/user/rooms/:roomId/queue/:songId` - Xóa bài khỏi queue
- `GET /api/v1/user/rooms/public` - Phòng công khai
- `GET /api/v1/user/rooms/my-rooms` - Phòng của user

### **Social**
- Comments: `POST /api/v1/user/songs/:songId/comments`, `GET /api/v1/user/songs/:songId/comments`, etc.
- Likes: `POST /api/v1/user/songs/:songId/like`, `POST /api/v1/user/albums/:albumId/like`, etc.
- Follow: `POST /api/v1/user/users/:userId/follow`, `POST /api/v1/user/artists/:artistId/follow`, etc.
- Notifications: `GET /api/v1/user/notifications`, etc.

### **Playlists**
- `POST /api/v1/user/playlists` - Tạo playlist
- `GET /api/v1/user/playlists` - Lấy playlists của user
- `GET /api/v1/user/playlists/:playlistId` - Lấy chi tiết playlist
- `PUT /api/v1/user/playlists/:playlistId` - Cập nhật playlist
- `DELETE /api/v1/user/playlists/:playlistId` - Xóa playlist
- `POST /api/v1/user/playlists/:playlistId/songs` - Thêm bài hát
- `DELETE /api/v1/user/playlists/:playlistId/songs/:songId` - Xóa bài hát
- `PUT /api/v1/user/playlists/:playlistId/reorder` - Sắp xếp lại
- `POST /api/v1/user/playlists/:playlistId/like` - Like playlist
- `POST /api/v1/user/playlists/:playlistId/follow` - Follow playlist
- `GET /api/v1/user/playlists/public` - Playlists công khai
- `GET /api/v1/user/playlists/followed` - Playlists đã follow

---

## 🔄 Flow hoạt động

### **1. User nghe nhạc**
```
1. User request: GET /api/v1/user/songs/:songId
2. songService.getSongWithStream():
   - Kiểm tra DB có metadata chưa
   - Nếu chưa → Fetch từ ZingMp3 → Lưu metadata (KHÔNG lưu streamingUrl)
   - Lấy streamingUrl từ ZingMp3 (có cache)
   - Cache streamingUrl vào DB (24h)
   - Track play history (cho AI)
3. Return song + streamingUrl
```

### **2. User tìm kiếm**
```
1. User request: GET /api/v1/user/songs/search?keyword=...
2. songService.search():
   - Call ZingMp3 search API
   - Lưu metadata các bài hát tìm được vào DB (KHÔNG lưu streamingUrl)
   - Return kết quả
```

### **3. User nghe nhạc theo nhóm**
```
1. User tạo/join room: POST /api/v1/user/rooms
2. Socket.IO connect với token
3. socket.emit('room:join', { roomId })
4. Server broadcast 'room:member-joined' cho các members khác
5. User update playback: socket.emit('room:playback-update', {...})
6. Server broadcast 'room:playback-update' cho tất cả members
7. Tất cả clients sync playback state
```

---

## ⚙️ Environment Variables

```env
ZING_API_BASE_URL=http://localhost:4400
MONGO_URI=mongodb://127.0.0.1:27017/music_app
PORT=4000
JWT_SECRET=your-secret
```

---

## 📝 Lưu ý

1. **Streaming URL không crawl vào DB:**
   - Chỉ call trực tiếp ZingMp3 khi user cần
   - Có cache để tăng performance

2. **Metadata lazy load:**
   - Chỉ lưu metadata khi user request
   - Không crawl hết tất cả bài hát

3. **AI Recommendation:**
   - `UserPlayHistory` được track mỗi lần user nghe
   - Có thể dùng để tính toán recommendation sau

4. **Real-time:**
   - Socket.IO cho rooms
   - Sync playback state real-time
   - Chat trong phòng

---

*Generated: 15/11/2025*

