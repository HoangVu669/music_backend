/**
 * DJ Rotation Controller - API endpoints cho DJ Rotation Mode
 */
const djRotationService = require('../../services/user/djRotationService');
const formatResponse = require('../../utils/formatResponse');
const AppError = require('../../utils/AppError');

class DjRotationController {
    /**
     * POST /api/v1/user/rooms/dj-rotation/create
     * Tạo phòng với DJ Rotation mode
     */
    async createRotationRoom(req, res, next) {
        try {
            const userId = req.user.id;
            const userName = req.user.username || req.user.fullname || 'User';
            const { name, description, isPrivate, maxMembers, rotationSettings } = req.body;

            const room = await djRotationService.createRotationRoom(userId, userName, {
                name,
                description,
                isPrivate,
                maxMembers,
                rotationSettings,
            });

            res.status(201).json(
                formatResponse.success(room, 'CREATED', 'Tạo phòng DJ rotation thành công')
            );
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/user/rooms/:roomId/dj-rotation/state
     * Lấy trạng thái phòng DJ rotation
     */
    async getRoomState(req, res, next) {
        try {
            const { roomId } = req.params;
            const userId = req.user?.id || null;

            const room = await djRotationService.getRoomState(roomId, userId);

            res.json(formatResponse.success(room));
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/user/rooms/:roomId/dj-rotation/dj/add
     * Thêm DJ vào rotation
     */
    async addDj(req, res, next) {
        try {
            const { roomId } = req.params;
            const userId = req.user.id;
            const userName = req.user.username || req.user.fullname || 'User';

            const room = await djRotationService.addDj(roomId, userId, userName);

            res.json(formatResponse.success(room, 'UPDATED', 'Thêm DJ thành công'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/user/rooms/:roomId/dj-rotation/dj/remove
     * Xóa DJ khỏi rotation
     */
    async removeDj(req, res, next) {
        try {
            const { roomId } = req.params;
            const userId = req.user.id;

            const room = await djRotationService.removeDj(roomId, userId);

            res.json(formatResponse.success(room, 'UPDATED', 'Xóa DJ thành công'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/user/rooms/:roomId/dj-rotation/dj/join-slot
     * DJ join vào slot (alias của addDj)
     */
    async joinSlot(req, res, next) {
        try {
            const { roomId } = req.params;
            const userId = req.user.id;
            const userName = req.user.username || req.user.fullname || 'User';

            const room = await djRotationService.addDj(roomId, userId, userName);

            res.json(formatResponse.success(room, 'UPDATED', 'Tham gia DJ slot thành công'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/user/rooms/:roomId/dj-rotation/dj/leave-slot
     * DJ rời khỏi slot (alias của removeDj)
     */
    async leaveSlot(req, res, next) {
        try {
            const { roomId } = req.params;
            const userId = req.user.id;

            const room = await djRotationService.removeDj(roomId, userId);

            res.json(formatResponse.success(room, 'UPDATED', 'Rời DJ slot thành công'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/user/rooms/:roomId/dj-rotation/dj/add-track
     * Thêm bài hát vào queue của DJ
     */
    async addTrack(req, res, next) {
        try {
            const { roomId } = req.params;
            const { zingId } = req.body;
            const userId = req.user.id;

            if (!zingId) {
                throw new AppError('VALIDATION_ERROR', 'zingId là bắt buộc');
            }

            const room = await djRotationService.addTrackToDjQueue(roomId, userId, zingId);

            res.status(201).json(
                formatResponse.success(room, 'CREATED', 'Thêm bài hát vào DJ queue thành công')
            );
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/user/rooms/:roomId/dj-rotation/dj/remove-track
     * Xóa bài hát khỏi queue của DJ
     */
    async removeTrack(req, res, next) {
        try {
            const { roomId } = req.params;
            const { zingId } = req.body;
            const userId = req.user.id;

            if (!zingId) {
                throw new AppError('VALIDATION_ERROR', 'zingId là bắt buộc');
            }

            const room = await djRotationService.removeTrackFromDjQueue(roomId, userId, zingId);

            res.json(formatResponse.success(room, 'DELETED', 'Xóa bài hát khỏi DJ queue thành công'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/user/rooms/:roomId/dj-rotation/advance
     * Chuyển sang DJ tiếp theo (chỉ owner)
     */
    async advanceToNextDj(req, res, next) {
        try {
            const { roomId } = req.params;
            const userId = req.user.id;

            // Kiểm tra quyền owner
            const Room = require('../../models/Room');
            const room = await Room.findOne({ roomId, isActive: true });
            if (!room) {
                throw new AppError('NOT_FOUND', 'Không tìm thấy phòng');
            }

            if (String(room.ownerId) !== String(userId)) {
                throw new AppError('FORBIDDEN', 'Chỉ chủ phòng mới được chuyển DJ thủ công');
            }

            const updatedRoom = await djRotationService.advanceToNextDj(roomId);

            res.json(formatResponse.success(updatedRoom, 'UPDATED', 'Chuyển sang DJ tiếp theo thành công'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/v1/user/rooms/:roomId/dj-rotation/reorder
     * Sắp xếp lại thứ tự DJ (chỉ owner)
     */
    async reorderDjs(req, res, next) {
        try {
            const { roomId } = req.params;
            const { newOrder } = req.body;
            const userId = req.user.id;

            if (!newOrder || !Array.isArray(newOrder)) {
                throw new AppError('VALIDATION_ERROR', 'newOrder phải là array');
            }

            const room = await djRotationService.reorderDjs(roomId, userId, newOrder);

            res.json(formatResponse.success(room, 'UPDATED', 'Sắp xếp lại thứ tự DJ thành công'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/v1/user/rooms/:roomId/dj-rotation/dj/queue/reorder
     * Sắp xếp lại queue của DJ
     */
    async reorderDjQueue(req, res, next) {
        try {
            const { roomId } = req.params;
            const { newOrder } = req.body;
            const userId = req.user.id;

            if (!newOrder || !Array.isArray(newOrder)) {
                throw new AppError('VALIDATION_ERROR', 'newOrder phải là array');
            }

            const room = await djRotationService.reorderDjQueue(roomId, userId, newOrder);

            res.json(formatResponse.success(room, 'UPDATED', 'Sắp xếp lại queue thành công'));
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new DjRotationController();

