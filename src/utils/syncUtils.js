/**
 * Sync Utilities - Centralized position calculation and sync data formatting
 * JQBX-style sync utilities
 */

const jqbxConfig = require('../config/jqbx');

/**
 * Calculate current position based on startedAt and isPlaying
 * @param {Object} currentTrack - Current track object
 * @param {boolean} isPlaying - Is playing state
 * @param {number} serverNow - Server timestamp (optional, defaults to Date.now())
 * @returns {number} Current position in seconds (decimal precision)
 */
function calculatePosition(currentTrack, isPlaying, serverNow = null) {
    if (!currentTrack || !currentTrack.zingId) {
        return 0;
    }

    const now = serverNow || Date.now();
    const startedAt = currentTrack.startedAt || 0;
    const duration = currentTrack.duration || 0;

    if (startedAt === 0 || duration === 0) {
        return currentTrack.position || 0;
    }

    let currentPosition = currentTrack.position || 0;

    if (isPlaying && startedAt > 0) {
        // Đang phát: position = elapsed từ khi startedAt
        const elapsed = (now - startedAt) / 1000; // seconds (decimal precision)
        currentPosition = Math.min(
            Math.max(0, elapsed), // Đảm bảo >= 0
            duration
        );
    } else {
        // Đang pause: position = position hiện tại (không tăng)
        currentPosition = Math.min(
            Math.max(0, currentTrack.position || 0),
            duration
        );
    }

    return currentPosition;
}

/**
 * Get sync data for a room (JQBX-style)
 * @param {Object} room - Room object
 * @param {number} serverNow - Server timestamp (optional)
 * @returns {Object} Sync data
 */
function getSyncData(room, serverNow = null) {
    const now = serverNow || Date.now();

    if (!room || !room.currentTrack || !room.currentTrack.zingId) {
        return {
            trackId: null,
            zingId: null,
            position: 0,
            isPlaying: false,
            timestamp: now,
            serverTime: now,
            startedAt: 0,
            duration: 0,
        };
    }

    const currentPosition = calculatePosition(room.currentTrack, room.isPlaying, now);

    return {
        trackId: room.currentTrack.zingId, // JQBX-style: trackId
        zingId: room.currentTrack.zingId, // Keep for compatibility
        position: Math.floor(currentPosition), // Round to integer seconds for sync
        positionDecimal: currentPosition, // Keep decimal precision
        isPlaying: room.isPlaying || false,
        timestamp: now,
        serverTime: now, // Server time for drift compensation
        startedAt: room.currentTrack.startedAt || 0,
        duration: room.currentTrack.duration || 0,
        // Additional JQBX fields
        title: room.currentTrack.title,
        artist: room.currentTrack.artist || room.currentTrack.artists,
        thumbnail: room.currentTrack.thumbnail,
        djUserId: room.currentTrack.djUserId || null,
        queuedBy: room.currentTrack.queuedBy || null,
        mode: room.currentTrack.mode || (room.mode === 'dj_rotation' ? 'rotation' : 'normal'),
    };
}

/**
 * Detect jitter (abnormal position jumps)
 * @param {number} previousPosition - Previous position
 * @param {number} currentPosition - Current position
 * @param {number} timeDelta - Time delta in ms
 * @returns {boolean} True if jitter detected
 */
function detectJitter(previousPosition, currentPosition, timeDelta) {
    const expectedDelta = timeDelta / 1000; // Convert to seconds
    const actualDelta = Math.abs(currentPosition - previousPosition);
    const jump = Math.abs(actualDelta - expectedDelta);

    return jump > jqbxConfig.sync.jitterThreshold / 1000; // Convert threshold to seconds
}

/**
 * Calculate drift correction action based on drift amount
 * JQBX standard drift rules:
 * - <200ms: ignore (no correction)
 * - 200-800ms: soft correct (gradual adjustment)
 * - >800ms: hard seek (immediate seek)
 * @param {number} driftMs - Drift in milliseconds
 * @returns {Object} { action: 'ignore' | 'soft' | 'hard', driftMs }
 */
function calculateDriftAction(driftMs) {
    const { ignoreThreshold, softCorrectThreshold, hardSeekThreshold } = jqbxConfig.sync.driftRules;

    if (driftMs < ignoreThreshold) {
        return { action: 'ignore', driftMs };
    } else if (driftMs < hardSeekThreshold) {
        return { action: 'soft', driftMs };
    } else {
        return { action: 'hard', driftMs };
    }
}

/**
 * Get drift correction data for client
 * @param {Object} syncData - Sync data from server
 * @param {number} clientPosition - Client's current position (seconds)
 * @param {number} clientTimestamp - Client's timestamp when position was measured
 * @returns {Object} Drift correction data
 */
function getDriftCorrection(syncData, clientPosition, clientTimestamp) {
    if (!syncData || !syncData.zingId || !syncData.startedAt) {
        return null;
    }

    // Calculate RTT (if latencyProbe is available)
    const rtt = syncData.latencyProbe ? (Date.now() - syncData.latencyProbe) : 0;
    const serverTime = syncData.serverTime + (rtt / 2);

    // Calculate expected position based on server time
    const elapsed = (serverTime - syncData.startedAt) / 1000; // seconds
    const expectedPosition = Math.min(
        Math.max(0, elapsed),
        syncData.duration || 0
    );

    // Calculate drift
    const driftSeconds = Math.abs(expectedPosition - clientPosition);
    const driftMs = driftSeconds * 1000;

    // Get drift action
    const driftAction = calculateDriftAction(driftMs);

    return {
        expectedPosition,
        clientPosition,
        driftMs,
        driftSeconds,
        action: driftAction.action,
        serverTime,
        rtt,
        syncData,
    };
}

module.exports = {
    calculatePosition,
    getSyncData,
    detectJitter,
    calculateDriftAction,
    getDriftCorrection,
};

