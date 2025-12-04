/**
 * Simulation script for DJ Rotation flow
 * Demonstrates: create room, add DJs, add tracks, start engine, log events
 * 
 * Usage: node scripts/simulate_room.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { io } = require('socket.io-client');
const djRotationService = require('../src/services/user/djRotationService');
const { getDjRotationEngine } = require('../src/services/djRotationEngine');
const Room = require('../src/models/Room');

// Mock socket service for engine
const mockSocketService = {
    getIO: () => ({
        to: (roomId) => ({
            emit: (event, data) => {
                console.log(`[EVENT] ${event} to room:${roomId}`, JSON.stringify(data, null, 2));
            },
        }),
    }),
};

async function simulateRotationFlow() {
    try {
        console.log('🚀 Starting DJ Rotation Simulation...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/music_app', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to database\n');

        // Step 1: Create rotation room
        console.log('📝 Step 1: Creating rotation room...');
        const room = await djRotationService.createRotationRoom(
            'owner1',
            'Room Owner',
            {
                name: 'Simulation Room',
                description: 'Test rotation flow',
                isPrivate: false,
                maxMembers: 50,
                rotationSettings: {
                    maxDjSlots: 5,
                    allowGuestsToJoinDJ: true,
                    autoAdvanceDJ: true,
                    allowAutoplayFallback: true,
                },
            }
        );
        console.log(`✅ Room created: ${room.roomId}\n`);

        // Step 2: Add second DJ
        console.log('📝 Step 2: Adding second DJ...');
        await djRotationService.addDj(room.roomId, 'dj2', 'DJ 2');
        console.log('✅ DJ 2 added\n');

        // Step 3: Add tracks to DJ 1
        console.log('📝 Step 3: Adding tracks to DJ 1...');
        // Note: In real scenario, you'd use actual ZingMP3 IDs
        // For simulation, we'll mock the service or use test IDs
        try {
            await djRotationService.addTrackToDjQueue(room.roomId, 'owner1', 'ZWAFWUFD');
            console.log('✅ Track 1 added to DJ 1 queue');
        } catch (error) {
            console.log(`⚠️  Could not add track (ZingMP3 API may be unavailable): ${error.message}`);
            console.log('   Continuing simulation with empty queue...\n');
        }

        // Step 4: Start rotation engine
        console.log('\n📝 Step 4: Starting rotation engine...');
        const engine = getDjRotationEngine(mockSocketService);
        engine.start();
        console.log('✅ Rotation engine started\n');

        // Step 5: Load initial track for DJ 1
        console.log('📝 Step 5: Loading initial track...');
        const updatedRoom = await Room.findOne({ roomId: room.roomId });
        if (updatedRoom.djs[0].trackQueue.length > 0) {
            await djRotationService.loadNextTrackForDj(updatedRoom, 0);
            console.log('✅ Initial track loaded\n');

            // Step 6: Simulate playback and wait for events
            console.log('📝 Step 6: Simulating playback...');
            console.log('   Waiting for events (prepare_next_track, next_dj, player:sync)...\n');

            // Wait a bit to see events
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Check room state
            const finalRoom = await Room.findOne({ roomId: room.roomId });
            console.log('📊 Final Room State:');
            console.log(`   Current DJ Index: ${finalRoom.currentDjIndex}`);
            console.log(`   Current Track: ${finalRoom.currentTrack?.title || 'None'}`);
            console.log(`   Is Playing: ${finalRoom.isPlaying}`);
            console.log(`   DJs: ${finalRoom.djs.filter(d => d.isActive).length} active`);
        } else {
            console.log('⚠️  No tracks in queue, skipping track loading\n');
        }

        // Step 7: Test advance to next DJ
        console.log('📝 Step 7: Testing advance to next DJ...');
        try {
            await djRotationService.advanceToNextDj(room.roomId);
            console.log('✅ Advanced to next DJ\n');
        } catch (error) {
            console.log(`⚠️  Could not advance: ${error.message}\n`);
        }

        // Cleanup
        console.log('🧹 Cleaning up...');
        engine.stop();
        await Room.deleteOne({ roomId: room.roomId });
        console.log('✅ Cleanup complete\n');

        console.log('✅ Simulation completed successfully!');
        console.log('\n📋 Expected Events:');
        console.log('   - rotation:prepare_next_track (3s before track end)');
        console.log('   - player:track_ending_soon (1.2s before track end)');
        console.log('   - rotation:next_dj (when DJ advances)');
        console.log('   - player:sync (every 3000ms while playing)');
        console.log('   - rotation:idle (if all DJs empty)');

    } catch (error) {
        console.error('❌ Simulation error:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

// Run simulation
if (require.main === module) {
    simulateRotationFlow();
}

module.exports = { simulateRotationFlow };

