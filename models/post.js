var mongoose = require("mongoose");
const Comment = require('../models/comment');
var postSchema=mongoose.Schema({
    title: String,
    description: String,
    author: String,
    type:String,
    
    isFeatured: { type: String, default: "false" },

    //images: [{
   //     type: String
    //}],
    image1:String,
    image2:String,
    image3:String,

    date:String,

    postedAt: { type: Date, default: Date.now },
    
 
})

module.exports = new mongoose.model('Post', postSchema);
var Post=mongoose.model("Post",postSchema);

module.exports.Post=Post;