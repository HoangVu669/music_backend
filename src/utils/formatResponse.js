function success(data = null, message = 'success') {
  return { success: true, message, data };
}

function failure(message = 'error', code = 400, details = null) {
  return { success: false, message, code, details };
}

// Main formatResponse function
function formatResponse(success, message, data = null, error = null) {
  if (success) {
    return { success: true, message, data };
  } else {
    return { success: false, message, data, error };
  }
}

module.exports = { success, failure, formatResponse };


