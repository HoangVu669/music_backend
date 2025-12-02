/**
 * Keep Alive Service - Giữ server luôn hoạt động
 * Ultra-lightweight - Gọi API mỗi 5 phút để tránh cold start trên Vercel serverless
 * Tối ưu để không gây nặng server
 */

const http = require('http');
const https = require('https');

class KeepAliveService {
    constructor(baseUrl) {
        this.baseUrl = baseUrl || process.env.KEEP_ALIVE_URL || process.env.VERCEL_URL || 'http://localhost:4000';
        this.interval = null;
        this.isRunning = false;
        // Parse URL once để tái sử dụng
        this.url = new URL(this.baseUrl);
        this.isHttps = this.url.protocol === 'https:';
    }

    /**
     * Ultra-lightweight ping - sử dụng native http/https thay vì axios
     * Không parse JSON response, chỉ check status code
     * Không đọc body để tiết kiệm memory và CPU
     */
    async ping() {
        return new Promise((resolve) => {
            const client = this.isHttps ? https : http;
            const options = {
                hostname: this.url.hostname,
                port: this.url.port || (this.isHttps ? 443 : 80),
                path: '/ping',
                method: 'GET',
                timeout: 5000, // 5s timeout - đủ nhanh, không block lâu
                headers: {
                    'Connection': 'close', // Không giữ connection để tiết kiệm resources
                    'User-Agent': 'KeepAlive/1.0', // Minimal user agent
                },
            };

            const req = client.request(options, (res) => {
                // Chỉ đọc status code, không đọc body để tiết kiệm memory
                // Destroy response ngay sau khi có status code
                res.on('data', () => { }); // Discard data immediately
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        // Minimal logging - chỉ log trong development
                        if (process.env.NODE_ENV !== 'production') {
                            console.log(`✅ Keep-alive: ${new Date().toLocaleTimeString()}`);
                        }
                        resolve(true);
                    } else {
                        // Chỉ log errors, không log success để giảm I/O
                        console.error(`❌ Keep-alive failed: Status ${res.statusCode}`);
                        resolve(false);
                    }
                });
            });

            req.on('error', (error) => {
                // Chỉ log errors
                console.error(`❌ Keep-alive error: ${error.message}`);
                resolve(false);
            });

            req.on('timeout', () => {
                req.destroy();
                console.error(`❌ Keep-alive timeout`);
                resolve(false);
            });

            // End request immediately - không gửi body
            req.end();
        });
    }

    /**
     * Start keep-alive service (ping every 5 minutes)
     * Tối ưu: fire and forget, không block event loop
     */
    start(intervalMinutes = 0.1) {
        if (this.isRunning) {
            console.log('⚠️ Keep-alive service is already running');
            return;
        }

        const intervalMs = intervalMinutes * 60 * 1000;

        // Ping ngay lập tức để test connection
        this.ping().catch(() => { }); // Ignore errors on initial ping

        // Then ping every interval
        this.interval = setInterval(() => {
            // Fire and forget - không await để không block event loop
            this.ping().catch(() => { });
        }, intervalMs);

        this.isRunning = true;
        console.log(`🚀 Keep-alive started - Ping every ${intervalMinutes}min (ultra-lightweight)`);
    }

    /**
     * Stop keep-alive service
     */
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            this.isRunning = false;
            console.log('🛑 Keep-alive service stopped');
        }
    }
}

module.exports = KeepAliveService;
