const sendingEmails = require("../util/sendingEmails");
const bcrypt = require("bcryptjs");
const User = require("../models/user");
const crypto = require("crypto");
const {validationResult} = require("express-validator/check");
exports.loginPostMethod = (req,res,next) => {
    const email = req.body.email;
    const password = req.body.password;
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        const validationStyles = errors.array().map(a => a.param);
        console.log(errors.array());
        return  res.status(422).render("auth/login",{pageTitle: "login page",path: "/login",errorMesage: errors.array()[0].msg,values: {email: email,password: password},validationStyles: validationStyles});
    }
    User.findOne({email: email})
    .then(user => {
        if(!user) {
            return  res.status(422).render("auth/login",{pageTitle: "login page",path: "/login",errorMesage: 'Invalid email adress!',values: {email: email,password: password},validationStyles: ['email']});
        }
        bcrypt.compare(password,user.password)
        .then((result) => {
          if(result) {
            req.session.user = user;
            req.session.isLoggedIn = true;
           return req.session.save(() => res.redirect("/"));
          }
          return  res.status(422).render("auth/login",{pageTitle: "login page",path: "/login",errorMesage: 'Invalid password!',values: {email: email,password: password},validationStyles: ['password']});
        })
        .catch(err => {console.log(err);  res.redirect("/login");});
    })
    .catch(err => {
        console.log(err);
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
}
exports.loginGetMethod = (req,res,next) => {   
    res.render("auth/login",{pageTitle: "login page",path: "/login",errorMesage: req.flash('error'),values: {email: '',password: ''},validationStyles: []});
}
exports.logoutMethod = (req,res,next) => {
    req.session.destroy((err) => {
        if(err) {
            console.log(err);
        }
        res.redirect("/");
    });
}
exports.signUpMetthod = (req,res,next) => {
    res.render('auth/signup',{pageTitle: "sign up page",path: "/signUp",errorMesage: req.flash('error'),values: {email: '', password: '',confirmPassword: ''},validationStyles: []});
    // use flash
}
exports.signUpPostMetthod = (req,res,next) => {
    const email = req.body.email;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;
    const erros = validationResult(req);
   
    if(!erros.isEmpty()) {
        const validationStyles = erros.array().map(a => a.param);
      return res.status(422).render('auth/signup',{pageTitle: "sign up page",path: "/signUp",errorMesage: erros.array()[0].msg,values: {email: email, password: password,confirmPassword: confirmPassword},validationStyles: validationStyles});
    }
     bcrypt.hash(password,12)
     .then((hashedPasword) => {
        const newUser = new User({
            email: email,
            password: hashedPasword,
            cart: {items: []}
           })
          return newUser.save();
     })
    .then(() => {
        res.redirect("/login");
        sendingEmails(email,"sign Up succesfully","<p>You succesfully signed up!</p>");
    })
    .catch(err => {
        console.log(err);
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
    
}

exports.passwordResetGetMethod = (req,res,next) => {
    res.render("auth/reset",{pageTitle: "sign up page",path: "/reset",errorMesage: req.flash('error')});
}
exports.passwordResetPostMethod = (req,res,next) => {
    const email = req.body.email;
    // this will create 32 bytes random unique value
    // a byte is a unit of data
    crypto.randomBytes(32,(error,buffer) => {
        if(error) {
            console.log(error);
           res.redirect("/reset");
            return;
        }
        const token = buffer.toString("hex");
        // the hex we need to conver value to normal caracters
         User.findOne({email: email})
        .then((user) => {
           if(!user) {
            req.flash("error","No such email adress!");
           return res.redirect("/passwordReset");
         }
         user.resetToken = token;
         user.resetTokenExpiration = Date.now() + 3600000;
        //  this are in mili seconds and 3600000 is one hour
        return user.save();
       })
       .then(() => {
        res.redirect("/");
        sendingEmails(email,"Reset pasword!",`<p>Click this <a href="http://localhost:3000/passwordReset/${token}" target="_blank">to set a new password!</a></p>`)
       })
       .catch(err => {
        console.log(err);
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
    })
}

exports.getNewPassword = (req,res,next) => {
    const token = req.params.token;
    // {$gt: Date.now()} = gt means greater than, anu is erti saati rac eqpireDate-ia, imas ar unda gadaacilos magas vamowmebt
    User.findOne({resetToken: token,resetTokenExpiration: {$gt: Date.now()}})
    .then((user) => {
        res.render("auth/new-password",{pageTitle: "New password page",path: "/new-password",userId: user._id.toString(),token: token,errorMesage: req.flash('error')});
        // send also userId to update the pasword after
        // add in ejs, hidden input with value and name userId
    })
    .catch(err => {
        console.log(err);
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
    
}

exports.postNewPassword = (req,res,next) => {
    const userId = req.body.userId;
    const userPasword = req.body.password;
    const token = req.body.token;
    User.findOne({_id: userId,resetToken: token,resetTokenExpiration: {$gt: Date.now()}})
    .then(user => {
     if(!user) {
        req.flash("error","Error! Somthing is wrong!")
        return  res.redirect(`/passwordReset/${token}`);
     }
     bcrypt.hash(userPasword,12)
     .then(hashedPassword => {
        user.resetToken = undefined;
        user.resetTokenExpiration = undefined;
        user.password = hashedPassword;
        return user.save();
     })
     .then(() => res.redirect("/login"))
     .catch(err => console.log(err))
    })
    .catch(err => {
        console.log(err);
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
}

