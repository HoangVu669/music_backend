/**
 * Unit tests for vote skip threshold calculation
 */
const voteSkipService = require('../../src/services/user/voteSkipService');
const Room = require('../../src/models/Room');
const jqbxConfig = require('../../src/config/jqbx');

// Mock Room model
jest.mock('../../src/models/Room');
jest.mock('../../src/models/RoomActivity', () => ({
    create: jest.fn().mockResolvedValue({}),
}));

describe('voteSkipService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getVoteSkipStatus', () => {
        test('should calculate threshold based on active users', async () => {
            const room = {
                roomId: 'test-room',
                memberCount: 10,
                voteSkipThreshold: 0.5,
                voteSkipEnabled: true,
                currentTrack: {
                    zingId: 'track123',
                    startedAt: Date.now(),
                },
                voteSkips: [
                    { userId: 'user1', sessionId: 'track123_1234567890' },
                    { userId: 'user2', sessionId: 'track123_1234567890' },
                ],
            };

            Room.findOne = jest.fn().mockResolvedValue(room);

            const status = await voteSkipService.getVoteSkipStatus('test-room');

            expect(status.voteCount).toBe(2);
            expect(status.threshold).toBe(5); // 50% of 10
            expect(status.hasEnoughVotes).toBe(false);
            expect(status.needMoreVotes).toBe(3);
        });

        test('should filter votes by sessionId', async () => {
            const now = Date.now();
            const room = {
                roomId: 'test-room',
                memberCount: 4,
                voteSkipThreshold: 0.5,
                voteSkipEnabled: true,
                currentTrack: {
                    zingId: 'track123',
                    startedAt: now,
                },
                voteSkips: [
                    { userId: 'user1', sessionId: `track123_${now}` },
                    { userId: 'user2', sessionId: `track123_${now}` },
                    { userId: 'user3', sessionId: `track456_${now - 1000}`, }, // Old session
                ],
            };

            Room.findOne = jest.fn().mockResolvedValue(room);

            const status = await voteSkipService.getVoteSkipStatus('test-room');

            expect(status.voteCount).toBe(2); // Only current session votes
            expect(status.threshold).toBe(2); // 50% of 4
            expect(status.hasEnoughVotes).toBe(true);
        });

        test('should handle no current track', async () => {
            const room = {
                roomId: 'test-room',
                memberCount: 10,
                voteSkipThreshold: 0.5,
                voteSkipEnabled: true,
                currentTrack: null,
                voteSkips: [],
            };

            Room.findOne = jest.fn().mockResolvedValue(room);

            const status = await voteSkipService.getVoteSkipStatus('test-room');

            expect(status.voteCount).toBe(0);
            expect(status.votes).toEqual([]);
        });
    });
});

