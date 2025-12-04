/**
 * Room State Cache - In-memory cache để tối ưu performance
 * Cache room state với TTL để giảm DB queries
 */
const Room = require('../models/Room');

class RoomStateCache {
    constructor() {
        // Cache: roomId -> { data, timestamp, ttl }
        this.cache = new Map();
        this.defaultTTL = 5000; // 5 giây
        this.cleanupInterval = null;
    }

    /**
     * Start cleanup interval
     */
    start() {
        if (this.cleanupInterval) {
            return;
        }

        // Cleanup expired entries mỗi 10 giây
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 10000);
    }

    /**
     * Stop cleanup interval
     */
    stop() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }

    /**
     * Get room state từ cache hoặc DB
     * @param {string} roomId - ID phòng
     * @param {boolean} forceRefresh - Force refresh từ DB
     * @returns {Promise<Object|null>} Room state
     */
    async get(roomId, forceRefresh = false) {
        if (!forceRefresh) {
            const cached = this.cache.get(roomId);
            if (cached && Date.now() < cached.timestamp + cached.ttl) {
                return cached.data;
            }
        }

        // Load từ DB
        const room = await Room.findOne({ roomId, isActive: true }).lean();
        if (!room) {
            return null;
        }

        // Cache
        this.set(roomId, room);

        return room;
    }

    /**
     * Set room state vào cache
     * @param {string} roomId - ID phòng
     * @param {Object} data - Room data
     * @param {number} ttl - Time to live (ms)
     */
    set(roomId, data, ttl = null) {
        this.cache.set(roomId, {
            data,
            timestamp: Date.now(),
            ttl: ttl || this.defaultTTL,
        });
    }

    /**
     * Invalidate cache cho một room
     * @param {string} roomId - ID phòng
     */
    invalidate(roomId) {
        this.cache.delete(roomId);
    }

    /**
     * Invalidate cache cho nhiều rooms
     * @param {Array<string>} roomIds - Array of room IDs
     */
    invalidateMany(roomIds) {
        roomIds.forEach(roomId => this.cache.delete(roomId));
    }

    /**
     * Clear all cache
     */
    clear() {
        this.cache.clear();
    }

    /**
     * Cleanup expired entries
     */
    cleanup() {
        const now = Date.now();
        for (const [roomId, cached] of this.cache.entries()) {
            if (now >= cached.timestamp + cached.ttl) {
                this.cache.delete(roomId);
            }
        }
    }

    /**
     * Get cache stats
     */
    getStats() {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys()),
        };
    }
}

// Singleton instance
let cacheInstance = null;

function getRoomStateCache() {
    if (!cacheInstance) {
        cacheInstance = new RoomStateCache();
        cacheInstance.start();
    }
    return cacheInstance;
}

module.exports = { RoomStateCache, getRoomStateCache };

