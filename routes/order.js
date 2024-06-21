const express = require('express');
const { isLogin, isAdmin } = require('../routes/setting');
const router = express.Router();
const Product = require('../models/Product');
const Address = require('../models/Address');
const Order = require('../models/Order');

const getOrderData = async (req, res, next) => {
    try {
        if (req.session.cart && req.session.cart.items.length > 0) {
            const cartItems = req.session.cart.items;
            const orderItems = await Promise.all(cartItems.map(async item => {
                const product = await Product.findById(item.productId).populate('category');
                const selectedSize = product.sizes.find(size => size.size === item.size);
                return { product, quantity: item.quantity, price: selectedSize.price, size: item.size };
            }));

            let shippingCost = 0;
            orderItems.forEach(item => {
                if (item.product.category.categoryName === 'ต้นองุ่น') {
                    shippingCost += Math.ceil(item.quantity / 3) * 150;
                } else {
                    shippingCost += item.quantity * 70;
                }
            });

            const subTotal = orderItems.reduce((total, item) => total + item.price * item.quantity, 0);
            const totalCost = subTotal + shippingCost;

            const address = await Address.findOne({ user: req.user._id });

            res.locals.orderItems = orderItems;
            res.locals.shippingCost = shippingCost;
            res.locals.subTotal = subTotal;
            res.locals.totalCost = totalCost;
            res.locals.cartItems = cartItems;
            res.locals.address = address;
        }
        next();
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

router.post('/', getOrderData, async (req, res) => {
    const { cartItems } = req.body;
    req.session.cart = { items: cartItems };
    await req.session.save();
    res.redirect('/order');
});

router.get('/', getOrderData, isLogin, (req, res) => {
    if (!res.locals.cartItems || res.locals.cartItems.length === 0) {
        return res.redirect('/cart');
    }
    res.render('order/confirmpage', { req: req });
});


// Place Order
router.post('/place-order', getOrderData, isLogin, async (req, res) => {
    if (!res.locals.orderItems || !res.locals.orderItems.length) {
        console.log('orderItems is undefined or empty');
        req.flash('error', 'ไม่มีสินค้าในคำสั่งซื้อ');
        return res.redirect('/order');
    }

    // Save order to database
    const order = new Order({
        user: req.user._id, // Assuming user is authenticated
        items: res.locals.orderItems.map(item => ({ product: item.product._id, quantity: item.quantity, size: item.size })),
        subTotal: res.locals.subTotal,
        totalCost: res.locals.totalCost,
        shippingAddress: res.locals.address,
        ShippingFee: res.locals.shippingCost
    });
    await order.save();

    // Clear cart from session or database
    req.session.cart = { items: [] };
    
    req.flash('success', 'สั่งซื้อเรียบร้อย สามารถเข้าไปดูประวัติการสั่งซื้อได้ที่โปรไฟล์');
    res.redirect(`/${order._id}`);
});

router.get('/history', isLogin, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id }).populate('items.product').exec();
        res.render('order/history', { orders });
    } catch (error) {
        console.error(error);
        req.flash('error', 'เกิดข้อผิดพลาดในการดึงประวัติการสั่งซื้อ');
        res.redirect('/');
    }
});

router.get('/:orderId', isLogin, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId).populate('items.product').populate('user').exec();
        if (!order) {
            req.flash('error', 'ไม่พบคำสั่งซื้อ');
            return res.redirect('/');
        }
        res.render('order/payment');
    } catch (error) {
        console.error(error);
        req.flash('error', 'เกิดข้อผิดพลาดในการดึงข้อมูลคำสั่งซื้อ');
        res.redirect('/order');
    }
});

module.exports = router;
