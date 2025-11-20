/**
 * Entry point cho Crawler/Scheduler
 * 
 * Usage:
 *   node src/schedule/index.js                    # Chạy tất cả crawlers
 *   node src/schedule/index.js songs              # Chạy chỉ song crawler
 *   node src/schedule/index.js artists           # Chạy chỉ artist crawler
 *   node src/schedule/index.js schedule          # Bật scheduler tự động
 */

const scheduler = require('./scheduler');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';

  try {
    switch (command.toLowerCase()) {
      case 'all':
        // Chạy tất cả crawlers một lần
        await scheduler.runAllCrawlers();
        process.exit(0);
        break;

      case 'schedule':
      case 'scheduler':
        // Bật scheduler tự động
        scheduler.start();
        // Giữ process chạy
        process.on('SIGINT', () => {
          console.log('\n⏹️ Stopping scheduler...');
          scheduler.stop();
          process.exit(0);
        });
        break;

      case 'song':
      case 'songs':
        await scheduler.runCrawler('songs');
        process.exit(0);
        break;

      case 'artist':
      case 'artists':
        await scheduler.runCrawler('artists');
        process.exit(0);
        break;

      case 'album':
      case 'albums':
        await scheduler.runCrawler('albums');
        process.exit(0);
        break;

      case 'playlist':
      case 'playlists':
        await scheduler.runCrawler('playlists');
        process.exit(0);
        break;

      case 'mv':
      case 'mvs':
        await scheduler.runCrawler('mvs');
        process.exit(0);
        break;

      default:
        console.log(`
📖 Usage:
  node src/schedule/index.js [command]

Commands:
  all          - Run all crawlers once (default)
  schedule     - Start automatic scheduler
  songs        - Run only song crawler
  artists      - Run only artist crawler
  albums       - Run only album crawler
  playlists    - Run only playlist crawler
  mvs          - Run only MV crawler

Examples:
  node src/schedule/index.js
  node src/schedule/index.js songs
  node src/schedule/index.js schedule
        `);
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Chạy main
main();

