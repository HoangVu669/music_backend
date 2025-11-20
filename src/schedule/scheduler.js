/**
 * Scheduler chính để chạy các crawler theo lịch trình
 */
const cron = require('node-cron');
const config = require('./config');
const { connectDatabase } = require('../config/db');

// Import các crawler
const songCrawler = require('./crawlers/songCrawler');
const artistCrawler = require('./crawlers/artistCrawler');
const albumCrawler = require('./crawlers/albumCrawler');
const playlistCrawler = require('./crawlers/playlistCrawler');
const mvCrawler = require('./crawlers/mvCrawler');

class Scheduler {
  constructor() {
    this.isRunning = false;
    this.tasks = [];
  }

  /**
   * Chạy tất cả crawlers
   */
  async runAllCrawlers() {
    if (this.isRunning) {
      console.log('⚠️ Crawler is already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('\n🚀 ============================================');
      console.log('🚀 Starting Full Crawl Process');
      console.log('🚀 ============================================\n');

      // Kết nối database
      await connectDatabase();

      // Chạy các crawler theo thứ tự
      console.log('📅 Crawl Order: Songs → Artists → Albums → Playlists → MVs\n');

      // 1. Songs (quan trọng nhất, cần crawl trước)
      await songCrawler.crawlAll();

      // 2. Artists (cần có songs trước)
      await artistCrawler.crawlAll();

      // 3. Albums (cần có songs trước)
      await albumCrawler.crawlAll();

      // 4. Playlists
      await playlistCrawler.crawlAll();

      // 5. MVs
      await mvCrawler.crawlAll();

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log('\n✅ ============================================');
      console.log(`✅ Full Crawl Process Completed in ${duration}s`);
      console.log('✅ ============================================\n');
    } catch (error) {
      console.error('\n❌ ============================================');
      console.error('❌ Crawl Process Failed:', error);
      console.error('❌ ============================================\n');
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Chạy crawler cho một loại dữ liệu cụ thể
   */
  async runCrawler(crawlerName) {
    if (this.isRunning) {
      console.log('⚠️ Crawler is already running, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      await connectDatabase();

      switch (crawlerName.toLowerCase()) {
        case 'song':
        case 'songs':
          await songCrawler.crawlAll();
          break;
        case 'artist':
        case 'artists':
          await artistCrawler.crawlAll();
          break;
        case 'album':
        case 'albums':
          await albumCrawler.crawlAll();
          break;
        case 'playlist':
        case 'playlists':
          await playlistCrawler.crawlAll();
          break;
        case 'mv':
        case 'mvs':
          await mvCrawler.crawlAll();
          break;
        default:
          console.error(`❌ Unknown crawler: ${crawlerName}`);
          console.log('Available crawlers: songs, artists, albums, playlists, mvs');
      }
    } catch (error) {
      console.error(`❌ Error running ${crawlerName} crawler:`, error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Bắt đầu scheduler tự động
   */
  start() {
    if (!config.SCHEDULER.ENABLED) {
      console.log('⚠️ Scheduler is disabled in config');
      return;
    }

    const { CRAWL_INTERVAL_HOURS, CRAWL_HOUR } = config.SCHEDULER;

    // Chạy ngay lập tức lần đầu
    console.log('🚀 Running initial crawl...');
    this.runAllCrawlers().catch(console.error);

    // Lên lịch chạy định kỳ
    // Cron: chạy mỗi X giờ vào giờ Y
    // Ví dụ: '0 2 * * *' = chạy lúc 2h sáng mỗi ngày
    // '0 */6 * * *' = chạy mỗi 6 giờ
    let cronExpression;
    if (CRAWL_INTERVAL_HOURS === 24) {
      // Chạy mỗi ngày vào giờ cụ thể
      cronExpression = `0 ${CRAWL_HOUR} * * *`;
    } else {
      // Chạy mỗi X giờ
      cronExpression = `0 */${CRAWL_INTERVAL_HOURS} * * *`;
    }
    
    console.log(`📅 Scheduling crawler: ${cronExpression}`);
    console.log(`   (Every ${CRAWL_INTERVAL_HOURS} hours)`);

    const task = cron.schedule(cronExpression, async () => {
      console.log(`\n⏰ Scheduled crawl started at ${new Date().toISOString()}`);
      await this.runAllCrawlers().catch(console.error);
    });

    this.tasks.push(task);
    console.log('✅ Scheduler started successfully\n');
  }

  /**
   * Dừng scheduler
   */
  stop() {
    this.tasks.forEach(task => task.stop());
    this.tasks = [];
    console.log('⏹️ Scheduler stopped');
  }
}

module.exports = new Scheduler();

