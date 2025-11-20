function errorMiddleware(err, req, res, next) {
  console.error('Error:', err);
  
  // Handle MongoDB errors
  if (err.name === 'MongoServerError' || err.name === 'MongoError') {
    // Duplicate key error
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      return res.status(409).json({
        success: false,
        message: `${field} already exists`,
        code: 409
      });
    }
    
    // Language override error
    if (err.message && err.message.includes('language override unsupported')) {
      return res.status(500).json({
        success: false,
        message: 'Database index error. Please contact administrator.',
        code: 500,
        hint: 'Text index configuration issue. Run sync-indexes script.'
      });
    }
    
    // Other MongoDB errors
    return res.status(500).json({
      success: false,
      message: err.message || 'Database error',
      code: 500
    });
  }
  
  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join(', '),
      code: 400
    });
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      code: 401
    });
  }
  
  // Default error handling
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Log full error for debugging
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error stack:', err.stack);
  }
  
  res.status(status).json({ 
    success: false, 
    message,
    code: status,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
}

module.exports = { errorMiddleware };


