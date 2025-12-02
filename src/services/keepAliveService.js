/**
 * Keep Alive Service - Ultra-lightweight ping service
 * Tự động ping server mỗi 5 phút để giữ server hoạt động
 */

const http = require('http');
const https = require('https');

class KeepAliveService {
    constructor(baseUrl) {
        const url = new URL(baseUrl);
        this.hostname = url.hostname;
        this.port = url.port || (url.protocol === 'https:' ? 443 : 80);
        this.path = '/ping';
        this.isHttps = url.protocol === 'https:';
        this.interval = null;
    }

    /**
     * Ping server - cực kỳ đơn giản
     */
    ping() {
        const client = this.isHttps ? https : http;
        const req = client.get({
            hostname: this.hostname,
            port: this.port,
            path: this.path,
            timeout: 5000,
        }, (res) => {
            res.on('data', () => { }); // Discard data
            res.on('end', () => {
                console.log(`ping server - ${res.statusCode}`);
            });
        });

        req.on('error', () => { });
        req.on('timeout', () => {
            req.destroy();
        });
    }

    /**
     * Start - ping mỗi 5 phút
     */
    start() {
        // Ping ngay lập tức
        this.ping();

        // Sau đó ping mỗi 5 phút
        this.interval = setInterval(() => {
            this.ping();
        }, 0.1 * 60 * 1000); // 5 minutes
    }

    /**
     * Stop
     */
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}

module.exports = KeepAliveService;
