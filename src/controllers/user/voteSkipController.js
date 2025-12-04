/**
 * Vote Skip Controller - API endpoints cho vote skip system
 */
const voteSkipService = require('../../services/user/voteSkipService');
const { formatResponse } = require('../../utils/formatResponse');

class VoteSkipController {
    /**
     * Vote skip bài đang phát
     * POST /api/v1/user/rooms/:roomId/vote-skip
     */
    async voteSkip(req, res, next) {
        try {
            const { roomId } = req.params;
            const userId = req.user.id;

            const result = await voteSkipService.voteSkip(roomId, userId, req.user.username || req.user.fullname);

            res.json(formatResponse(result, 'Vote skip thành công'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Unvote skip
     * DELETE /api/v1/user/rooms/:roomId/vote-skip
     */
    async unvoteSkip(req, res, next) {
        try {
            const { roomId } = req.params;
            const userId = req.user.id;

            const result = await voteSkipService.unvoteSkip(roomId, userId);

            res.json(formatResponse(result, 'Bỏ vote skip thành công'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get vote skip status
     * GET /api/v1/user/rooms/:roomId/vote-skip/status
     */
    async getVoteSkipStatus(req, res, next) {
        try {
            const { roomId } = req.params;

            const status = await voteSkipService.getVoteSkipStatus(roomId);

            res.json(formatResponse(status, 'Lấy trạng thái vote skip thành công'));
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new VoteSkipController();

