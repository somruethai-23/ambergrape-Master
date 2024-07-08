const express = require('express');
const { isLogin, isAdmin } = require('../routes/setting');
const router = express.Router();
const Product = require('../models/Product');
const Address = require('../models/Address');
const Order = require('../models/Order');
const Cart = require('../models/Cart');

// ยืนยันการสั่งซื้อ
router.post('/place-order', isLogin, async (req, res) => {
    const user = req.user._id;
    const shippingAddress = await Address.findOne({ user });
    const cart = await Cart.findOne({ user }).populate({
        path: 'items.productId',
        populate: { path: 'category' }
    });

    if (!cart || cart.items.length === 0) {
        return res.status(400).json({ message: 'Your cart is empty.' });
    }
    const { totalCost, shippingCost } = req.body;

    const order = new Order({
        user: user,
        items: cart.items.map(item => {
            const productSize = item.size;
            const productPrice = item.price; 
            return {
                product: item.productId._id,
                size: productSize,
                price: productPrice,
                quantity: item.quantity
            };
        }),
        totalCost: totalCost,
        shippingAddress: shippingAddress ,
        shippingCost: shippingCost,
    });
    await order.save();

    console.log(totalCost, shippingAddress, shippingCost);

    cart.items = [];
    cart.totalPrice = 0;
    await cart.save();

    req.flash('success', 'สั่งซื้อเรียบร้อย สามารถเข้าไปดูประวัติการสั่งซื้อได้ที่โปรไฟล์');
    res.redirect(`/order/pay/${order._id}`);
});


router.get('/pay/:orderId', isLogin, async (req, res) => {
    try {
        const orderId = req.params.orderId; 
        const order = await Order.findById(orderId).populate('items.product');
        const address = await Address.findOne({ user: req.user._id });

        if (!order) {
            req.flash('error', 'Order not found');
            return res.redirect('/');
        }

        res.render('order/paypage', { req: req, order: order, address: address });
    } catch (err) {
        console.log('เกิดปัญหาขึ้นที่หน้าจ่ายเงิน ', err);
        res.redirect('/');
    }
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
