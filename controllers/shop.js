const Product = require('../models/product');
const Order = require('../models/order');
const fs = require("fs");
const path = require("path");
const stripe = require("stripe")('sk_test_51Lxyk4HxKzt5dDXmkcCzZOp5n336wDCos1aTzMIqfBfL7IQzRBB34QQvXM3CYlg0UJqPWM8yTSjv9G5e3rg4tOQB00x37p2ZfR');
const ITEMS_PER_PAGE = 3;
exports.getProducts = (req, res, next) => {
  const page = req.query.page || 1;
  let totalItems;
  Product.find().countDocuments().then(numProducts => {
    totalItems = +numProducts;
 return Product.find()
    .skip((page - 1) * ITEMS_PER_PAGE)
    .limit(ITEMS_PER_PAGE)
  })
    .then(products => {
      res.render('shop/product-list', {
        prods: products,
        pageTitle: 'products',
        path: '/products',
        currentPage: +page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: +page > 1,
        nextPage: +page + 1,
        previousPage: +page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
      });  
    })
    .catch(err => {
      console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        path: '/products',
        
      });
    })
    .catch(err => {
      console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getIndex = (req, res, next) => {
  const page = req.query.page || 1;
  let totalItems;
  Product.find().countDocuments().then(numProducts => {
    totalItems = +numProducts;
 return Product.find()
    .skip((page - 1) * ITEMS_PER_PAGE)
    .limit(ITEMS_PER_PAGE)
  })
    .then(products => {
      res.render('shop/index', {
        prods: products,
        pageTitle: 'Shop',
        path: '/',
        currentPage: +page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: +page > 1,
        nextPage: +page + 1,
        previousPage: +page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
      });  
    })
    .catch(err => {
      console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items;
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: products,
        
      });
    })
    .catch(err => {
      console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then(product => {
      return req.user.addToCart(product);
    })
    .then(result => {
      console.log(result);
      res.redirect('/cart');
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then(result => {
      res.redirect('/cart');
    })
    .catch(err => {
      console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckout = (req,res,next) => {
  let total = 0;
  let products;
  req.user
  .populate('cart.items.productId')
  .execPopulate()
  .then(user => {
    products = user.cart.items;
    total = 0;
    products.forEach(p => {
      total += p.quantity * p.productId.price;
    })

    return stripe.checkout.sessions.create({
       payment_method_types: ['card'],
      //  payment_method_types: ['{{ PAYMENT_METHOD_TYPE }}'],
       line_items: products.map(p => {
        return {
          price_data: {
            currency: 'usd',
            unit_amount: p.productId.price * 100,
            product_data: {
              name: p.productId.title,
              description: p.productId.description,
              images: ['https://example.com/t-shirt.png'],
            },
          },
          quantity: p.quantity,
        }
       }),
       mode: 'payment',
       success_url: req.protocol + '://' + req.get("host") + "/checkout/success",
       cancel_url: req.protocol + '://' + req.get("host") + "/checkout/cancel",
    })
  })
  .then(session => {
    res.render('shop/checkout', {
      path: '/checkout',
      pageTitle: 'checkout',
      products: products,
      totalSum: total,
      sessionId: session.id
    });
  })
  .catch(err => {
    console.log(err);
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  });
}
exports.postOrder = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items.map(i => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user
        },
        products: products
      });
      return order.save();
    })
    .then(result => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect('/orders');
    })
    .catch(err => {
      console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getOrders = (req, res, next) => {
  
  Order.find({ 'user.userId': req.user._id })
    .then(orders => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders: orders,
      });
    })
    .catch(err => {
      console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getInvoice = (req,res,next) => {
  const orderId = req.params.orderId;
  Order.findById(orderId).then(order => {
    if(!order) {
      return next(new Error("No order found."));
    }
    if(order.user.userId.toString() !== req.user._id.toString()) {
       return next(new Error("unouthorized"));
    }
  })
  .catch(err => next(err))
  console.log(orderId);
  const invoiceName = 'invoice-' + orderId + '.pdf';
  const invoicePath = path.join("data",'invoices',invoiceName);
  fs.readFile(invoicePath,(err,fileContent) => {
    if(err) {
      return next(err);
    }
    res.setHeader("Content-Type", 'application/pdf');
    res.send(fileContent);
  })
  // const file = fs.createReadStream(invoicePath);
  // res.setHeader("Content-Type", 'application/pdf');
  // file.pipe(res);
}
