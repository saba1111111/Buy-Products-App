const Product = require('../models/product');
const sendingEmails = require("../util/sendingEmails");
const {validationResult} = require("express-validator/check");
const deleteFile = require("../util/file");
exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    hasError: false,
    errorMesage: null,
    validationStyles: []
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const image = req.file;
  // here in file store file info
  console.log(image);
  const price = req.body.price;
  const description = req.body.description;
  if(!image) {
    return  res.render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      product: {
        title: title,
        price: price,
        description: description,
      },
      hasError: true,
      errorMesage: 'Attached file is not an image!',
      validationStyles: []
    });
  }
  // image validation
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    const validationStyles = errors.array().map(a => a.param);
    console.log(errors.array());
  return  res.render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      product: {
        title: title,
        price: price,
        description: description,
      },
      hasError: true,
      errorMesage: errors.array()[0].msg,
      validationStyles: validationStyles
    });
  }
  const imageUrl = image.path;
  // store image path
  const product = new Product({
    title: title,
    price: price,
    description: description,
     imageUrl: imageUrl,
    userId: req.user
  });
  product
    .save()
    .then(result => {
      // console.log(result);
      console.log('Created Product');
      res.redirect('/admin/products');
    })
    .catch(err => {
      console.log(err);
      // const error = new Error(err);
      // error.httpStatusCode = 500;
      // return next(error);
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      if (!product) {
        return res.redirect('/');
      }
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        product: product,
        hasError: false,
        errorMesage: null,
        validationStyles: []
      });
    })
    .catch(err => res.redirect("/500"));
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    console.log(errors.array());
    const validationStyles = errors.array().map(a => a.param);
  return  res.render('admin/edit-product', {
    pageTitle: 'Edit Product',
    path: '/admin/edit-product',
    editing: true,
    product: {
      title: updatedTitle,
      price: updatedPrice,
      description: updatedDesc,
      // imageUrl: updatedImageUrl,
      _id: prodId
    },
    hasError: true,
    errorMesage: errors.array()[0].msg,
    validationStyles: validationStyles
  });
  }
  Product.findById(prodId)
    .then(product => {
      if(product.userId.toString() !== req.user._id.toString()) {
        return res.redirect("/");
      }
      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;
      if(image) {
        deleteFile.deleteFile(product.imageUrl);
        product.imageUrl = image.path;
      }
      return product.save()
      .then(result => {
        console.log('UPDATED PRODUCT!');
        res.redirect('/admin/products');
      })
    })
    .catch(err => {
      console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProducts = (req, res, next) => {
  Product.find({userId: req.user._id})
    // .select('title price -_id')
    // .populate('userId', 'name')
    .then(products => {
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products',
        
      });
    })
    .catch(err => {
      console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;
    Product.findById(prodId).then(product => {
      if(!prodId) {
        return next(new Error('Product not found!'));
      }
      deleteFile.deleteFile(product.imageUrl);
      return Product.deleteOne({_id: prodId,userId: req.user._id});
    })
    .then(() => {
      console.log('DESTROYED PRODUCT');
     res.status(200).json({message: "Success!"})
    })
    .catch(err => {
      res.status(200).json({message: "Failed!"})
    });
};
