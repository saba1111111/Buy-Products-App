const path = require('path');
const isAuth = require("../middleware/is-auth");
// import
const {check,body} = require("express-validator/check");
const express = require('express');

const adminController = require('../controllers/admin');

const router = express.Router();




router.get('/add-product', isAuth, adminController.getAddProduct);
// here we can add as many func as we want, node.js will start execuatin these funcs from left to right. and this is awesome
router.get('/products',isAuth, adminController.getProducts);


router.post('/add-product',isAuth,[body('title',"Title Must only be text and numbers and at least 3 character! ").isLength({min: 3}).trim(),body("price",'price is required!').isFloat(),body('description').isLength({min: 5}).trim()], adminController.postAddProduct);

router.get('/edit-product/:productId',isAuth, adminController.getEditProduct);

router.post('/edit-product',isAuth,[body('title',"Title Must only be text and numbers and at least 3 character! ").isLength({min: 3}).trim(),body("price",'').isFloat(),body('description').isLength({min: 5}).trim()], adminController.postEditProduct);

router.delete('/product/:productId',isAuth, adminController.deleteProduct);

module.exports = router;
