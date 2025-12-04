/**
 * Permission Utilities - Role-based permission system for JQBX rooms
 * Supports roles: owner, host, dj, member, guest
 */

const AppError = require('./AppError');

/**
 * User roles in a room
 */
const ROLE = {
    OWNER: 'owner',
    HOST: 'host',
    DJ: 'dj',
    MEMBER: 'member',
    GUEST: 'guest',
};

/**
 * Actions that can be performed in a room
 */
const ACTION = {
    // Room management
    CHANGE_ROOM_MODE: 'change_room_mode',
    CHANGE_ROOM_SETTINGS: 'change_room_settings',
    KICK_MEMBER: 'kick_member',
    INVITE_USER: 'invite_user',

    // Playback control
    PLAY: 'play',
    PAUSE: 'pause',
    SEEK: 'seek',
    SKIP: 'skip',
    CHANGE_TRACK: 'change_track',

    // Queue management
    ADD_TRACK: 'add_track',
    REMOVE_TRACK: 'remove_track',
    REORDER_QUEUE: 'reorder_queue',

    // Vote skip
    VOTE_SKIP: 'vote_skip',

    // DJ rotation
    JOIN_DJ: 'join_dj',
    LEAVE_DJ: 'leave_dj',
    ADD_DJ_TRACK: 'add_dj_track',
    REMOVE_DJ_TRACK: 'remove_dj_track',
    REORDER_DJ_QUEUE: 'reorder_dj_queue',
};

/**
 * Permission matrix: role -> action -> allowed
 * true = allowed, false = not allowed
 */
const PERMISSION_MATRIX = {
    [ROLE.OWNER]: {
        // Room management - full access
        [ACTION.CHANGE_ROOM_MODE]: true,
        [ACTION.CHANGE_ROOM_SETTINGS]: true,
        [ACTION.KICK_MEMBER]: true,
        [ACTION.INVITE_USER]: true,

        // Playback control - full access
        [ACTION.PLAY]: true,
        [ACTION.PAUSE]: true,
        [ACTION.SEEK]: true,
        [ACTION.SKIP]: true,
        [ACTION.CHANGE_TRACK]: true,

        // Queue management - full access
        [ACTION.ADD_TRACK]: true,
        [ACTION.REMOVE_TRACK]: true,
        [ACTION.REORDER_QUEUE]: true,

        // Vote skip
        [ACTION.VOTE_SKIP]: true,

        // DJ rotation
        [ACTION.JOIN_DJ]: true,
        [ACTION.LEAVE_DJ]: true,
        [ACTION.ADD_DJ_TRACK]: true,
        [ACTION.REMOVE_DJ_TRACK]: true,
        [ACTION.REORDER_DJ_QUEUE]: true,
    },

    [ROLE.HOST]: {
        // Room management - limited (cannot change mode)
        [ACTION.CHANGE_ROOM_MODE]: false,
        [ACTION.CHANGE_ROOM_SETTINGS]: true,
        [ACTION.KICK_MEMBER]: true,
        [ACTION.INVITE_USER]: true,

        // Playback control - full access
        [ACTION.PLAY]: true,
        [ACTION.PAUSE]: true,
        [ACTION.SEEK]: true,
        [ACTION.SKIP]: true,
        [ACTION.CHANGE_TRACK]: true,

        // Queue management - full access
        [ACTION.ADD_TRACK]: true,
        [ACTION.REMOVE_TRACK]: true,
        [ACTION.REORDER_QUEUE]: true,

        // Vote skip
        [ACTION.VOTE_SKIP]: true,

        // DJ rotation
        [ACTION.JOIN_DJ]: true,
        [ACTION.LEAVE_DJ]: true,
        [ACTION.ADD_DJ_TRACK]: true,
        [ACTION.REMOVE_DJ_TRACK]: true,
        [ACTION.REORDER_DJ_QUEUE]: true,
    },

    [ROLE.DJ]: {
        // Room management - no access
        [ACTION.CHANGE_ROOM_MODE]: false,
        [ACTION.CHANGE_ROOM_SETTINGS]: false,
        [ACTION.KICK_MEMBER]: false,
        [ACTION.INVITE_USER]: false,

        // Playback control - only if current DJ in rotation mode
        [ACTION.PLAY]: false, // Only current DJ can control
        [ACTION.PAUSE]: false,
        [ACTION.SEEK]: false,
        [ACTION.SKIP]: false,
        [ACTION.CHANGE_TRACK]: false,

        // Queue management - own DJ queue only
        [ACTION.ADD_TRACK]: false, // Use ADD_DJ_TRACK instead
        [ACTION.REMOVE_TRACK]: false,
        [ACTION.REORDER_QUEUE]: false,

        // Vote skip
        [ACTION.VOTE_SKIP]: true,

        // DJ rotation - own queue only
        [ACTION.JOIN_DJ]: false, // Already a DJ
        [ACTION.LEAVE_DJ]: true,
        [ACTION.ADD_DJ_TRACK]: true, // Own queue
        [ACTION.REMOVE_DJ_TRACK]: true, // Own queue
        [ACTION.REORDER_DJ_QUEUE]: true, // Own queue
    },

    [ROLE.MEMBER]: {
        // Room management - no access
        [ACTION.CHANGE_ROOM_MODE]: false,
        [ACTION.CHANGE_ROOM_SETTINGS]: false,
        [ACTION.KICK_MEMBER]: false,
        [ACTION.INVITE_USER]: false,

        // Playback control - depends on mode
        [ACTION.PLAY]: false, // Only host/DJ/coop members
        [ACTION.PAUSE]: false,
        [ACTION.SEEK]: false,
        [ACTION.SKIP]: false,
        [ACTION.CHANGE_TRACK]: false,

        // Queue management - depends on settings
        [ACTION.ADD_TRACK]: false, // Depends on allowMemberAddTrack
        [ACTION.REMOVE_TRACK]: false,
        [ACTION.REORDER_QUEUE]: false,

        // Vote skip
        [ACTION.VOTE_SKIP]: true,

        // DJ rotation
        [ACTION.JOIN_DJ]: true,
        [ACTION.LEAVE_DJ]: false,
        [ACTION.ADD_DJ_TRACK]: false,
        [ACTION.REMOVE_DJ_TRACK]: false,
        [ACTION.REORDER_DJ_QUEUE]: false,
    },

    [ROLE.GUEST]: {
        // No access to anything
        [ACTION.CHANGE_ROOM_MODE]: false,
        [ACTION.CHANGE_ROOM_SETTINGS]: false,
        [ACTION.KICK_MEMBER]: false,
        [ACTION.INVITE_USER]: false,
        [ACTION.PLAY]: false,
        [ACTION.PAUSE]: false,
        [ACTION.SEEK]: false,
        [ACTION.SKIP]: false,
        [ACTION.CHANGE_TRACK]: false,
        [ACTION.ADD_TRACK]: false,
        [ACTION.REMOVE_TRACK]: false,
        [ACTION.REORDER_QUEUE]: false,
        [ACTION.VOTE_SKIP]: false,
        [ACTION.JOIN_DJ]: false,
        [ACTION.LEAVE_DJ]: false,
        [ACTION.ADD_DJ_TRACK]: false,
        [ACTION.REMOVE_DJ_TRACK]: false,
        [ACTION.REORDER_DJ_QUEUE]: false,
    },
};

/**
 * Get user role in a room
 * @param {Object} room - Room object
 * @param {string} userId - User ID
 * @returns {string} User role
 */
function getUserRole(room, userId) {
    const userIdString = String(userId);

    // Owner
    if (String(room.ownerId) === userIdString) {
        return ROLE.OWNER;
    }

    // Host
    if (String(room.hostId || room.ownerId) === userIdString) {
        return ROLE.HOST;
    }

    // DJ (in rotation mode)
    if (room.mode === 'dj_rotation' && room.djs) {
        const isDj = room.djs.some(dj => String(dj.userId) === userIdString && dj.isActive);
        if (isDj) {
            return ROLE.DJ;
        }
    }

    // Member
    const isMember = room.members && room.members.some(m => String(m.userId) === userIdString);
    if (isMember) {
        return ROLE.MEMBER;
    }

    // Guest (not a member)
    return ROLE.GUEST;
}

/**
 * Check if user has permission for an action
 * @param {Object} room - Room object
 * @param {string} userId - User ID
 * @param {string} action - Action to check
 * @param {Object} context - Additional context (e.g., { isCurrentDj: true })
 * @returns {boolean} True if user has permission
 */
function hasPermission(room, userId, action, context = {}) {
    const role = getUserRole(room, userId);

    // Get base permission from matrix
    const basePermission = PERMISSION_MATRIX[role]?.[action] ?? false;

    if (!basePermission) {
        return false;
    }

    // Mode-specific overrides

    // COOP mode: all members can control playback
    if (room.mode === 'coop' && role === ROLE.MEMBER) {
        if ([ACTION.PLAY, ACTION.PAUSE, ACTION.SEEK, ACTION.SKIP, ACTION.CHANGE_TRACK].includes(action)) {
            return true;
        }
        if ([ACTION.ADD_TRACK, ACTION.REMOVE_TRACK, ACTION.REORDER_QUEUE].includes(action)) {
            return true;
        }
    }

    // Rotation mode: only current DJ can control playback
    if (room.mode === 'dj_rotation' && role === ROLE.DJ) {
        if ([ACTION.PLAY, ACTION.PAUSE, ACTION.SEEK, ACTION.SKIP, ACTION.CHANGE_TRACK].includes(action)) {
            const currentDj = room.djs[room.currentDjIndex];
            if (!currentDj || String(currentDj.userId) !== String(userId)) {
                return false; // Not current DJ
            }
        }
    }

    // Normal/Host mode: only host can control playback
    if (room.mode === 'normal' && role === ROLE.MEMBER) {
        if ([ACTION.PLAY, ACTION.PAUSE, ACTION.SEEK, ACTION.SKIP, ACTION.CHANGE_TRACK].includes(action)) {
            return false; // Only host can control
        }
    }

    // Settings-based overrides

    // allowMemberAddTrack: members can add tracks if enabled
    if (action === ACTION.ADD_TRACK && role === ROLE.MEMBER) {
        return room.settings?.allowMemberAddTrack === true;
    }

    // allowMemberSkip: members can skip via vote if enabled
    if (action === ACTION.SKIP && role === ROLE.MEMBER) {
        return room.settings?.allowMemberSkip === true && room.voteSkipEnabled !== false;
    }

    return basePermission;
}

/**
 * Check permission and throw error if not allowed
 * @param {Object} room - Room object
 * @param {string} userId - User ID
 * @param {string} action - Action to check
 * @param {Object} context - Additional context
 * @throws {AppError} If permission denied
 */
function requirePermission(room, userId, action, context = {}) {
    if (!hasPermission(room, userId, action, context)) {
        const role = getUserRole(room, userId);
        throw new AppError(
            'FORBIDDEN',
            `Permission denied: ${role} cannot perform ${action} in ${room.mode} mode`
        );
    }
}

/**
 * Check if user is current DJ in rotation mode
 * @param {Object} room - Room object
 * @param {string} userId - User ID
 * @returns {boolean} True if user is current DJ
 */
function isCurrentDj(room, userId) {
    if (room.mode !== 'dj_rotation' || room.currentDjIndex < 0) {
        return false;
    }

    const currentDj = room.djs[room.currentDjIndex];
    return currentDj && String(currentDj.userId) === String(userId);
}

/**
 * Check if user can control playback in current mode
 * @param {Object} room - Room object
 * @param {string} userId - User ID
 * @returns {boolean} True if user can control playback
 */
function canControlPlayback(room, userId) {
    const role = getUserRole(room, userId);

    // Owner and host can always control
    if (role === ROLE.OWNER || role === ROLE.HOST) {
        return true;
    }

    // COOP mode: all members can control
    if (room.mode === 'coop' && role === ROLE.MEMBER) {
        return true;
    }

    // Rotation mode: only current DJ can control
    if (room.mode === 'dj_rotation' && role === ROLE.DJ) {
        return isCurrentDj(room, userId);
    }

    // Normal mode: only host can control
    return false;
}

module.exports = {
    ROLE,
    ACTION,
    getUserRole,
    hasPermission,
    requirePermission,
    isCurrentDj,
    canControlPlayback,
};

