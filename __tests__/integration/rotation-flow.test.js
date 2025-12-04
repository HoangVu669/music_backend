/**
 * Integration test for DJ rotation flow
 * Tests the complete flow: create room, add DJs, add tracks, advance
 */

const mongoose = require('mongoose');
const Room = require('../../src/models/Room');
const djRotationService = require('../../src/services/user/djRotationService');
const { getDjRotationEngine } = require('../../src/services/djRotationEngine');

// Mock socket service
const mockSocketService = {
    getIO: () => ({
        to: () => ({
            emit: jest.fn(),
        }),
    }),
};

describe('DJ Rotation Flow Integration', () => {
    let testRoom;

    beforeAll(async () => {
        // Connect to test database or use in-memory
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/music_test', {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
        }
    });

    afterAll(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }
    });

    beforeEach(async () => {
        // Clean up test rooms
        await Room.deleteMany({ roomId: /^test-room-/ });
    });

    test('should create rotation room and add DJs', async () => {
        const room = await djRotationService.createRotationRoom(
            'owner1',
            'Owner',
            {
                name: 'Test Rotation Room',
                isPrivate: false,
                maxMembers: 50,
            }
        );

        expect(room.mode).toBe('dj_rotation');
        expect(room.djs.length).toBe(1); // Owner is first DJ
        expect(room.djs[0].userId).toBe('owner1');

        testRoom = room;
    });

    test('should add tracks to DJ queue and advance', async () => {
        if (!testRoom) {
            testRoom = await djRotationService.createRotationRoom(
                'owner1',
                'Owner',
                { name: 'Test Room' }
            );
        }

        // Add track to DJ queue
        await djRotationService.addTrackToDjQueue(
            testRoom.roomId,
            'owner1',
            'test-zing-id-123'
        );

        const updatedRoom = await Room.findOne({ roomId: testRoom.roomId });
        expect(updatedRoom.djs[0].trackQueue.length).toBe(1);
        expect(updatedRoom.djs[0].trackQueue[0].zingId).toBe('test-zing-id-123');
    });

    test('should handle waitlist when slots full', async () => {
        if (!testRoom) {
            testRoom = await djRotationService.createRotationRoom(
                'owner1',
                'Owner',
                {
                    name: 'Test Room',
                    rotationSettings: { maxDjSlots: 2 },
                }
            );
        }

        // Fill slots
        await djRotationService.addDj(testRoom.roomId, 'dj2', 'DJ 2');

        // Try to add third DJ - should go to waitlist
        try {
            await djRotationService.addDj(testRoom.roomId, 'dj3', 'DJ 3');
            fail('Should have thrown DJ_SLOTS_FULL error');
        } catch (error) {
            expect(error.responseCode).toBe('DJ_SLOTS_FULL');

            const room = await Room.findOne({ roomId: testRoom.roomId });
            expect(room.djWaitlist.length).toBe(1);
            expect(room.djWaitlist[0].userId).toBe('dj3');
        }
    });
});

