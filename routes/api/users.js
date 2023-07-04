var express = require('express');
var router = express.Router();
var {User}= require("../../models/user")
var {Post}= require("../../models/post")
var {Donation}= require("../../models/donation")

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
const axios = require('axios');


//define storage for the images

const storage = multer.diskStorage({

  //destination for files
  destination:function(req, file, callback){
    callback(null,'./public/uploads/images');
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

var multipleUpload=upload.fields([{name:'image',maxCount:1},{name:'cnicimage',maxCount:1}])

function getUserLocation(ipAddress, callback) {

  const apiUrl = `http://api.ipstack.com/${ipAddress}?access_key=53af1a23e6d7a40870e99c98d0383e6`;

  axios
    .get(apiUrl)
    .then(response => {
      const { country_name, region, city, latitude, longitude } = response.data;
      const location = {
        country: country_name,
        region: region,
        city: city,
        latitude: latitude,
        longitude: longitude
      };
      callback(null, location);
    })
    .catch(error => {
      callback(error, null);
    });
}

//register route
router.get('/signup',async function(req, res, next) {
  try {
    const ipResponse = await axios.get('https://api.ipify.org?format=json');
    const ipAddress = ipResponse.data.ip;
    console.log(`Your public IP address is: ${ipAddress}`);

    getUserLocation(ipAddress, (error, location) => {
      if (error) {
        return res.status(500).send('Error retrieving location');
      }
      let country=location.country;
      console.log("Your country : "+country)
      res.render('users/register',{country});


    });
  } catch (error) {
    console.error('Error retrieving IP address:', error);
    res.status(500).send('Error retrieving IP address');
  }
});

//register form post
router.post('/signup',multipleUpload, async function(req, res, next) {

  if(req.files){
    console.log("files uploaded");
    //console.log(req.files);
    console.log(req.files.image);
    console.log(req.files.cnicimage);
    //console.log(req.files.cnicimage.path);

  }

  console.log(req.body);
  let user = await User.findOne({email:req.body.email}) 
  if(user) return res.status(400).send("User with Given Email Already exists")
  //else
  
  if(req.body.password!=req.body.cpassword) return res.status(400).send("Password in both fields must match")
    user=new User();
    user.profileImg=req.files['image'][0]['filename'],
    user.firstname=req.body.firstname;
    user.lastname=req.body.lastname;

    user.email=req.body.email;
    var email=req.body.email;

    user.password=req.body.password;
    let salt=await bcrypt.genSalt(10);
    user.password=await bcrypt.hash(user.password,salt);

    user.contact=req.body.contact;
    user.gender=req.body.gender;
    user.address.street=req.body.streetaddress;
    user.address.city=req.body.city;
    user.address.state=req.body.state;
    user.address.zipcode=req.body.zip;
    user.address.country=req.body.country;

    user.cnic=req.files['cnicimage'][0]['filename'];

    const date = new Date();

    let day = date.getDate();
    let month = date.getMonth() + 1;
    let year = date.getFullYear();

    // This arrangement can be altered based on how we want the date's format to appear.
    let currentDate = `${day}-${month}-${year}`;
    //console.log(currentDate); // "17-6-2022"

    user.createdAt=currentDate;

    // Create jwt token
    const token = jwt.sign(
      { user_id: user._id, email },
      config.get("jwtprivatekey"),
      {
        expiresIn: "2h",
      }
    );
    // save user token
    user.token = token;

    await user.save();


    let mailTransporter = nodemailer.createTransport({
      host: "smtp.mailtrap.io",
      port: 2525,
      auth: {
        user: "04bc7b0bdf96ec",
        pass: "3629d612e9331e"
      }
  });
   
  let mailDetails = {
      from: 'noreply@fundforhope.com',
      to: user.email,
      subject: 'New account registration request',
      text: 'Your account creation request has been recieved please wait while we verify your account \nyour customer id is : '+user._id+'\nContact customer service in case of any assistance'
  };
   
  mailTransporter.sendMail(mailDetails, function(err, data) {
      if(err) {
          console.log('Error Occurs');
          console.log(err)
      } else {
          console.log('Email sent successfully');
      }
  });

  
  res.redirect("/")
});




//login page route
router.get('/login',async function(req, res, next) {
  try {
    const ipResponse = await axios.get('https://api.ipify.org?format=json');
    const ipAddress = ipResponse.data.ip;
    console.log(`Your public IP address is: ${ipAddress}`);

    getUserLocation(ipAddress, (error, location) => {
      if (error) {
        return res.status(500).send('Error retrieving location');
      }

      let country=location.country;
      console.log("Your country : "+country)

      res.render('users/login',{country});
    });
  } catch (error) {
    console.error('Error retrieving IP address:', error);
    res.status(500).send('Error retrieving IP address');
  }
});


//profile page route
router.get('/profile', async function(req, res, next) {
  let user=await User.findOne({_id:req.session.user._id});
  res.render('users/profile',{user:user});
});

//login page form post
router.post('/login', async function(req, res, next) {
  const body = req.body;
  const email=req.body.email;
  let user= await User.findOne({email:req.body.email})
  if(!user) return res.status(400).send("Invalid login details")
  if(user.status=='pending'){
    return res.status(400).send("Your account is not enabled yet! Please wait until we check and enable your account")
  }
  if(user.status=='blocked'){
    return res.status(400).send("Your account has been blocked")
  }
  if (user) {
    // check user password with hashed password stored in the database
    const validPassword = await bcrypt.compare(body.password, user.password);

    if (validPassword) {
      console.log("logged in")
      
       // Create token
       const token = jwt.sign(
        { user_id: user._id, email },
        config.get("jwtprivatekey"),
        {
          expiresIn: "2h",
        }
      );
      console.log("token :"+token);

      // save user token
      //user.token = token;

      req.session.user=user;
      
      let options = {
        path:"/",
        sameSite:true,
        maxAge: 1000 * 60 * 60 * 24, // would expire after 24 hours
        httpOnly: true, // The cookie only accessible by the web server
    }

    res.cookie('x-access-token',token, options)

    } else {
      return res.status(400).send("Invalid Password")
    }
  } else {
    return res.status(400).send("User Does not exists")
  }
 
  //let token=jwt.sign({_id:user.id,name:user.name},config.get("jwtprivatekey"))



  //console.log(user.token)
  //console.log(token)
  
  //console.log(req.session.user)

  if(user.type=="admin")  return res.redirect("/users/admin/dashboard")

  return res.redirect("/users/donationprofile")
});

router.get('/logout', function(req, res, next) {
  req.session.user=null;
  res.redirect("/")
});

router.get('/post-story', function(req, res, next) {
  res.render("users/poststory")
});

router.get('/userstories', function(req, res, next) {
  res.render("users/poststory")
});
const donations = [
  { date: '2023-05-01', amount: 100 },
  { date: '2023-05-02', amount: 150 },
  { date: '2023-05-03', amount: 185 },
  { date: '2023-05-04', amount: 200 },
  { date: '2023-05-05', amount: 210 },
  { date: '2023-05-06', amount: 190 },
  { date: '2023-05-07', amount: 218 },

  { date: '2023-05-08', amount: 170 },
  { date: '2023-05-09', amount: 230 },
  { date: '2023-05-10', amount: 195 },
  { date: '2023-05-11', amount: 220 },
  { date: '2023-05-12', amount: 280 },

  // Add more donation data as needed
];


router.get('/admin/dashboard',auth,isadmin, async function(req, res, next) {
  let users=await User.find();
  let posts=await Post.find();
  const reportedPosts = await DonationPost.find({ reports: { $exists: true, $not: { $size: 0 } } });
  let activeCount=0;
  let pendingCount=0;
  let blockedCount=0;
  let postsCount=0;
  let reportedPostsCount=0;

  posts.forEach(post=>{
    postsCount++;
  })
  reportedPosts.forEach(reportedPost=>{
    reportedPostsCount++;
  })
  users.forEach(user => {
    if(user.status=="active"){
      activeCount++;
    }
    else if(user.status=="blocked"){
      blockedCount++;
    }
    else if(user.status=="pending"){
      pendingCount++;
    }
   
  });
  res.render("admin/dashboard",{users:users,activeCount,blockedCount,pendingCount,postsCount,donations,reportedPostsCount})
});

router.get('/admin/manageusers',auth,isadmin, async function(req, res, next) {
  let users=await User.find();
  let pendingCount=0;
  users.forEach(user => {
    if(user.status=="pending"){
      pendingCount++;
    }
 
   
  });
  res.render("admin/manageusers",{users:users,pendingCount})
});

router.get('/admin/activeusers',auth,isadmin, async function(req, res, next) {
  let users=await User.find();
  let activeCount=0;
  users.forEach(user => {
    if(user.status=="active"){
      activeCount++;
    }
 
   
  });
  res.render("admin/activeusers",{users:users,activeCount})
});

router.get('/admin/blockedusers',auth,isadmin, async function(req, res, next) {
  let users=await User.find();
  let blockedCount=0;
  users.forEach(user => {
    if(user.status=="blocked"){
      blockedCount++;
    }
 
   
  });
  res.render("admin/blockedusers",{users:users,blockedCount})
});




router.get('/admin/manageusers/enable/:id',auth,isadmin, async function(req, res, next) {
  
  let user=await User.findOne({_id:req.params.id});
  let posts=await DonationPost.find();

  posts.forEach(async post => {
    if(post.author._id==user._id){
      post.status='active'
      await post.save();

   }
  });
  user.status="active";
  await user.save();
  let mailTransporter = nodemailer.createTransport({
    host: "smtp.mailtrap.io",
    port: 2525,
    auth: {
      user: "04bc7b0bdf96ec",
        pass: "3629d612e9331e"
    }
});
 
let mailDetails = {
    from: 'noreply@fundforhope.com',
    to: user.email,
    subject: 'Account verified',
    text: 'Your account has been verified\nYou may login to the platform now'
};
 
mailTransporter.sendMail(mailDetails, function(err, data) {
    if(err) {
        console.log('Error Occurs');
        console.log(err)
    } else {
        console.log('Email sent successfully');
    }
});
  res.redirect("/users/admin/dashboard")
});


router.get('/admin/manageusers/disable/:id',auth,isadmin, async function(req, res, next) {
  let user=await User.findOne({_id:req.params.id});
  
  user.status='blocked';

  let posts=await DonationPost.find();

  posts.forEach(async post => {
   

    if(post.author._id==user._id){
   
       post.status='suspended'
       await post.save();

    }
  });
  await user.save();
  let mailTransporter = nodemailer.createTransport({
    host: "smtp.mailtrap.io",
    port: 2525,
    auth: {
      user: "04bc7b0bdf96ec",
        pass: "3629d612e9331e"
    }
});
 
let mailDetails = {
    from: 'noreply@fundforhope.com',
    to: user.email,
    subject: 'Account disbaled',
    text: 'Your account has been disabled \nyour customer id is : '+user._id+'\nContact customer service in case of any assistance'
};
 
mailTransporter.sendMail(mailDetails, function(err, data) {
    if(err) {
        console.log('Error Occurs');
        console.log(err)
    } else {
        console.log('Email sent successfully');
    }
});
  res.redirect("/users/admin/dashboard")
});


router.get('/admin/manageusers/delete/:id',auth,isadmin, async function(req, res, next) {
  let user1=await User.findById(req.params.id);

  let posts=await DonationPost.find();

  posts.forEach(async post => {
   

    if(post.author._id==user1._id){
   
       let dp = await DonationPost.findByIdAndDelete(post._id);

    }
  });

  let user=await User.findByIdAndDelete(req.params.id);

  let mailTransporter = nodemailer.createTransport({
    host: "smtp.mailtrap.io",
    port: 2525,
    auth: {
      user: "04bc7b0bdf96ec",
      pass: "3629d612e9331e"
    }
});
 
let mailDetails = {
    from: 'noreply@fundforhope.com',
    to: user.email,
    subject: 'Account deleted',
    text: 'Your account has been deleted'
};
 
mailTransporter.sendMail(mailDetails, function(err, data) {
    if(err) {
        console.log('Error Occurs');
        console.log(err)
    } else {
        console.log('Email sent successfully');
    }
});
  res.redirect("/users/admin/dashboard")
});


router.get('/admin/manageusers/adminrights/:id',auth,isadmin, async function(req, res, next) {
  let user=await User.findOne({_id:req.params.id});
  if(user.type=="admin"){
    user.type="User";
    await user.save();
  }
  else{
    user.type="admin";
    await user.save();
  }
 
  res.redirect("/users/admin/dashboard")
});






//post data for edit profile
router.post('/profile/change',multipleUpload, async function(req, res, next) {

  if(req.files){
    console.log("files uploaded");
    //console.log(req.files);
    console.log(req.files.image);
    console.log(req.files.cnicimage);
    //console.log(req.files.cnicimage.path);

  }

  
  console.log("hit")

  console.log(req.body);
  let user = await User.findOne({email:req.body.email}) 
  if(!user) return res.status(400).send("Invalid Email")
  const validPassword = await bcrypt.compare(req.body.opassword, user.password);
  if(!validPassword) return res.status(400).send("Your old password did not match")
  //else
  
  if(req.body.password!=req.body.cpassword) return res.status(400).send("Password in both fields must match")
    
    user.profileImg=req.files['image'][0]['filename'],
    user.firstname=req.body.firstname;
    user.lastname=req.body.lastname;

    user.email=req.body.email;
    var email=req.body.email;

    user.password=req.body.password;
    let salt=await bcrypt.genSalt(10);
    user.password=await bcrypt.hash(user.password,salt);

    user.contact=req.body.contact;
    user.address.street=req.body.streetaddress;
    user.address.city=req.body.city;
    user.address.state=req.body.state;
    user.address.zipcode=req.body.zip;
    user.address.country=req.body.country;

    // Create jwt token
    const token = jwt.sign(
      { user_id: user._id, email },
      config.get("jwtprivatekey"),
      {
        expiresIn: "2h",
      }
    );
    // save user token
    user.token = token;

    await user.save();


    let mailTransporter = nodemailer.createTransport({
      host: "smtp.mailtrap.io",
      port: 2525,
      auth: {
        user: "04bc7b0bdf96ec",
        pass: "3629d612e9331e"
      }
  });
   
  let mailDetails = {
      from: 'noreply@fundforhope.com',
      to: user.email,
      subject: 'Account information changed',
      text: 'Some of the information of your account was changed if you did not this contact customer service ASAP \nyour customer id is : '+user._id+''
  };
   
  mailTransporter.sendMail(mailDetails, function(err, data) {
      if(err) {
          console.log('Error Occurs');
          console.log(err)
      } else {
          console.log('Email sent successfully');
      }
  });

  
  res.redirect("/users/profile")
});


router.get('/donationprofile', async function(req, res, next) {

  let user=await User.findById(req.session.user._id);
  const authorId = user._id;
  

  let posts=await DonationPost.find();

  const authorPosts = posts.filter(post => post.author._id == authorId);
 
   await DonationPost.populate(authorPosts, { path: 'comments' });


console.log(authorPosts)

  res.render('users/donationprofile',{authorPosts:authorPosts});
  
});



router.get('/admin/reports/',auth,isadmin, async function(req, res, next) {
  try {
    const posts = await DonationPost.find({ reports: { $exists: true, $not: { $size: 0 } } });

    res.render('admin/reports', { posts });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/admin/reports/view/:id', auth, isadmin, async function(req, res, next) {
  try {
    const post = await DonationPost.findById(req.params.id);
    await DonationPost.populate(post, { path: 'comments' });

    res.render('admin/viewreportpost', { post: post });
  } catch (error) {
    
    next(error);
  }
});

router.get('/admin/reports/delete/:id', auth, isadmin, async function(req, res, next) {
  try {
    await DonationPost.findByIdAndDelete(req.params.id);

    res.redirect("/users/admin/reports")
  } catch (error) {
    
    next(error);
  }
});

router.get('/admin/reports/action/:id', auth, isadmin, async function(req, res, next) {
  try {
    const post= await DonationPost.findById(req.params.id)

    let status = post.status;

    if(status=="active"){
      post.status="suspended";
      await post.save();
    }
    else{
      post.status="active";
      await post.save()
    }

    res.redirect("/users/admin/reports")
  } catch (error) {
    
    next(error);
  }
});


router.get('/admin/manageusers/confirmdonation/:id', auth, isadmin, async function(req, res, next) {
  try {
  const post = await  DonationPost.find({ "author._id": req.params.id })

  if(post){
    post.forEach(async (post) => {
      post.aidRecieved = "true";
      await post.save();
    });
    
   
  }

    res.redirect("/users/admin/dashboard")
  } catch (error) {
    
    next(error);
  }
});

router.get('/admin/donations',async (req, res) => {
  const donations = await Donation.find()
  res.render('admin/donations', { donations });
});


module.exports = router;
