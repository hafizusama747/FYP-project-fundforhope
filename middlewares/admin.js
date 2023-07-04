var {User}= require("../models/user")
function admin(req,res,next){
    
    if(!req.session.user) return res.status(403).send("You are not authorized")
    if(req.session.user.type!="admin") return res.status(403).send("You are not authorized")
    next();   
 }
 module.exports = admin;