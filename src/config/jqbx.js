/**
 * JQBX Configuration
 * Centralized configuration for JQBX-style features
 */

module.exports = {
    // Sync settings
    sync: {
        heartbeatInterval: 3000, // 3 seconds (JQBX standard)
        serverTickInterval: 250, // ms - server broadcast sync every 250ms
        driftThreshold: 300, // ms - legacy threshold (deprecated, use driftRules)
        jitterThreshold: 2000, // ms - position delta > 2s = host lagging
        // Drift correction rules (JQBX standard)
        driftRules: {
            ignoreThreshold: 200, // ms - ignore drift < 200ms
            softCorrectThreshold: 800, // ms - soft correct if 200-800ms
            hardSeekThreshold: 800, // ms - hard seek if > 800ms
        },
    },

    // Track-end detection
    trackEnd: {
        softEndOffset: 1.2, // seconds before end to emit track_ending_soon
        hardEndTolerance: 0.5, // seconds tolerance for hard end detection
        rotationEngineTick: 250, // ms - tick interval for rotation engine
        playbackEngineTick: 500, // ms - tick interval for normal playback engine (optimized from 1000)
    },

    // DJ Rotation settings
    djRotation: {
        idleTimeout: 10 * 60 * 1000, // 10 minutes - auto-kick idle DJs
        prepareNextOffset: 3, // seconds before end to emit prepare_next_track
        allowAutoplayFallback: true, // Allow autoplay when all DJs empty
    },

    // Vote Skip settings
    voteSkip: {
        defaultThreshold: 0.5, // 50% of active users
        idleTimeout: 60 * 1000, // 60 seconds - user considered idle
        gracePeriod: 5 * 1000, // 5 seconds - votes from disconnected users still count
    },

    // Autoplay settings
    autoplay: {
        maxConsecutive: 5, // Max consecutive autoplay tracks before stopping
        relatedSongsLimit: 20, // Max related songs to fetch
        relatedSongsFullDataLimit: 10, // Max songs to get full data for
    },

    // ZingMP3 service settings
    zing: {
        cacheTTL: 5 * 60 * 1000, // 5 minutes - metadata cache TTL
        retryAttempts: 3, // Number of retry attempts
        retryDelay: 1000, // ms - delay between retries
    },

    // Locking settings
    locking: {
        useRedis: !!process.env.REDIS_URL, // Use Redis if available
        inProcessLockTTL: 2000, // ms - TTL for in-process locks
    },
};

