function success(data = null, message = 'success') {
  return { success: true, message, data };
}

function failure(message = 'error', code = 400, details = null) {
  return { success: false, message, code, details };
}

module.exports = { success, failure };


