var mongoose = require("mongoose");

var userSchema=mongoose.Schema({
    firstname: String,
    lastname: String,
    email: String,
    password:String,
    contact:String,
    gender:String,
    profileImg:
    {
        type:String,
        default:'placeholer.png',
    },
    type:{
        type:String,
        default:'User',
    },
    status:{
        type:String,
        default:'pending',
    },
    address: {     
        street: String,
        city: String,
        state: String,
        zipcode: String,
        country: String
    },
    cnic:
    {
        type:String,
        default:'placeholer.png',
    },
    createdAt:String,
    token: { type: String },
})

module.exports = new mongoose.model('User', userSchema);
var User=mongoose.model("User",userSchema);

module.exports.User=User;