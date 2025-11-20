function success(data = null, message = 'success') {
  return { success: true, message, data };
}

function failure(message = 'error', code = 400, details = null) {
  return { success: false, message, code, details };
}

// Alias for failure (for backward compatibility)
function error(message = 'error', code = 400, details = null) {
  return failure(message, code, details);
}

// Main formatResponse function (for backward compatibility)
function formatResponse(success, message, data = null, error = null) {
  if (success) {
    return { success: true, message, data };
  } else {
    return { success: false, message, data, error };
  }
}

// Export as object with methods
const formatResponseObj = {
  success,
  failure,
  error,
  formatResponse // Keep the function for backward compatibility
};

module.exports = formatResponseObj;


