var express = require('express');
var router = express.Router();
var {User}= require("../../models/user")
var {Post}= require("../../models/post")
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

//define storage for the images

const storage = multer.diskStorage({

  //destination for files
  destination:function(req, file, callback){
    callback(null,'./public/uploads/blogimages');
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



//manage posts route
router.get('/admin/manageposts',auth,isadmin, function(req, res, next) {

  Post.find().sort({date: 'desc'}).limit(100).exec((err, posts) => {
    if (err) return console.error(err);
    
    let postsCount=0;
    posts.forEach(post => {
      postsCount++;   
    });
    
    res.render('admin/manageposts', {posts: posts,postsCount});
  });
  
});

router.get('/admin/manageposts/edit/:id',auth,isadmin,async function(req, res, next) {
  let post=await Post.findById(req.params.id);
 
    
    res.render('admin/editblogpost', {post: post});

  
});


router.get('/admin/manageposts/delete/:id',auth,isadmin,async function(req, res, next) {
  let post=await Post.findByIdAndDelete(req.params.id);
 
    

    res.redirect("/posts/admin/manageposts")
  
});

router.get('/viewnewspost/:id',async function(req, res, next) {
  let posts=await Post.find();
  let post=await Post.findById(req.params.id);
  let author =post.author;
  let user = await User.findById(author)
 
  let authorName= user.firstname+" "+user.lastname;
  

  

    res.render("newspost",{posts:posts,post:post,authorName})
  
});


//create a blog post route
router.get('/admin/manageposts/createblogpost',auth,isadmin, function(req, res, next) {
  res.render('admin/createblogpost');
});

//post data from news blog post
router.post('/admin/manageposts/createblogpost',multipleUpload,auth,isadmin, async function(req, res, next) {

 // if(req.files){
  //  console.log("files uploaded");
    //console.log(req.files);
    //console.log(req.files.image1);
    //console.log(req.files.image2);
//console.log(req.files.image3);
//
 // }
 
  //console.log(req.body);

  //console.log(req.session)

    post=new Post();


   
    post.title=req.body.title;
    post.description=req.body.description;

    post.image1=req.files['image1'][0]['filename']

    if( req.files['image1'][1]){
      post.image2=req.files['image1'][1]['filename']

    }
    if(req.files['image1'][2]){
      post.image3=req.files['image1'][2]['filename']
    }


    //console.log("length "+req.files.size)

 
    post.type=req.body.postType;
    post.author=req.session.user._id;

    const date = new Date();

    let day = date.getDate();
    let month = date.getMonth() + 1;
    let year = date.getFullYear();

    // This arrangement can be altered based on how we want the date's format to appear.
    let currentDate = `${day}-${month}-${year}`;
    //console.log(currentDate); // "17-6-2022"

    post.date=currentDate;
    await post.save();
  
  res.redirect("/posts/admin/manageposts/createblogpost")
});



//post data from news blog post
router.post('/admin/manageposts/editblogpost/:id',multipleUpload,auth,isadmin, async function(req, res, next) {

  // if(req.files){
   //  console.log("files uploaded");
     //console.log(req.files);
     //console.log(req.files.image1);
     //console.log(req.files.image2);
 //console.log(req.files.image3);
 //
  // }
  
   //console.log(req.body);
 
   //console.log(req.session)
 
   let post=await Post.findOne({_id:req.params.id});
  
 
 
    
     post.title=req.body.title;
     post.description=req.body.description;
 
     post.image1=req.files['image1'][0]['filename']
 
     if( req.files['image1'][1]){
       post.image2=req.files['image1'][1]['filename']
 
     }
     if(req.files['image1'][2]){
       post.image3=req.files['image1'][2]['filename']
     }
 
 
     //console.log("length "+req.files.size)
 
  
     post.type="News post"
     post.author=req.session.user._id;
 
     await post.save();
   
   res.redirect("/posts/admin/manageposts/")
 });

 router.get('/floodnews/:page/:category', async function(req, res, next) {
  const category = req.params.category; // Get the category from the URL
  const page = parseInt(req.params.page) || 1; // Get the current page from the URL parameters or default to 1
  const limit = 10; // Number of posts per page

  try {
    let posts;
    let totalPosts;

    if (category === 'all') {
      totalPosts = await Post.countDocuments();
      posts = await Post.find()
        .skip((page - 1) * limit)
        .limit(limit);
    } else {
      totalPosts = await Post.countDocuments({ type: category });
      posts = await Post.find({ type: category })
        .skip((page - 1) * limit)
        .limit(limit);
    }

    const totalPages = Math.ceil(totalPosts / limit);

    res.render('floodnewsposts', {
      posts,
      category,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});








module.exports = router;
