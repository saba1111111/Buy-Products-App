module.exports = (req,res,next) => {
    if(!req.session.isLoggedIn) {
        return res.redirect("/login");
    }
    next();
}

// this mdlweare is created because when user are not log in, he still can acces admin domains, such as add-product page or others
// in the situation we need to write this check in many places,So we create reusable midlware