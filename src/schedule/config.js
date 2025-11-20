/**
 * Config cho Crawler/Scheduler
 */
require('dotenv').config();

module.exports = {
  // ZingMp3 API Base URL
  ZING_API_BASE_URL: process.env.ZING_API_BASE_URL || 'http://localhost:4400',
  
  // MongoDB Connection
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/music_app',
  
  // Crawler Settings
  CRAWLER: {
    // Delay giữa các request (ms) để tránh rate limit
    REQUEST_DELAY: 1000, // 1 giây
    
    // Số lượng song tối đa mỗi lần crawl
    MAX_SONGS_PER_BATCH: 50,
    
    // Số lượng retry khi lỗi
    MAX_RETRIES: 3,
    
    // Timeout cho mỗi request (ms)
    REQUEST_TIMEOUT: 30000, // 30 giây
  },
  
  // Scheduler Settings
  SCHEDULER: {
    // Chạy crawler mỗi X giờ
    CRAWL_INTERVAL_HOURS: 6,
    
    // Chạy crawler vào giờ nào (0-23)
    CRAWL_HOUR: 2, // 2h sáng
    
    // Enable/Disable scheduler
    ENABLED: process.env.SCHEDULER_ENABLED !== 'false',
  }
};

