/**
 * User Search Service - Tìm kiếm người dùng
 * Clean Code: Tách riêng logic tìm kiếm user
 */
const User = require('../../models/User');
const { USER_STATUS } = require('../../models/Enum');

class UserSearchService {
    /**
     * Tìm kiếm người dùng theo keyword
     * @param {string} keyword - Từ khóa tìm kiếm (username, email, fullname)
     * @param {number} limit - Số lượng kết quả tối đa
     * @param {string} excludeUserId - User ID cần loại trừ (không hiển thị chính mình)
     * @returns {Promise<Array>} Danh sách người dùng
     */
    async searchUsers(keyword, limit = 20, excludeUserId = null) {
        if (!keyword || keyword.trim().length === 0) {
            return [];
        }

        const searchQuery = {
            status: USER_STATUS.ACTIVE,
            $or: [
                { username: { $regex: keyword, $options: 'i' } },
                { email: { $regex: keyword, $options: 'i' } },
                { fullname: { $regex: keyword, $options: 'i' } },
            ],
        };

        // Loại trừ user hiện tại
        if (excludeUserId) {
            searchQuery.id = { $ne: excludeUserId };
        }

        const users = await User.find(searchQuery)
            .select('id username email fullname avatar bio')
            .limit(limit)
            .lean();

        return users.map((user) => ({
            id: user.id,
            username: user.username,
            email: user.email,
            fullname: user.fullname,
            avatar: user.avatar,
            bio: user.bio,
        }));
    }

    /**
     * Tìm kiếm người dùng theo ID
     * @param {string|number} userId - User ID
     * @returns {Promise<Object|null>} Thông tin người dùng
     */
    async getUserById(userId) {
        const user = await User.findOne({ id: userId, status: USER_STATUS.ACTIVE })
            .select('id username email fullname avatar bio')
            .lean();

        if (!user) {
            return null;
        }

        return {
            id: user.id,
            username: user.username,
            email: user.email,
            fullname: user.fullname,
            avatar: user.avatar,
            bio: user.bio,
        };
    }

    /**
     * Kiểm tra user có tồn tại và active không
     * @param {string|number} userId - User ID
     * @returns {Promise<boolean>}
     */
    async isUserActive(userId) {
        const user = await User.findOne({ id: userId, status: USER_STATUS.ACTIVE })
            .select('id')
            .lean();
        return !!user;
    }
}

module.exports = new UserSearchService();

