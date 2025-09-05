const User = require('../../models/User');
const { hashPassword, comparePassword } = require('../../utils/bcrypt');
const { signJwt } = require('../../utils/jwt');

async function register(req, res, next) {
  try {
    const { username, email, password } = req.body;
    const exists = await User.findOne({ $or: [{ username }, { email }] });
    if (exists) return res.status(409).json({ success: false, message: 'User already exists' });
    const passwordHash = await hashPassword(password);
    const user = await User.create({ username, email, passwordHash });
    res.status(201).json({ success: true, data: { id: user._id } });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (user.isLocked) return res.status(403).json({ success: false, message: 'Account locked' });
    const token = signJwt({ id: user._id, role: user.role, username: user.username });
    res.json({ success: true, data: { token } });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { email, password } = req.body;
    const updates = {};
    if (email) updates.email = email;
    if (password) updates.passwordHash = await hashPassword(password);
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true });
    res.json({ success: true, data: { id: user._id, email: user.email } });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, updateProfile };


