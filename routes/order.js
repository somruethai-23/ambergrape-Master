const express = require('express');
const {  isAdmin } = require('../function/setting');
const dayjs = require('dayjs');
const router = express.Router();
const Product = require('../models/Product');
const Address = require('../models/Address');
const Order = require('../models/Order');
const Cart = require('../models/Cart');

const { Storage } = require('@google-cloud/storage');
const path = require('path');
const multer = require('multer');

const storage = new Storage({
    projectId: process.env.project_ID,
    credentials: JSON.parse(process.env.FIREBASE_CREDENTIALS),
});

const bucket = storage.bucket(process.env.storage_BUCKET);
const upload = multer({ storage: multer.memoryStorage() });


router.post('/place-order',  async (req, res) => {
    const user = req.user._id;
    const shippingAddress = await Address.findOne({ user });

    if (!shippingAddress) {
        req.flash('error', 'กรุณาเพิ่มที่อยู่ก่อนสั่งซื้อ');
        return res.redirect(`/user/profile-edit/${user._id}`);
    }

    const cart = await Cart.findOne({ user }).populate({
        path: 'items.productId',
        populate: { path: 'category' }
    });

    if (!cart || cart.items.length === 0) {
        req.flash('error', 'ไม่มีสินค้าในตะกร้า');
        return res.redirect('/');
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

    cart.items = [];
    cart.totalPrice = 0;
    await cart.save();

    req.flash('success', 'สั่งซื้อเรียบร้อย สามารถเข้าไปดูประวัติการสั่งซื้อได้ที่โปรไฟล์');
    return res.redirect(`/order/pay/${order._id}`);
});


router.get('/pay/:orderId',  async (req, res) => {
    try {
        const orderId = req.params.orderId; 
        const order = await Order.findById(orderId).populate('items.product');
        const address = await Address.findOne({ user: req.user._id });

        if (!order) {
            req.flash('error', 'หาออเดอร์ไม่พบ');
            return res.redirect('/');
        }

        res.render('order/paypage', { req: req, order: order, address: address });
    } catch (err) {
        console.log('เกิดปัญหาขึ้นที่หน้าจ่ายเงิน ', err);
        req.flash('error', 'เกิดปัญหาขึ้น กรุณาลองอีกครั้ง');
        return res.redirect('/');
    }
});

router.get('/:orderId',  async (req, res) => {
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
        return res.redirect('/order');
    }
});

router.post('/confirm-payment/:orderId',  upload.single('slipImage'), async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId);

        if (!order) {
            req.flash('error', 'ไม่พบคำสั่งซื้อ');
            return res.redirect('/user/');
        }

        const imageUrls = [];

        if (req.file) {
            const imageUrl = await uploadImageToStorage(req.file);
            imageUrls.push(imageUrl);
        }

        order.slipImage = imageUrls.length > 0 ? imageUrls[0] : '';
        
        if (order.orderStatus === 'ยังไม่ได้ชำระ') {
            order.orderStatus = 'รอเช็คเงินเข้า';
            await order.save();
            req.flash('success', 'ยืนยันการจ่ายเงินเรียบร้อยแล้ว');
        }

        return res.redirect('/user/history');
    } catch (error) {
        console.log(error);
        req.flash('error', 'มีปัญหาในการยืนยันการจ่ายเงิน');
        return res.redirect('/user/history');
    }
});


async function uploadImageToStorage(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject('No file uploaded');
        }

        const fileName = Date.now() + '-' + path.basename(file.originalname);
        const filePath = `slipImage/${fileName}`;

        const fileUploadStream = bucket.file(filePath).createWriteStream({
            metadata: {
                contentType: file.mimetype,
            },
        });

        fileUploadStream.on('error', (err) => {
            console.error(err);
            reject('Error uploading file');
        });

        fileUploadStream.on('finish', () => {
            const imageUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
            resolve(imageUrl);
        });

        fileUploadStream.end(file.buffer);
    });
};

router.post('/cancel-order/:orderId',  async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId);

        if (!order) {
            req.flash('error', 'ไม่พบคำสั่งซื้อ');
            return res.redirect('/user/history');
        }

        await Order.findByIdAndDelete(orderId);

        req.flash('success', 'คำสั่งซื้อถูกยกเลิกเรียบร้อยแล้ว');
        return res.redirect('/user/history');
    } catch (error) {
        console.error(error);
        req.flash('error', 'เกิดข้อผิดพลาดในการยกเลิกคำสั่งซื้อ');
        return res.redirect('/user/history');
    }
});

module.exports = router;
