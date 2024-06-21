const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const { isLogin } = require('../routes/setting');
const { registerVersion } = require('firebase/app');

router.get('/', isLogin, async (req, res) => {
    let user;
    if (req.user) {
        user = await User.findById(req.user._id);
    }

    if (!req.session.cart) {
        req.session.cart = { items: [] }; // Ensure cart is initialized
    }

    const cart = req.session.cart;

    // Populate products for each item in the cart
    for (const item of cart.items) {
        const product = await Product.findById(item.productId).populate('category');
        item.product = product;
    }

    res.render('cart/cart', { cart: cart, user: user, req: req, layout: false });
});


router.post("/add-to-cart/:id", isLogin, async (req, res) => {
    const productId = req.params.id;
    const { quantity, size } = req.body;
    const product = await Product.findById(productId);

    if (!product) {
        return res.json({ success: false, message: 'ไม่มีสินค้านี้ในระบบ' });
    }

    if (quantity > product.stockQuantity) {
        return res.json({ success: false, message: 'จำนวนสินค้าที่ต้องการเกินกว่าที่มีในสต็อก' });
    }

    try {
        if (!req.session.cart) {
            req.session.cart = {
                items: [],
                totalPrice: 0,
                totalQuantity: 0
            };
        }
    
        const cart = req.session.cart;
        const existingItemIndex = cart.items.findIndex(item => item.productId.toString() === productId && item.size === size);
    
        // หลังจากที่เช็คว่าสินค้ามีอยู่ในระบบและมีสต็อกเพียงพอ
        if (existingItemIndex >= 0) {
            cart.items[existingItemIndex].quantity += parseInt(quantity);
        } else {
            // เพิ่มสินค้าเข้าตะกร้า
            const selectedSize = product.sizes.find(s => s.size === size);
            if (selectedSize) {
                cart.items.push({ 
                    productId: product._id, 
                    quantity: parseInt(quantity), 
                    size: size,
                    price: selectedSize.price // ราคาของไซส์ที่เลือก
                });
    
                // บันทึกราคาและไซส์ลงใน session
                cart.totalPrice += selectedSize.price * parseInt(quantity); // เพิ่มราคารวม
                cart.totalQuantity += parseInt(quantity); // เพิ่มจำนวนสินค้าทั้งหมด
    
            } else {
                return res.json({ success: false, message: 'ขนาดสินค้าที่เลือกไม่ถูกต้อง' });
            }
        }
    
        req.session.cart = cart;
    
        res.redirect('/');
    } catch (err) {
        console.log(err);
        res.redirect('/');
    }
});

router.post('/update-cart', async (req, res) => {
    const { productId, size, quantity } = req.body;
    if (!req.session.cart) {
        return res.status(400).send({ error: 'Cart not found' });
    }

    const cart = req.session.cart;

    if (!Array.isArray(cart.items)) {
        cart.items = []; // Ensure items is an array
    }

    const item = cart.items.find(item => item.productId === productId && item.size === size);
    if (!item) {
        return res.status(400).send({ error: 'Item not found in cart' });
    }

    // Update the quantity
    item.quantity = quantity;

    // Update the session
    req.session.cart = cart;

    // Calculate new totals
    const product = await Product.findById(productId);
    const subTotal = item.price * item.quantity;
    const total = cart.items.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);

    res.send({ subTotal, total });
});


// เคลียร์ตะกร้า
router.delete("/", isLogin, (req, res) => {
    try {
        req.session.cart = null;
        req.flash('success', 'ลบสินค้าในตะกร้าสำเร็จ');
    } catch (err) {
        req.flash('error', 'ลบไม่สำเร็จ กรุณาลองใหม่');
        console.log('ลบสินค้าในตะกร้ามีปัญหา: ', err);
    }
    res.redirect('/');
});



// ดูตะกร้าทั้งหมด 
module.exports = router;
