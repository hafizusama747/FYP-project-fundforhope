function checkSessionAuth(req,res,next){
   if(req.session.user) next();
   else return res.redirect("http://localhost:3000/users/login");
    
}
module.exports = checkSessionAuth;