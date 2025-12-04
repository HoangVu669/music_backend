/**
 * Unit tests for syncUtils
 */
const { calculatePosition, getSyncData, detectJitter } = require('../../src/utils/syncUtils');

describe('syncUtils', () => {
    describe('calculatePosition', () => {
        test('should return 0 for empty track', () => {
            const position = calculatePosition(null, true);
            expect(position).toBe(0);
        });

        test('should calculate position correctly when playing', () => {
            const now = Date.now();
            const startedAt = now - 5000; // 5 seconds ago
            const currentTrack = {
                zingId: 'test123',
                startedAt,
                duration: 180, // 3 minutes
                position: 0,
            };

            const position = calculatePosition(currentTrack, true, now);
            expect(position).toBeCloseTo(5, 1); // ~5 seconds
        });

        test('should not increase position when paused', () => {
            const now = Date.now();
            const startedAt = now - 10000; // 10 seconds ago
            const currentTrack = {
                zingId: 'test123',
                startedAt,
                duration: 180,
                position: 5, // Already at 5 seconds
            };

            const position = calculatePosition(currentTrack, false, now);
            expect(position).toBe(5); // Should stay at 5
        });

        test('should clamp position to duration', () => {
            const now = Date.now();
            const startedAt = now - 200000; // 200 seconds ago
            const currentTrack = {
                zingId: 'test123',
                startedAt,
                duration: 180, // 3 minutes
                position: 0,
            };

            const position = calculatePosition(currentTrack, true, now);
            expect(position).toBe(180); // Clamped to duration
        });

        test('should handle zero startedAt', () => {
            const currentTrack = {
                zingId: 'test123',
                startedAt: 0,
                duration: 180,
                position: 10,
            };

            const position = calculatePosition(currentTrack, true);
            expect(position).toBe(10); // Should use stored position
        });
    });

    describe('getSyncData', () => {
        test('should return empty sync data for room without track', () => {
            const room = {
                isPlaying: false,
            };

            const syncData = getSyncData(room);
            expect(syncData.trackId).toBeNull();
            expect(syncData.position).toBe(0);
            expect(syncData.isPlaying).toBe(false);
            expect(syncData.serverTime).toBeDefined();
        });

        test('should return full sync data for room with track', () => {
            const now = Date.now();
            const startedAt = now - 5000;
            const room = {
                mode: 'normal',
                isPlaying: true,
                currentTrack: {
                    zingId: 'test123',
                    title: 'Test Song',
                    artist: 'Test Artist',
                    artists: 'Test Artist',
                    thumbnail: 'https://example.com/thumb.jpg',
                    duration: 180,
                    startedAt,
                    position: 0,
                },
            };

            const syncData = getSyncData(room, now);
            expect(syncData.trackId).toBe('test123');
            expect(syncData.zingId).toBe('test123');
            expect(syncData.title).toBe('Test Song');
            expect(syncData.artist).toBe('Test Artist');
            expect(syncData.position).toBeGreaterThan(0);
            expect(syncData.positionDecimal).toBeGreaterThan(0);
            expect(syncData.serverTime).toBe(now);
            expect(syncData.isPlaying).toBe(true);
        });

        test('should handle rotation mode', () => {
            const room = {
                mode: 'dj_rotation',
                isPlaying: true,
                currentTrack: {
                    zingId: 'test123',
                    mode: 'rotation',
                    djUserId: 'dj1',
                    duration: 180,
                    startedAt: Date.now(),
                },
            };

            const syncData = getSyncData(room);
            expect(syncData.mode).toBe('rotation');
            expect(syncData.djUserId).toBe('dj1');
        });
    });

    describe('detectJitter', () => {
        test('should detect jitter for large position jump', () => {
            const previousPosition = 10;
            const currentPosition = 50; // Jump of 40 seconds
            const timeDelta = 3000; // 3 seconds

            const hasJitter = detectJitter(previousPosition, currentPosition, timeDelta);
            expect(hasJitter).toBe(true);
        });

        test('should not detect jitter for normal progression', () => {
            const previousPosition = 10;
            const currentPosition = 13; // 3 seconds later
            const timeDelta = 3000; // 3 seconds

            const hasJitter = detectJitter(previousPosition, currentPosition, timeDelta);
            expect(hasJitter).toBe(false);
        });

        test('should handle negative position change', () => {
            const previousPosition = 20;
            const currentPosition = 10; // Went backwards
            const timeDelta = 3000;

            const hasJitter = detectJitter(previousPosition, currentPosition, timeDelta);
            expect(hasJitter).toBe(true);
        });
    });
});

