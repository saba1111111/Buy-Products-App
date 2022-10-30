const express = require("express");
const loginFuncs = require("../controllers/auth");
const isAuth = require("../middleware/is-auth");
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const {check,body} = require("express-validator/check");
// async validation, 
const router = express.Router();

router.post("/login",[body("email").isEmail().withMessage("Invalid email adress!").normalizeEmail(),body("password","pasword must be only contains numbers and text and at least 5 characters.").isLength({min: 5}).isAlphanumeric().trim()],loginFuncs.loginPostMethod);
router.get("/login",loginFuncs.loginGetMethod);
router.post("/logout",loginFuncs.logoutMethod);
router.get("/signUp",loginFuncs.signUpMetthod);
router.post("/signUp",
    [check("email").isEmail().withMessage("please enter valid email!").custom((value, {req}) => {
       return User.findOne({email: value})
        .then((userDoc) => {
           if(userDoc) {
            return Promise.reject("Email exist already, please pick a different one!");
           }
        })        
    }).normalizeEmail(),
     body('password','password must be only contains numbers and text and at least 5 characters.').isLength({min: 5}).isAlphanumeric().trim(),
     body('confirmPassword').custom((value,{req}) => {
        if(value !== req.body.password) {
            throw new Error("Passwords have to match!");
        }
        return true;
     }).trim()]
,loginFuncs.signUpPostMetthod);

router.get("/passwordReset",loginFuncs.passwordResetGetMethod);
router.post("/passwordReset",loginFuncs.passwordResetPostMethod);
router.get("/passwordReset/:token",loginFuncs.getNewPassword);
router.post("/new-password",loginFuncs.postNewPassword);
module.exports = router;