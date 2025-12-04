/**
 * Migration script to add JQBX fields to existing rooms
 * Safe and idempotent - can be run multiple times
 * 
 * Usage: node scripts/migrateRoomsToJqbx.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Room = require('../src/models/Room');

async function migrateRoomsToJqbx() {
    try {
        console.log('🔄 Starting JQBX migration...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/music_app', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to database\n');

        // Find all rooms
        const rooms = await Room.find({ isActive: true });
        console.log(`📊 Found ${rooms.length} active rooms to migrate\n`);

        let migrated = 0;
        let skipped = 0;
        let errors = 0;

        for (const room of rooms) {
            try {
                let needsSave = false;

                // Migrate currentTrack structure
                if (!room.currentTrack || !room.currentTrack.zingId) {
                    if (room.currentSongId) {
                        room.currentTrack = {
                            zingId: room.currentSongId,
                            title: null,
                            artist: null,
                            artists: null,
                            thumbnail: null,
                            duration: 0,
                            startedAt: room.currentTrack?.startedAt || 0,
                            position: room.currentPosition || 0,
                            streamingUrl: null,
                            isPlaying: room.isPlaying || false,
                            djUserId: null,
                            queuedBy: null,
                            mode: room.mode === 'dj_rotation' ? 'rotation' : 'normal',
                        };
                        needsSave = true;
                    }
                }

                // Ensure mode is set
                if (!room.mode) {
                    room.mode = 'normal';
                    needsSave = true;
                }

                // Migrate DJ rotation fields
                if (room.mode === 'dj_rotation') {
                    // Ensure rotationSettings
                    if (!room.rotationSettings) {
                        room.rotationSettings = {
                            maxDjSlots: 10,
                            allowGuestsToJoinDJ: true,
                            autoAdvanceDJ: true,
                            strictSync: true,
                            allowAutoplayFallback: true,
                            idleTimeout: 10 * 60 * 1000,
                        };
                        needsSave = true;
                    }

                    // Ensure DJ fields
                    if (room.djs && Array.isArray(room.djs)) {
                        room.djs.forEach((dj, index) => {
                            if (dj.order === undefined || dj.order === null) {
                                dj.order = index;
                                needsSave = true;
                            }
                            if (!dj.lastActiveAt) {
                                dj.lastActiveAt = dj.joinedAt || new Date();
                                needsSave = true;
                            }
                        });
                    }

                    // Ensure waitlist
                    if (!room.djWaitlist || !Array.isArray(room.djWaitlist)) {
                        room.djWaitlist = [];
                        needsSave = true;
                    }

                    // Ensure djOrder
                    if (!room.djOrder || !Array.isArray(room.djOrder)) {
                        room.djOrder = room.djs
                            .filter(dj => dj.isActive)
                            .map(dj => String(dj.userId));
                        needsSave = true;
                    }
                }

                // Ensure vote skip fields
                if (room.voteSkipThreshold === undefined || room.voteSkipThreshold === null) {
                    room.voteSkipThreshold = 0.5;
                    needsSave = true;
                }
                if (room.voteSkipEnabled === undefined || room.voteSkipEnabled === null) {
                    room.voteSkipEnabled = true;
                    needsSave = true;
                }
                if (!room.voteSkips || !Array.isArray(room.voteSkips)) {
                    room.voteSkips = [];
                    needsSave = true;
                }

                // Ensure settings
                if (!room.settings) {
                    room.settings = {
                        autoplay: true,
                        allowMemberSkip: false,
                        allowMemberAddTrack: true,
                        strictSync: true,
                    };
                    needsSave = true;
                }

                // Save if changes were made
                if (needsSave) {
                    await room.save();
                    migrated++;
                    console.log(`✅ Migrated room: ${room.roomId}`);
                } else {
                    skipped++;
                    console.log(`⏭️  Skipped room (already migrated): ${room.roomId}`);
                }
            } catch (error) {
                errors++;
                console.error(`❌ Error migrating room ${room.roomId}:`, error.message);
            }
        }

        console.log('\n📊 Migration Summary:');
        console.log(`   ✅ Migrated: ${migrated}`);
        console.log(`   ⏭️  Skipped: ${skipped}`);
        console.log(`   ❌ Errors: ${errors}`);
        console.log('\n✅ Migration completed!');

    } catch (error) {
        console.error('❌ Migration error:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

// Run migration
if (require.main === module) {
    migrateRoomsToJqbx();
}

module.exports = { migrateRoomsToJqbx };

