const Admin = require('../../models/Admin');
const { comparePassword } = require('../../utils/bcrypt');
const { signJwt } = require('../../utils/jwt');

async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const ok = await comparePassword(password, admin.passwordHash);
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const token = signJwt({ id: admin._id, role: 'admin', username: admin.username });
    res.json({ success: true, data: { token } });
  } catch (err) {
    next(err);
  }
}

module.exports = { login };


