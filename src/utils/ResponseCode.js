/**
 * Response Code Enum - Standardized API Response Codes
 * Microservice Architecture - Centralized Error Handling
 */

const ResponseCode = {
    // ===== SUCCESS CODES =====
    SUCCESS: {
        code: 'SUCCESS',
        message: 'Thành công',
        httpStatus: 200,
    },
    CREATED: {
        code: 'CREATED',
        message: 'Tạo mới thành công',
        httpStatus: 201,
    },
    UPDATED: {
        code: 'UPDATED',
        message: 'Cập nhật thành công',
        httpStatus: 200,
    },
    DELETED: {
        code: 'DELETED',
        message: 'Xóa thành công',
        httpStatus: 200,
    },

    // ===== AUTHENTICATION & AUTHORIZATION ERRORS (4xx) =====
    UNAUTHORIZED: {
        code: 'UNAUTHORIZED',
        message: 'Không có quyền truy cập',
        httpStatus: 401,
    },
    TOKEN_INVALID: {
        code: 'TOKEN_INVALID',
        message: 'Token không hợp lệ',
        httpStatus: 401,
    },
    TOKEN_EXPIRED: {
        code: 'TOKEN_EXPIRED',
        message: 'Token đã hết hạn',
        httpStatus: 401,
    },
    TOKEN_MISSING: {
        code: 'TOKEN_MISSING',
        message: 'Token không được cung cấp',
        httpStatus: 401,
    },
    FORBIDDEN: {
        code: 'FORBIDDEN',
        message: 'Không có quyền thực hiện hành động này',
        httpStatus: 403,
    },
    ACCESS_DENIED: {
        code: 'ACCESS_DENIED',
        message: 'Truy cập bị từ chối',
        httpStatus: 403,
    },

    // ===== VALIDATION ERRORS (4xx) =====
    VALIDATION_ERROR: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu không hợp lệ',
        httpStatus: 400,
    },
    MISSING_REQUIRED_FIELD: {
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Thiếu trường bắt buộc',
        httpStatus: 400,
    },
    INVALID_EMAIL: {
        code: 'INVALID_EMAIL',
        message: 'Email không hợp lệ',
        httpStatus: 400,
    },
    INVALID_USERNAME: {
        code: 'INVALID_USERNAME',
        message: 'Tên người dùng không hợp lệ',
        httpStatus: 400,
    },
    INVALID_PASSWORD: {
        code: 'INVALID_PASSWORD',
        message: 'Mật khẩu không hợp lệ',
        httpStatus: 400,
    },
    PASSWORD_TOO_SHORT: {
        code: 'PASSWORD_TOO_SHORT',
        message: 'Mật khẩu phải có ít nhất 6 ký tự',
        httpStatus: 400,
    },
    INVALID_INPUT: {
        code: 'INVALID_INPUT',
        message: 'Dữ liệu đầu vào không hợp lệ',
        httpStatus: 400,
    },

    // ===== NOT FOUND ERRORS (4xx) =====
    NOT_FOUND: {
        code: 'NOT_FOUND',
        message: 'Không tìm thấy',
        httpStatus: 404,
    },
    USER_NOT_EXIST: {
        code: 'USER_NOT_EXIST',
        message: 'Người dùng không tồn tại',
        httpStatus: 404,
    },
    SONG_NOT_FOUND: {
        code: 'SONG_NOT_FOUND',
        message: 'Bài hát không tồn tại',
        httpStatus: 404,
    },
    PLAYLIST_NOT_FOUND: {
        code: 'PLAYLIST_NOT_FOUND',
        message: 'Playlist không tồn tại',
        httpStatus: 404,
    },
    ALBUM_NOT_FOUND: {
        code: 'ALBUM_NOT_FOUND',
        message: 'Album không tồn tại',
        httpStatus: 404,
    },
    ARTIST_NOT_FOUND: {
        code: 'ARTIST_NOT_FOUND',
        message: 'Nghệ sĩ không tồn tại',
        httpStatus: 404,
    },
    COMMENT_NOT_FOUND: {
        code: 'COMMENT_NOT_FOUND',
        message: 'Bình luận không tồn tại',
        httpStatus: 404,
    },
    ROOM_NOT_FOUND: {
        code: 'ROOM_NOT_FOUND',
        message: 'Phòng không tồn tại',
        httpStatus: 404,
    },

    // ===== CONFLICT ERRORS (4xx) =====
    CONFLICT: {
        code: 'CONFLICT',
        message: 'Xung đột dữ liệu',
        httpStatus: 409,
    },
    USER_ALREADY_EXISTS: {
        code: 'USER_ALREADY_EXISTS',
        message: 'Người dùng đã tồn tại',
        httpStatus: 409,
    },
    EMAIL_ALREADY_EXISTS: {
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Email đã được sử dụng',
        httpStatus: 409,
    },
    USERNAME_ALREADY_EXISTS: {
        code: 'USERNAME_ALREADY_EXISTS',
        message: 'Tên người dùng đã được sử dụng',
        httpStatus: 409,
    },
    ALREADY_LIKED: {
        code: 'ALREADY_LIKED',
        message: 'Đã thích rồi',
        httpStatus: 409,
    },
    ALREADY_FOLLOWED: {
        code: 'ALREADY_FOLLOWED',
        message: 'Đã theo dõi rồi',
        httpStatus: 409,
    },
    // Room-specific errors
    ROOM_FULL: {
        code: 'ROOM_FULL',
        message: 'Phòng đã đầy',
        httpStatus: 409,
    },
    PENDING_APPROVAL: {
        code: 'PENDING_APPROVAL',
        message: 'Yêu cầu tham gia đang chờ duyệt',
        httpStatus: 202,
    },
    ALREADY_MEMBER: {
        code: 'ALREADY_MEMBER',
        message: 'Đã là thành viên của phòng',
        httpStatus: 409,
    },
    ALREADY_REQUESTED: {
        code: 'ALREADY_REQUESTED',
        message: 'Đã gửi yêu cầu tham gia',
        httpStatus: 409,
    },
    ALREADY_INVITED: {
        code: 'ALREADY_INVITED',
        message: 'Đã gửi lời mời cho người dùng này',
        httpStatus: 409,
    },
    ALREADY_IN_QUEUE: {
        code: 'ALREADY_IN_QUEUE',
        message: 'Bài hát đã có trong danh sách phát',
        httpStatus: 409,
    },
    NOT_MEMBER: {
        code: 'NOT_MEMBER',
        message: 'Bạn không phải thành viên của phòng',
        httpStatus: 403,
    },
    INVITATION_EXPIRED: {
        code: 'INVITATION_EXPIRED',
        message: 'Lời mời đã hết hạn',
        httpStatus: 410,
    },
    INVALID_STATUS: {
        code: 'INVALID_STATUS',
        message: 'Trạng thái không hợp lệ',
        httpStatus: 400,
    },

    // ===== AUTHENTICATION ERRORS (4xx) =====
    INVALID_CREDENTIALS: {
        code: 'INVALID_CREDENTIALS',
        message: 'Tên đăng nhập hoặc mật khẩu không đúng',
        httpStatus: 401,
    },
    ACCOUNT_LOCKED: {
        code: 'ACCOUNT_LOCKED',
        message: 'Tài khoản đã bị khóa',
        httpStatus: 403,
    },
    ACCOUNT_INACTIVE: {
        code: 'ACCOUNT_INACTIVE',
        message: 'Tài khoản chưa được kích hoạt',
        httpStatus: 403,
    },
    PASSWORD_INCORRECT: {
        code: 'PASSWORD_INCORRECT',
        message: 'Mật khẩu không đúng',
        httpStatus: 401,
    },

    // ===== SERVER ERRORS (5xx) =====
    INTERNAL_ERROR: {
        code: 'INTERNAL_ERROR',
        message: 'Lỗi hệ thống',
        httpStatus: 500,
    },
    DATABASE_ERROR: {
        code: 'DATABASE_ERROR',
        message: 'Lỗi cơ sở dữ liệu',
        httpStatus: 500,
    },
    DATABASE_CONNECTION_FAILED: {
        code: 'DATABASE_CONNECTION_FAILED',
        message: 'Không thể kết nối cơ sở dữ liệu',
        httpStatus: 503,
    },
    EXTERNAL_SERVICE_ERROR: {
        code: 'EXTERNAL_SERVICE_ERROR',
        message: 'Lỗi dịch vụ bên ngoài',
        httpStatus: 502,
    },
    SERVICE_UNAVAILABLE: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Dịch vụ không khả dụng',
        httpStatus: 503,
    },

    // ===== BUSINESS LOGIC ERRORS (4xx) =====
    OPERATION_NOT_ALLOWED: {
        code: 'OPERATION_NOT_ALLOWED',
        message: 'Thao tác không được phép',
        httpStatus: 403,
    },
    CANNOT_FOLLOW_SELF: {
        code: 'CANNOT_FOLLOW_SELF',
        message: 'Không thể theo dõi chính mình',
        httpStatus: 400,
    },
    CANNOT_DELETE: {
        code: 'CANNOT_DELETE',
        message: 'Không thể xóa',
        httpStatus: 403,
    },
    RATE_LIMIT_EXCEEDED: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Vượt quá giới hạn yêu cầu',
        httpStatus: 429,
    },
};

/**
 * Get response code by code string
 */
function getResponseCode(codeString) {
    return ResponseCode[codeString] || ResponseCode.INTERNAL_ERROR;
}

/**
 * Create custom response code
 */
function createResponseCode(code, message, httpStatus = 400) {
    return { code, message, httpStatus };
}

module.exports = {
    ResponseCode,
    getResponseCode,
    createResponseCode,
};

