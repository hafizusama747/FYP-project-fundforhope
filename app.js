var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mongoose = require('mongoose');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/api/users');
var postsRouter = require('./routes/api/posts');
var donationPostsRouter = require('./routes/api/donationPosts');


var session = require('express-session');
var sessionAuth=require('./middlewares/sessionAuth.js');
var app = express();

app.use(session({
  secret:'dummytext',
  resave:false,
  saveUninitialized:true,
  //cookie:{maxAge:600000}
}))


// view engine setup


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(sessionAuth)
app.use(express.static(__dirname + '/public'));


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
//app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/posts', postsRouter);
app.use('/donationposts', donationPostsRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

mongoose.set('strictQuery', true);
mongoose.connect("mongodb://127.0.0.1:27017/fundforhope",
{useNewUrlParser:true}).then(()=>console.log("Connected to mongodb..."))
.catch((error)=>console.log(error.message));

module.exports = app;
