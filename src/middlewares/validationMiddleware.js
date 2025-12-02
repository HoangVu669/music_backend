const { failure, getHttpStatus, ResponseCode } = require('../utils/formatResponse');

/**
 * Validation Middleware - Microservice Architecture
 * Centralized validation with standardized error responses
 */

/**
 * Validate required fields
 */
function validateRequired(fields) {
    return (req, res, next) => {
        const missingFields = [];

        for (const field of fields) {
            const value = req.body[field] || req.query[field] || req.params[field];
            if (value === undefined || value === null || value === '') {
                missingFields.push(field);
            }
        }

        if (missingFields.length > 0) {
            return res.status(getHttpStatus('MISSING_REQUIRED_FIELD')).json(
                failure('MISSING_REQUIRED_FIELD', `Thiếu các trường bắt buộc: ${missingFields.join(', ')}`)
            );
        }

        next();
    };
}

/**
 * Validate email format
 */
function validateEmail(field = 'email') {
    return (req, res, next) => {
        const email = req.body[field] || req.query[field];

        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(getHttpStatus('INVALID_EMAIL')).json(
                    failure('INVALID_EMAIL', 'Email không hợp lệ')
                );
            }
        }

        next();
    };
}

/**
 * Validate username format
 */
function validateUsername(field = 'username', minLength = 3, maxLength = 20) {
    return (req, res, next) => {
        const username = req.body[field] || req.query[field];

        if (username) {
            const usernameRegex = /^[a-zA-Z0-9_]+$/;

            if (username.length < minLength || username.length > maxLength) {
                return res.status(getHttpStatus('INVALID_USERNAME')).json(
                    failure('INVALID_USERNAME', `Tên người dùng phải có từ ${minLength} đến ${maxLength} ký tự`)
                );
            }

            if (!usernameRegex.test(username)) {
                return res.status(getHttpStatus('INVALID_USERNAME')).json(
                    failure('INVALID_USERNAME', 'Tên người dùng chỉ được chứa chữ cái, số và dấu gạch dưới')
                );
            }
        }

        next();
    };
}

/**
 * Validate password strength
 */
function validatePassword(field = 'password', minLength = 6) {
    return (req, res, next) => {
        const password = req.body[field];

        if (password) {
            if (password.length < minLength) {
                return res.status(getHttpStatus('PASSWORD_TOO_SHORT')).json(
                    failure('PASSWORD_TOO_SHORT', `Mật khẩu phải có ít nhất ${minLength} ký tự`)
                );
            }
        }

        next();
    };
}

/**
 * Validate ObjectId format (MongoDB)
 */
function validateObjectId(field, paramName = 'id') {
    return (req, res, next) => {
        const value = req.params[paramName] || req.body[field] || req.query[field];

        if (value) {
            const objectIdRegex = /^[0-9a-fA-F]{24}$/;
            if (!objectIdRegex.test(value)) {
                return res.status(getHttpStatus('INVALID_INPUT')).json(
                    failure('INVALID_INPUT', `${paramName} không hợp lệ`)
                );
            }
        }

        next();
    };
}

/**
 * Validate pagination parameters
 */
function validatePagination() {
    return (req, res, next) => {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        if (page < 1) {
            return res.status(getHttpStatus('VALIDATION_ERROR')).json(
                failure('VALIDATION_ERROR', 'Số trang phải lớn hơn 0')
            );
        }

        if (limit < 1 || limit > 100) {
            return res.status(getHttpStatus('VALIDATION_ERROR')).json(
                failure('VALIDATION_ERROR', 'Giới hạn phải từ 1 đến 100')
            );
        }

        // Attach validated pagination to request
        req.pagination = { page, limit, skip: (page - 1) * limit };
        next();
    };
}

/**
 * Validate enum value
 */
function validateEnum(field, allowedValues, fieldName = field) {
    return (req, res, next) => {
        const value = req.body[field] || req.query[field];

        if (value && !allowedValues.includes(value)) {
            return res.status(getHttpStatus('VALIDATION_ERROR')).json(
                failure('VALIDATION_ERROR', `${fieldName} phải là một trong các giá trị: ${allowedValues.join(', ')}`)
            );
        }

        next();
    };
}

/**
 * Validate string length
 */
function validateLength(field, minLength, maxLength, fieldName = field) {
    return (req, res, next) => {
        const value = req.body[field] || req.query[field];

        if (value !== undefined && value !== null) {
            const length = String(value).length;
            if (length < minLength || length > maxLength) {
                return res.status(getHttpStatus('VALIDATION_ERROR')).json(
                    failure('VALIDATION_ERROR', `${fieldName} phải có từ ${minLength} đến ${maxLength} ký tự`)
                );
            }
        }

        next();
    };
}

/**
 * Validate number range
 */
function validateNumberRange(field, min, max, fieldName = field) {
    return (req, res, next) => {
        const value = req.body[field] || req.query[field];

        if (value !== undefined && value !== null) {
            const num = Number(value);
            if (isNaN(num) || num < min || num > max) {
                return res.status(getHttpStatus('VALIDATION_ERROR')).json(
                    failure('VALIDATION_ERROR', `${fieldName} phải là số từ ${min} đến ${max}`)
                );
            }
        }

        next();
    };
}

module.exports = {
    validateRequired,
    validateEmail,
    validateUsername,
    validatePassword,
    validateObjectId,
    validatePagination,
    validateEnum,
    validateLength,
    validateNumberRange,
};

