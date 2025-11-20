# 📚 API Documentation - User APIs

## 🎯 Tổng quan

API được chia thành 2 phần:
- **User APIs** (`/api/v1/user/*`) - Cho người dùng cuối
- **Admin APIs** (`/api/v1/admin/*`) - Cho quản trị viên

## 🔑 Authentication

Hầu hết các API yêu cầu authentication. Gửi token trong header:

```
Authorization: Bearer <token>
```

Hoặc với Socket.IO:
```javascript
socket.connect({
  auth: {
    token: '<token>'
  }
});
```

---

## 🏠 HOME & DISCOVERY API

### 1. Lấy dữ liệu trang chủ

**GET** `/api/v1/user/home`

**Response:**
```json
{
  "success": true,
  "message": "success",
  "data": {
    "items": [
      {
        "sectionType": "songStation",
        "title": "Gợi ý bài hát",
        "items": [...]
      },
      {
        "sectionType": "new-release",
        "title": "Mới phát hành",
        "items": {...}
      },
      {
        "sectionType": "RTChart",
        "title": "BXH Nhạc Mới",
        "items": [...]
      },
      ...
    ]
  }
}
```

**Lưu ý:** Trả về toàn bộ cấu trúc trang chủ từ ZingMp3, bao gồm các sections như songStation, new-release, RTChart, playlist, etc.

---

### 2. Lấy Top 100

**GET** `/api/v1/user/charts/top100`

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "group": {
          "name": "Top 100 Việt Nam",
          "type": "song"
        },
        "items": [...]
      }
    ]
  }
}
```

---

### 3. Lấy bảng xếp hạng trang chủ (RTChart)

**GET** `/api/v1/user/charts/home`

**Response:**
```json
{
  "success": true,
  "data": {
    "RTChart": {
      "items": [...],
      "chart": {...}
    },
    "weekChart": {
      "vn": {...},
      "us": {...},
      "korea": {...}
    }
  }
}
```

---

### 4. Lấy bảng xếp hạng bài hát mới phát hành

**GET** `/api/v1/user/charts/new-release`

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "chart": {...},
    "total": 100
  }
}
```

---

## 🎵 SONGS API

### 1. Lấy thông tin bài hát (với streaming URL)

**GET** `/api/v1/user/songs/:songId`

**Query params:**
- `cache` (optional): `true` (default) hoặc `false` - Có dùng cache không

**Response:**
```json
{
  "success": true,
  "message": "success",
  "data": {
    "songId": "Z6Z0F6F6",
    "title": "Bài hát",
    "artistIds": ["artist1", "artist2"],
    "albumId": "album1",
    "duration": 240,
    "thumbnail": "https://...",
    "streamingUrl": "https://...",
    "likeCount": 100,
    "listenCount": 1000,
    ...
  }
}
```

**Lưu ý:**
- Nếu bài hát chưa có trong DB → Tự động fetch từ ZingMp3 và lưu metadata
- Streaming URL được lấy từ ZingMp3 API (có cache nếu còn hạn)

---

### 2. Lấy streaming URL

**GET** `/api/v1/user/songs/:songId/stream`

**Query params:**
- `cache` (optional): `true` (default) hoặc `false`

**Response:**
```json
{
  "success": true,
  "message": "success",
  "data": {
    "streamingUrl": "https://..."
  }
}
```

---

### 3. Lấy lời bài hát

**GET** `/api/v1/user/songs/:songId/lyric`

**Response:**
```json
{
  "success": true,
  "message": "success",
  "data": {
    "lyric": "...",
    "hasLyric": true
  }
}
```

---

### 4. Tìm kiếm (ZingMp3 Search)

**GET** `/api/v1/user/songs/search?keyword=...&limit=20`

**Response:**
```json
{
  "success": true,
  "message": "success",
  "data": {
    "top": {...},        // Kết quả nổi bật nhất
    "songs": [...],      // Danh sách bài hát
    "playlists": [...],  // Danh sách playlist
    "artists": [...],    // Danh sách nghệ sĩ
    "videos": [...]      // Danh sách MV
  }
}
```

**Lưu ý:** 
- API này gọi trực tiếp ZingMp3 search API
- Tự động lưu metadata các bài hát tìm được vào DB (không lưu streamingUrl)
- Trả về đầy đủ kết quả từ ZingMp3 (songs, playlists, artists, videos)

---

### 5. Lấy bài hát phổ biến

**GET** `/api/v1/user/songs/popular?limit=20`

---

### 6. Lấy bài hát mới phát hành

**GET** `/api/v1/user/songs/new-releases?limit=20`

---

### 7. Track lịch sử nghe nhạc

**POST** `/api/v1/user/songs/:songId/play`

**Body:**
```json
{
  "playDuration": 120,
  "playPercentage": 50,
  "isCompleted": false,
  "isSkipped": false,
  "context": "other",
  "device": "mobile"
}
```

**Lưu ý:** Dùng cho AI recommendation

---

## 👥 ROOMS API (Real-time Group Listening)

### 1. Tạo phòng

**POST** `/api/v1/user/rooms`

**Body:**
```json
{
  "name": "My Room",
  "description": "Description",
  "isPrivate": false,
  "maxMembers": 50
}
```

---

### 2. Lấy thông tin phòng

**GET** `/api/v1/user/rooms/:roomId`

**Response:**
```json
{
  "success": true,
  "data": {
    "roomId": "...",
    "name": "My Room",
    "ownerId": "...",
    "members": [...],
    "currentSongId": "...",
    "currentSongStreamingUrl": "https://...",
    "currentPosition": 120,
    "isPlaying": true,
    "queue": [...],
    "queueWithUrls": [...]
  }
}
```

---

### 3. Join phòng

**POST** `/api/v1/user/rooms/:roomId/join`

---

### 4. Leave phòng

**POST** `/api/v1/user/rooms/:roomId/leave`

---

### 5. Update playback state

**PUT** `/api/v1/user/rooms/:roomId/playback`

**Body:**
```json
{
  "currentSongId": "...",
  "currentPosition": 120,
  "isPlaying": true
}
```

---

### 6. Thêm bài hát vào queue

**POST** `/api/v1/user/rooms/:roomId/queue`

**Body:**
```json
{
  "songId": "..."
}
```

---

### 7. Xóa bài hát khỏi queue

**DELETE** `/api/v1/user/rooms/:roomId/queue/:songId`

---

### 8. Lấy danh sách phòng công khai

**GET** `/api/v1/user/rooms/public?limit=20`

---

### 9. Lấy phòng của user

**GET** `/api/v1/user/rooms/my-rooms`

---

## 🔌 Socket.IO Events (Real-time)

### Client → Server

#### Join room
```javascript
socket.emit('room:join', { roomId: '...' });
```

#### Leave room
```javascript
socket.emit('room:leave', { roomId: '...' });
```

#### Update playback
```javascript
socket.emit('room:playback-update', {
  roomId: '...',
  currentSongId: '...',
  currentPosition: 120,
  isPlaying: true
});
```

#### Add song to queue
```javascript
socket.emit('room:queue-add', {
  roomId: '...',
  songId: '...'
});
```

#### Remove song from queue
```javascript
socket.emit('room:queue-remove', {
  roomId: '...',
  songId: '...'
});
```

#### Chat
```javascript
socket.emit('room:chat', {
  roomId: '...',
  message: 'Hello!'
});
```

---

### Server → Client

#### Room joined
```javascript
socket.on('room:joined', (data) => {
  // data.room
});
```

#### Member joined
```javascript
socket.on('room:member-joined', (data) => {
  // data.userId, data.userName, data.memberCount
});
```

#### Member left
```javascript
socket.on('room:member-left', (data) => {
  // data.userId, data.userName
});
```

#### Playback update
```javascript
socket.on('room:playback-update', (data) => {
  // data.currentSongId, data.currentPosition, data.isPlaying
});
```

#### Queue updated
```javascript
socket.on('room:queue-updated', (data) => {
  // data.queue, data.addedBy, data.addedByUserName
});
```

#### Chat message
```javascript
socket.on('room:chat-message', (data) => {
  // data.userId, data.userName, data.message, data.timestamp
});
```

---

## 💬 SOCIAL API

### Comments

#### Comment bài hát
**POST** `/api/v1/user/songs/:songId/comments`

**Body:**
```json
{
  "content": "Great song!",
  "timestamp": 120  // Optional: comment tại thời điểm nào trong bài hát
}
```

---

#### Lấy comments
**GET** `/api/v1/user/songs/:songId/comments?page=1&limit=20`

---

#### Reply comment
**POST** `/api/v1/user/comments/:commentId/reply`

**Body:**
```json
{
  "songId": "...",
  "content": "Reply",
  "mentionedUserId": "..."  // Optional
}
```

---

#### Like comment
**POST** `/api/v1/user/comments/:commentId/like`

---

### Likes

#### Like/Unlike bài hát
**POST** `/api/v1/user/songs/:songId/like`

**Response:**
```json
{
  "success": true,
  "data": {
    "liked": true
  }
}
```

---

#### Like/Unlike album
**POST** `/api/v1/user/albums/:albumId/like`

---

#### Kiểm tra likes
**GET** `/api/v1/user/likes?songIds=id1,id2&albumIds=id3,id4`

---

#### Lấy bài hát đã like
**GET** `/api/v1/user/likes/songs?page=1&limit=20`

---

### Follow

#### Follow/Unfollow user
**POST** `/api/v1/user/users/:userId/follow`

---

#### Follow/Unfollow artist
**POST** `/api/v1/user/artists/:artistId/follow`

---

#### Lấy artists đã follow
**GET** `/api/v1/user/follows/artists?page=1&limit=20`

---

### Share

#### Share bài hát
**POST** `/api/v1/user/songs/:songId/share`

**Body:**
```json
{
  "shareType": "LINK"  // LINK, FACEBOOK, TWITTER, etc.
}
```

---

### Notifications

#### Lấy notifications
**GET** `/api/v1/user/notifications?page=1&limit=20`

---

#### Đánh dấu đã đọc
**PUT** `/api/v1/user/notifications/:notificationId/read`

---

#### Đánh dấu tất cả đã đọc
**PUT** `/api/v1/user/notifications/read-all`

---

#### Đếm số chưa đọc
**GET** `/api/v1/user/notifications/unread-count`

---

## 📚 PLAYLISTS API

### 1. Tạo playlist

**POST** `/api/v1/user/playlists`

**Body:**
```json
{
  "title": "My Playlist",
  "description": "Description",
  "isPublic": true,
  "thumbnail": "https://..."
}
```

---

### 2. Lấy playlists của user

**GET** `/api/v1/user/playlists?isPublic=true`

---

### 3. Lấy chi tiết playlist

**GET** `/api/v1/user/playlists/:playlistId`

---

### 4. Cập nhật playlist

**PUT** `/api/v1/user/playlists/:playlistId`

**Body:**
```json
{
  "title": "New Title",
  "description": "New Description",
  "isPublic": false,
  "thumbnail": "https://..."
}
```

---

### 5. Xóa playlist

**DELETE** `/api/v1/user/playlists/:playlistId`

---

### 6. Thêm bài hát vào playlist

**POST** `/api/v1/user/playlists/:playlistId/songs`

**Body:**
```json
{
  "songId": "..."
}
```

---

### 7. Xóa bài hát khỏi playlist

**DELETE** `/api/v1/user/playlists/:playlistId/songs/:songId`

---

### 8. Sắp xếp lại thứ tự

**PUT** `/api/v1/user/playlists/:playlistId/reorder`

**Body:**
```json
{
  "songIds": ["id1", "id2", "id3", ...]
}
```

---

### 9. Like/Unlike playlist

**POST** `/api/v1/user/playlists/:playlistId/like`

---

### 10. Follow/Unfollow playlist

**POST** `/api/v1/user/playlists/:playlistId/follow`

---

### 11. Lấy playlists công khai

**GET** `/api/v1/user/playlists/public?limit=20&sortBy=playCount`

**sortBy:** `playCount`, `likeCount`, `followCount`, `createdAt`

---

### 12. Lấy playlists đã follow

**GET** `/api/v1/user/playlists/followed?page=1&limit=20`

---

## 🔄 Streaming URL Strategy

### Lazy Loading + Caching

1. **Lần đầu request:**
   - Nếu bài hát chưa có trong DB → Fetch metadata từ ZingMp3, lưu vào DB (KHÔNG lưu streamingUrl)
   - Fetch streaming URL từ ZingMp3 API
   - Cache streaming URL vào DB (24h)

2. **Lần sau request:**
   - Nếu cache còn hạn (>1h) → Dùng cache
   - Nếu cache sắp expire (<1h) → Fetch mới từ ZingMp3 và update cache

3. **Query param `cache=false`:**
   - Luôn fetch mới từ ZingMp3 (không dùng cache)

---

## 📝 Response Format

Tất cả API trả về format:

```json
{
  "success": true,
  "message": "success",
  "data": {...}
}
```

Hoặc lỗi:

```json
{
  "success": false,
  "message": "Error message",
  "code": 400,
  "details": {...}
}
```

---

## 🚀 Environment Variables

```env
ZING_API_BASE_URL=http://localhost:4400
MONGO_URI=mongodb://127.0.0.1:27017/music_app
PORT=4000
JWT_SECRET=your-secret
```

---

*Generated: 15/11/2025*

