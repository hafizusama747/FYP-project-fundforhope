const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  time: {
    type: Date,
    default: Date.now,
  },
  name: {
    type: String,
    required: true,
  },
});

module.exports = new mongoose.model('Donation', donationSchema);
var Donation=mongoose.model("Donation",donationSchema);
module.exports.Donation=Donation;
