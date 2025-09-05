module.exports = function responseStandardizer() {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    // Helpers
    res.apiSuccess = (message = 'OK', data = null, code = 'SUCCESS') => {
      res.statusCode = 200;
      return originalJson({ success: true, code, message, data });
    };

    res.apiError = (message = 'ERROR', code = 'ERROR', data = null) => {
      res.statusCode = 200;
      return originalJson({ success: false, code, message, data });
    };

    // Override res.json to coerce shape and status=200
    res.json = (body) => {
      try {
        const success = typeof body?.success === 'boolean' ? body.success : true;
        const code = body?.code || (success ? 'SUCCESS' : 'ERROR');
        const message = body?.message || (success ? 'OK' : 'ERROR');
        const data = body && Object.prototype.hasOwnProperty.call(body, 'data')
          ? body.data
          : (success ? body : null);

        res.statusCode = 200;
        return originalJson({ success, code, message, data });
      } catch (e) {
        res.statusCode = 200;
        return originalJson({ success: false, code: 'RESPONSE_FORMAT_ERROR', message: 'Failed to format response', data: null });
      }
    };

    next();
  };
}
