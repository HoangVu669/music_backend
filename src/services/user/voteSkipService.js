/**
 * Vote Skip Service - Quản lý vote skip system (JQBX-style)
 * Xử lý logic vote skip, threshold checking, và auto skip
 */
const Room = require('../../models/Room');
const RoomActivity = require('../../models/RoomActivity');
const jqbxConfig = require('../../config/jqbx');
const AppError = require('../../utils/AppError');

class VoteSkipService {
    /**
     * Vote skip bài đang phát
     * @param {string} roomId - ID phòng
     * @param {string} userId - ID người vote
     * @param {string} userName - Tên người vote
     * @returns {Promise<Object>} Vote skip result
     */
    async voteSkip(roomId, userId, userName) {
        const room = await Room.findOne({ roomId, isActive: true });
        if (!room) {
            throw new AppError('NOT_FOUND', 'Không tìm thấy phòng');
        }

        // Kiểm tra vote skip có được bật không
        if (!room.voteSkipEnabled) {
            throw new AppError('VOTE_SKIP_DISABLED', 'Vote skip đã bị tắt trong phòng này');
        }

        // Kiểm tra có bài đang phát không
        if (!room.currentTrack?.zingId || !room.isPlaying) {
            throw new AppError('NO_TRACK_PLAYING', 'Không có bài hát đang phát');
        }

        const userIdString = String(userId);

        // Host/Owner skip luôn được (không cần vote)
        const { canControlPlayback } = require('../../utils/permissionUtils');
        if (canControlPlayback(room, userId)) {
            return await this.executeSkip(roomId, userId, 'HOST_SKIP');
        }

        // Kiểm tra user có trong phòng không
        const isMember = room.members.some((m) => String(m.userId) === userIdString);
        if (!isMember) {
            throw new AppError('FORBIDDEN', 'Bạn phải tham gia phòng để vote skip');
        }

        // Kiểm tra đã vote chưa (JQBX-style: sessionId = trackId + startedAt)
        // Mỗi track session (trackId + startedAt) là một session riêng
        // User chỉ vote được 1 lần / 1 session
        const currentSessionId = `${room.currentTrack.zingId}_${room.currentTrack.startedAt}`;
        const existingVote = room.voteSkips.find((v) => {
            // Check sessionId match
            const voteSessionId = v.sessionId || `${room.currentTrack.zingId}_${room.currentTrack.startedAt}`;
            return String(v.userId) === userIdString && voteSessionId === currentSessionId;
        });
        if (existingVote) {
            throw new AppError('ALREADY_VOTED', 'Bạn đã vote skip bài này rồi');
        }

        // Thêm vote với sessionId
        room.voteSkips.push({
            userId: userIdString,
            userName,
            votedAt: new Date(),
            sessionId: currentSessionId, // Store sessionId explicitly
        });

        await room.save();

        // Calculate active users (exclude idle)
        // Note: This requires socketService to track socket activity
        // For now, use memberCount as fallback, but structure allows for active user calculation
        const activeUserCount = this.getActiveUserCount(room); // Will be implemented with socket tracking
        const memberCount = activeUserCount || room.memberCount || 1;

        // Coop mode uses 2/3 threshold, others use configured threshold
        const defaultThreshold = room.mode === 'coop' ? 0.6667 : (room.voteSkipThreshold || jqbxConfig.voteSkip.defaultThreshold);
        const threshold = Math.ceil(memberCount * defaultThreshold);
        const voteCount = room.voteSkips.filter(v => {
            const voteSessionId = v.sessionId || `${room.currentTrack.zingId}_${room.currentTrack.startedAt}`;
            return voteSessionId === currentSessionId;
        }).length;
        const hasEnoughVotes = voteCount >= threshold;

        // Log activity
        await RoomActivity.create({
            roomId,
            userId,
            userName,
            activityType: 'VOTE_SKIP',
            metadata: { voteCount, threshold, hasEnoughVotes },
        });

        // Nếu đủ vote, tự động skip
        if (hasEnoughVotes) {
            return await this.executeSkip(roomId, null, 'VOTE_PASSED');
        }

        return {
            voted: true,
            voteCount,
            threshold,
            hasEnoughVotes: false,
            needMoreVotes: threshold - voteCount,
        };
    }

    /**
     * Unvote skip (bỏ vote)
     * @param {string} roomId - ID phòng
     * @param {string} userId - ID người bỏ vote
     * @returns {Promise<Object>} Result
     */
    async unvoteSkip(roomId, userId) {
        const room = await Room.findOne({ roomId, isActive: true });
        if (!room) {
            throw new AppError('NOT_FOUND', 'Không tìm thấy phòng');
        }

        const userIdString = String(userId);

        // Xóa vote
        const voteIndex = room.voteSkips.findIndex((v) => String(v.userId) === userIdString);
        if (voteIndex === -1) {
            throw new AppError('NOT_VOTED', 'Bạn chưa vote skip bài này');
        }

        room.voteSkips.splice(voteIndex, 1);
        await room.save();

        const voteCount = room.voteSkips.length;
        const memberCount = room.memberCount || 1;
        const threshold = Math.ceil(memberCount * (room.voteSkipThreshold || 0.5));

        return {
            unvoted: true,
            voteCount,
            threshold,
            hasEnoughVotes: voteCount >= threshold,
        };
    }

    /**
     * Reset vote skips (khi bài mới bắt đầu)
     * JQBX-style: Reset khi track mới bắt đầu (sessionId thay đổi)
     * @param {string} roomId - ID phòng
     * @returns {Promise<void>}
     */
    async resetVoteSkips(roomId) {
        const room = await Room.findOne({ roomId, isActive: true });
        if (!room) {
            return;
        }

        // Reset votes khi bài mới bắt đầu
        room.voteSkips = [];
        await room.save();
    }

    /**
     * Cleanup old votes (votes không còn hợp lệ do sessionId thay đổi)
     * @param {string} roomId - ID phòng
     * @returns {Promise<void>}
     */
    async cleanupOldVotes(roomId) {
        const room = await Room.findOne({ roomId, isActive: true });
        if (!room || !room.currentTrack?.zingId || !room.currentTrack?.startedAt) {
            return;
        }

        // Xóa votes không còn hợp lệ (sessionId khác)
        const currentSessionId = `${room.currentTrack.zingId}_${room.currentTrack.startedAt}`;
        room.voteSkips = room.voteSkips.filter((vote) => {
            // Votes sẽ tự động invalid khi startedAt thay đổi
            // Giữ lại để có thể reuse nếu cần
            return true;
        });

        await room.save();
    }

    /**
     * Execute skip (thực hiện skip)
     * @private
     */
    async executeSkip(roomId, userId, reason) {
        const room = await Room.findOne({ roomId, isActive: true });
        if (!room) {
            throw new AppError('NOT_FOUND', 'Không tìm thấy phòng');
        }

        // Reset votes
        room.voteSkips = [];
        await room.save();

        // Gọi skip logic tùy theo mode
        if (room.mode === 'dj_rotation') {
            const djRotationService = require('./djRotationService');
            const updatedRoom = await djRotationService.advanceToNextDj(roomId);
            return {
                skipped: true,
                reason,
                room: updatedRoom,
            };
        } else {
            // Normal mode
            const roomService = require('./roomService');
            const updatedRoom = await roomService.hostSkip(roomId, userId || room.hostId || room.ownerId);
            return {
                skipped: true,
                reason,
                room: updatedRoom,
            };
        }
    }

    /**
     * Get vote skip status
     * @param {string} roomId - ID phòng
     * @returns {Promise<Object>} Vote skip status
     */
    async getVoteSkipStatus(roomId) {
        const room = await Room.findOne({ roomId, isActive: true }).lean();
        if (!room) {
            throw new AppError('NOT_FOUND', 'Không tìm thấy phòng');
        }

        const currentSessionId = room.currentTrack?.zingId && room.currentTrack?.startedAt
            ? `${room.currentTrack.zingId}_${room.currentTrack.startedAt}`
            : null;

        const votes = room.voteSkips || [];
        const sessionVotes = currentSessionId
            ? votes.filter(v => {
                const voteSessionId = v.sessionId || `${room.currentTrack.zingId}_${room.currentTrack.startedAt}`;
                return voteSessionId === currentSessionId;
            })
            : [];

        const voteCount = sessionVotes.length;
        const activeUserCount = this.getActiveUserCount(room);
        const memberCount = activeUserCount || room.memberCount || 1;
        const threshold = Math.ceil(memberCount * (room.voteSkipThreshold || jqbxConfig.voteSkip.defaultThreshold));
        const hasEnoughVotes = voteCount >= threshold;

        return {
            voteCount,
            threshold,
            hasEnoughVotes,
            needMoreVotes: Math.max(0, threshold - voteCount),
            voteSkipEnabled: room.voteSkipEnabled !== false,
            votes: sessionVotes,
            activeUserCount,
            memberCount,
        };
    }

    /**
     * Get active user count (exclude idle users)
     * Note: This should be integrated with socketService to track socket activity
     * For now, returns memberCount as fallback
     * @private
     */
    getActiveUserCount(room) {
        // TODO: Integrate with socketService.socketActivity to get real active users
        // For now, return memberCount
        return room.memberCount || 1;
    }
}

module.exports = new VoteSkipService();

