module.exports = {
  accessTokenSecret: process.env.JWT_SECRET || 'dev_secret_change_me',
  accessTokenTtl: process.env.JWT_TTL || '7d',
};


