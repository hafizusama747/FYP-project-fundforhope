var mongoose = require("mongoose");

var donationPostSchema = mongoose.Schema({
  title: String,
  description: String,
  author: Object,
  type: String,
  donationMethod: String,
  donationDetails: String,
  contactDetails: String,
  status: { type: String, default: "active" },
  image: String,
  aidRecieved : { type: String, default: "false" },
  likesCount: {
    type: Number,
    integer: true,
    default: 0,
  },
  shares: {
    type: Number,
    integer: true,
    default: 0,
  },
  postedAt: { type: Date, default: Date.now },
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  reports: [{
    reportTime: { type: Date, default: Date.now },
    description: String,
  }],
});

module.exports = new mongoose.model('DonationPost', donationPostSchema);
var DonationPost=mongoose.model("DonationPost",donationPostSchema);
module.exports.DonationPost=DonationPost;