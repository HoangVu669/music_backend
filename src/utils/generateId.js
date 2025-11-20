/**
 * Generate unique random ID for models
 * Học từ e-commerce: sử dụng number ID thay vì string UUID
 */

const generateUniqueRandomId = async (Model, fieldName = "id") => {
  let isUnique = false;
  let randomId;

  while (!isUnique) {
    // Generate random 9-digit number
    randomId = Math.floor(100000000 + Math.random() * 900000000);

    // Check if ID already exists
    const existing = await Model.findOne({ [fieldName]: randomId });
    if (!existing) {
      isUnique = true;
    }
  }

  return randomId;
};

/**
 * Generate activation/verification code
 */
const generateActivationCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

/**
 * Generate unique code with prefix
 * Example: SONG_123456789, USER_987654321
 */
const generateUniqueCode = async (Model, prefix, fieldName = "code") => {
  let isUnique = false;
  let code;

  while (!isUnique) {
    const randomNum = Math.floor(100000000 + Math.random() * 900000000);
    code = `${prefix}_${randomNum}`;

    const existing = await Model.findOne({ [fieldName]: code });
    if (!existing) {
      isUnique = true;
    }
  }

  return code;
};

module.exports = {
  generateUniqueRandomId,
  generateActivationCode,
  generateUniqueCode,
};
