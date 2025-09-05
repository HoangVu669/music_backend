const jwt = require('jsonwebtoken');
const { accessTokenSecret, accessTokenTtl } = require('../config/jwt');

function signJwt(payload) {
  return jwt.sign(payload, accessTokenSecret, { expiresIn: accessTokenTtl });
}

function verifyJwt(token) {
  try {
    return jwt.verify(token, accessTokenSecret);
  } catch (err) {
    return null;
  }
}

module.exports = { signJwt, verifyJwt };


