require('dotenv').config();
const connectDB = require('./src/config/database');
const app = require('./src/app');

const PORT = process.env.PORT || 3000;

// Connect to database
connectDB();

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 API Documentation:`);
  console.log(`📱 Authentication:`);
  console.log(`   - POST /api/auth/register - Đăng ký`);
  console.log(`   - POST /api/auth/login - Đăng nhập`);
  console.log(`   - GET /api/auth/me - Lấy thông tin user hiện tại`);
  console.log(`   - POST /api/auth/logout - Đăng xuất`);
  console.log(`👥 User Management:`);
  console.log(`   - GET /api/users - Lấy danh sách users (Admin)`);
  console.log(`   - GET /api/users/:id - Lấy thông tin user`);
  console.log(`   - PUT /api/users/:id - Cập nhật user`);
  console.log(`   - DELETE /api/users/:id - Xóa user (Admin)`);
  console.log(`🎵 Music Features:`);
  console.log(`   - GET /api/songs - Lấy danh sách bài hát`);
  console.log(`   - GET /api/songs/search - Tìm kiếm bài hát`);
  console.log(`   - GET /api/songs/popular - Bài hát phổ biến`);
  console.log(`   - POST /api/songs/:id/play - Phát bài hát`);
  console.log(`   - POST /api/songs/:id/like - Thích/Bỏ thích bài hát`);
  console.log(`   - GET /api/songs/liked - Bài hát yêu thích`);
  console.log(`📋 Playlist Management:`);
  console.log(`   - GET /api/playlists - Lấy danh sách playlist`);
  console.log(`   - POST /api/playlists - Tạo playlist mới`);
  console.log(`   - PUT /api/playlists/:id - Cập nhật playlist`);
  console.log(`   - POST /api/playlists/:id/songs - Thêm bài hát vào playlist`);
  console.log(`   - DELETE /api/playlists/:id/songs/:songId - Xóa bài hát khỏi playlist`);
  console.log(`🎤 Artist Management:`);
  console.log(`   - GET /api/artists - Lấy danh sách nghệ sĩ`);
  console.log(`   - GET /api/artists/popular - Nghệ sĩ phổ biến`);
  console.log(`   - POST /api/artists/:id/follow - Theo dõi/Bỏ theo dõi nghệ sĩ`);
  console.log(`📊 History & Analytics:`);
  console.log(`   - GET /api/history - Lịch sử nghe nhạc`);
  console.log(`   - GET /api/history/most-played - Bài hát nghe nhiều nhất`);
  console.log(`   - GET /api/history/stats - Thống kê nghe nhạc`);
  console.log(`🎵 ZingMp3 Integration:`);
  console.log(`   - GET /api/songs/zing/{id} - Lấy bài hát từ ZingMp3`);
  console.log(`   - GET /api/songs/zing/search?keyword=... - Tìm kiếm từ ZingMp3`);
  console.log(`   - GET /api/artists/zing/{name} - Lấy nghệ sĩ từ ZingMp3`);
  console.log(`   - GET /api/artists/zing/{id}/songs - Lấy bài hát nghệ sĩ từ ZingMp3`);
  console.log(`   - GET /api/albums/zing/{id} - Lấy album từ ZingMp3`);
  console.log(`🔄 Sync Management (Admin only):`);
  console.log(`   - POST /api/sync/song - Đồng bộ bài hát từ Zing MP3`);
  console.log(`   - POST /api/sync/playlist - Đồng bộ playlist từ Zing MP3`);
  console.log(`   - POST /api/sync/artist - Đồng bộ nghệ sĩ từ Zing MP3`);
  console.log(`   - POST /api/sync/top100 - Đồng bộ top 100`);
  console.log(`   - POST /api/sync/search - Tìm kiếm và đồng bộ`);
  console.log(`   - GET /api/sync/stats - Thống kê đồng bộ`);
  console.log(`📋 System Logs (Admin only):`);
  console.log(`   - GET /api/admin/logs - Nhật ký hệ thống`);
  console.log(`   - GET /api/admin/logs/activity - Nhật ký hoạt động`);
  console.log(`   - GET /api/admin/logs/errors - Nhật ký lỗi`);
});
