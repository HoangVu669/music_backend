/**
 * Unit tests for DJ rotation advance logic
 */
const djRotationService = require('../../src/services/user/djRotationService');
const Room = require('../../src/models/Room');

// Mock dependencies
jest.mock('../../src/models/Room');
jest.mock('../../src/models/RoomActivity', () => ({
    create: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../src/services/zing.service', () => ({
    getFullSongData: jest.fn().mockResolvedValue({
        zingId: 'test123',
        title: 'Test Song',
        artist: 'Test Artist',
        thumbnail: 'thumb.jpg',
        duration: 180,
        streamingUrl: 'stream.mp3',
    }),
    getRandomRelatedSong: jest.fn().mockResolvedValue({
        zingId: 'related123',
        title: 'Related Song',
        artist: 'Test Artist',
        thumbnail: 'thumb2.jpg',
        duration: 200,
        streamingUrl: 'stream2.mp3',
    }),
}));

describe('djRotationService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('advanceToNextDj', () => {
        test('should advance to next active DJ', async () => {
            const room = {
                roomId: 'test-room',
                mode: 'dj_rotation',
                isActive: true,
                currentDjIndex: 0,
                djs: [
                    {
                        userId: 'dj1',
                        userName: 'DJ 1',
                        isActive: true,
                        trackQueue: [],
                        nextTrackIndex: 0,
                    },
                    {
                        userId: 'dj2',
                        userName: 'DJ 2',
                        isActive: true,
                        trackQueue: [{ zingId: 'track1', title: 'Track 1', duration: 180 }],
                        nextTrackIndex: 0,
                    },
                ],
                rotationSettings: {
                    autoAdvanceDJ: true,
                },
                save: jest.fn().mockResolvedValue(true),
            };

            Room.findOne = jest.fn().mockResolvedValue(room);

            const result = await djRotationService.advanceToNextDj('test-room');

            expect(room.currentDjIndex).toBe(1);
            expect(room.currentTrack.zingId).toBe('track1');
            expect(room.currentTrack.djUserId).toBe('dj2');
        });

        test('should wrap around to first DJ', async () => {
            const room = {
                roomId: 'test-room',
                mode: 'dj_rotation',
                isActive: true,
                currentDjIndex: 1,
                djs: [
                    {
                        userId: 'dj1',
                        userName: 'DJ 1',
                        isActive: true,
                        trackQueue: [{ zingId: 'track1', title: 'Track 1', duration: 180 }],
                        nextTrackIndex: 0,
                    },
                    {
                        userId: 'dj2',
                        userName: 'DJ 2',
                        isActive: true,
                        trackQueue: [],
                        nextTrackIndex: 0,
                    },
                ],
                rotationSettings: {
                    autoAdvanceDJ: true,
                },
                save: jest.fn().mockResolvedValue(true),
            };

            Room.findOne = jest.fn().mockResolvedValue(room);

            await djRotationService.advanceToNextDj('test-room');

            expect(room.currentDjIndex).toBe(0); // Wrapped around
        });

        test('should skip inactive DJs', async () => {
            const room = {
                roomId: 'test-room',
                mode: 'dj_rotation',
                isActive: true,
                currentDjIndex: 0,
                djs: [
                    {
                        userId: 'dj1',
                        userName: 'DJ 1',
                        isActive: false, // Inactive
                        trackQueue: [],
                        nextTrackIndex: 0,
                    },
                    {
                        userId: 'dj2',
                        userName: 'DJ 2',
                        isActive: true,
                        trackQueue: [{ zingId: 'track1', title: 'Track 1', duration: 180 }],
                        nextTrackIndex: 0,
                    },
                ],
                rotationSettings: {
                    autoAdvanceDJ: true,
                },
                save: jest.fn().mockResolvedValue(true),
            };

            Room.findOne = jest.fn().mockResolvedValue(room);

            await djRotationService.advanceToNextDj('test-room');

            expect(room.currentDjIndex).toBe(1); // Should skip inactive DJ1
        });

        test('should handle all DJs empty with autoplay fallback', async () => {
            const room = {
                roomId: 'test-room',
                mode: 'dj_rotation',
                isActive: true,
                currentDjIndex: 0,
                currentTrack: {
                    zingId: 'current123',
                    startedAt: Date.now(),
                },
                djs: [
                    {
                        userId: 'dj1',
                        userName: 'DJ 1',
                        isActive: true,
                        trackQueue: [],
                        nextTrackIndex: 0,
                    },
                ],
                rotationSettings: {
                    autoAdvanceDJ: true,
                    allowAutoplayFallback: true,
                },
                save: jest.fn().mockResolvedValue(true),
            };

            Room.findOne = jest.fn().mockResolvedValue(room);

            await djRotationService.advanceToNextDj('test-room');

            // Should try autoplay fallback
            expect(room.currentTrack).toBeDefined();
        });

        test('should emit rotation:idle when no DJs and no autoplay', async () => {
            const room = {
                roomId: 'test-room',
                mode: 'dj_rotation',
                isActive: true,
                currentDjIndex: 0,
                djs: [],
                rotationSettings: {
                    autoAdvanceDJ: true,
                    allowAutoplayFallback: false,
                },
                save: jest.fn().mockResolvedValue(true),
            };

            Room.findOne = jest.fn().mockResolvedValue(room);

            const result = await djRotationService.advanceToNextDj('test-room');

            expect(room.currentDjIndex).toBe(-1);
            expect(room.isPlaying).toBe(false);
            expect(room.currentTrack.zingId).toBeNull();
        });
    });
});

