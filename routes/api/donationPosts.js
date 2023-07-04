var express = require('express');
var router = express.Router();
var {User}= require("../../models/user")
var {Post}= require("../../models/post")
var {DonationPost}= require("../../models/donationpost")
var {Comment}= require("../../models/comment")


const multer=require('multer');
const path = require('path');
var bcrypt = require('bcryptjs');
require("dotenv").config();
const jwt=require("jsonwebtoken");
const config=require("config");
const { token } = require('morgan');
const auth = require("../../middlewares/auth");
const isadmin = require("../../middlewares/admin");
var bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const checkSessionAuth = require('../../middlewares/checkSessionAuth');

//define storage for the images

const storage = multer.diskStorage({

  //destination for files
  destination:function(req, file, callback){
    callback(null,'./public/uploads/donationimages');
  },


  //add back the extension

  filename:function(req, file, callback){
    callback(null,Date.now()+file.originalname);
  }

});

//multer constructer



//upload paramters
const upload=multer({
  storage:storage,
  limits:{
    fieldSize: 1024*1024*1,
  }
})

var multipleUpload=upload.fields([{name:'image1',maxCount:3}])

//
router.get('/', async function(req, res, next) {
  const posts = await DonationPost.find({ status: 'active' }).populate('comments');

  let newsPosts = await Post.find().lean();

  posts.sort((a, b) => {
    const aAidReceived = a.aidRecieved === 'true';
    const bAidReceived = b.aidRecieved === 'true';

    if (aAidReceived && !bAidReceived) {
      return 1;
    } else if (!aAidReceived && bAidReceived) {
      return -1;
    } else {
      return 0;
    }
  });

  res.render('users/userstories', { posts: posts, newsPosts: newsPosts });
});



//create post
router.get('/createDonationPost',auth,checkSessionAuth, async function(req, res, next) {
  res.render('users/poststory');
  
});

//create post
router.post('/create',multipleUpload,auth,checkSessionAuth, async function(req, res, next) {

 
     post=new DonationPost();

     post.title=req.body.title;
     post.description=req.body.description;
     post.donationMethod=req.body.method;
     post.donationDetails=req.body.details;

     post.contactDetails=req.body.contact;

 
     if( req.files['image1'][0]){
      post.image=req.files['image1'][0]['filename']
 
     } 
  
     post.type="Donation Request"
     post.author=req.session.user;
 
     const date = new Date();
 
     let day = date.getDate();
     let month = date.getMonth() + 1;
     let year = date.getFullYear();
 
     // This arrangement can be altered based on how we want the date's format to appear.
     let currentDate = `${day}-${month}-${year}`;
     //console.log(currentDate); // "17-6-2022"
 
     post.date=currentDate;

     
     await post.save();
   
   res.redirect("/donationposts")
 });

 router.post('/:postId/comments', async function(req, res, next) {

 
  let postId = req.params.postId;
  let post = await DonationPost.findOne({ _id: postId });
  console.log(postId)

  console.log(post)

  try {
    const author=req.session.user;
    const content=req.body.content;
  
    console.log(req.body.content)


    if (!post) {
      return res.status(404).send('Post not found');

    }

    const comment = new Comment({
      author: author,
      content: content,
      post: post._id
    });

    await comment.save();

    post.comments.push(comment);
    await post.save();

    res.redirect("/donationposts");
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }

});


router.post('/:id/like', async (req, res, next) => {
  const postId = req.params.id;
  console.log("clicked")
  try {
    const post = await DonationPost.findById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    post.likesCount++;

    const updatedPost = await post.save();
  } catch (error) {
    console.log("error occured")
    console.log(error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.post('/report/:id', async (req, res, next) => {
  try {
    const donationPost = await DonationPost.findById(req.params.id);

    if (!donationPost) {
      return res.status(404).json({ error: 'Donation post not found' });
    }

    donationPost.reports.push({
      reportTime: new Date(),
      description: req.body.description,
    });
    console.log("desc "+req.body.description)

    await donationPost.save();

    res.redirect("/donationposts"); // Redirect to the "/donationposts" route
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'An error occurred while submitting the report' });
  }
});



module.exports = router;
