const User = require('../../models/User');
const { hashPassword } = require('../../utils/bcrypt');

async function listUsers(req, res, next) {
  try {
    const users = await User.find();
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
}

async function createUser(req, res, next) {
  try {
    const { username, email, password, role } = req.body;
    const passwordHash = await hashPassword(password || '123456');
    const user = await User.create({ username, email, passwordHash, role: role || 'user' });
    res.status(201).json({ success: true, data: user });
  } catch (err) { next(err); }
}

async function getUserById(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}

async function updateUserById(req, res, next) {
  try {
    const { email, role } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { email, role }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}

async function deleteUserById(req, res, next) {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
}

async function lockUser(req, res, next) {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isLocked: true }, { new: true });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}

async function unlockUser(req, res, next) {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isLocked: false }, { new: true });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}

async function resetPassword(req, res, next) {
  try {
    const passwordHash = await hashPassword('123456');
    const user = await User.findByIdAndUpdate(req.params.id, { passwordHash }, { new: true });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}

module.exports = {
  listUsers,
  createUser,
  getUserById,
  updateUserById,
  deleteUserById,
  lockUser,
  unlockUser,
  resetPassword,
};


