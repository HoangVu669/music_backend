/**
 * Keep Alive Script - Standalone script to ping server
 * Run this script separately to keep server alive
 * 
 * Usage:
 *   node src/scripts/keepAlive.js
 *   node src/scripts/keepAlive.js --url https://your-app.vercel.app
 *   node src/scripts/keepAlive.js --interval 5
 */

require('dotenv').config();
const KeepAliveService = require('../services/keepAliveService');

// Disable console.log in production để giảm I/O overhead
if (process.env.NODE_ENV === 'production') {
    const originalLog = console.log;
    const originalError = console.error;
    console.log = () => { }; // Disable logs in production
    console.error = () => { }; // Disable errors in production (optional - có thể giữ để debug)
}

// Parse command line arguments
const args = process.argv.slice(2);
let url = process.env.KEEP_ALIVE_URL || process.env.VERCEL_URL;
let interval = 5;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) {
        url = args[i + 1];
        i++;
    } else if (args[i] === '--interval' && args[i + 1]) {
        interval = parseInt(args[i + 1]);
        i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
        console.log(`
Keep Alive Script - Ping server to prevent cold start

Usage:
  node src/scripts/keepAlive.js [options]

Options:
  --url <url>        Server URL to ping (default: from KEEP_ALIVE_URL or VERCEL_URL env)
  --interval <min>   Interval in minutes (default: 5)
  --help, -h         Show this help message

Examples:
  node src/scripts/keepAlive.js
  node src/scripts/keepAlive.js --url https://music-backend-iota.vercel.app
  node src/scripts/keepAlive.js --interval 10

Environment Variables:
  KEEP_ALIVE_URL     Server URL to ping
  VERCEL_URL         Fallback URL if KEEP_ALIVE_URL not set
    `);
        process.exit(0);
    }
}

if (!url) {
    console.error('❌ Error: Server URL is required');
    console.error('   Set KEEP_ALIVE_URL environment variable or use --url option');
    process.exit(1);
}

// Ensure URL has protocol
if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
}

// Remove trailing slash
url = url.replace(/\/$/, '');

console.log(`🔗 Keep-alive target: ${url}`);
console.log(`⏰ Interval: ${interval} minutes`);
console.log(`🚀 Starting keep-alive service...\n`);

const keepAlive = new KeepAliveService(url);
keepAlive.start(interval);

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down keep-alive service...');
    keepAlive.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down keep-alive service...');
    keepAlive.stop();
    process.exit(0);
});

