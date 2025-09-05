const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    songId: { type: String, required: true }, // zing song id
    content: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Comment', CommentSchema);


