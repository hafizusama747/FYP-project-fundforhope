const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  author: Object,
  createdAt: {
    type: Date,
    default: Date.now
  },
  post:String,
});

const Comment = mongoose.model('Comment', commentSchema);
module.exports.Comment=Comment;

