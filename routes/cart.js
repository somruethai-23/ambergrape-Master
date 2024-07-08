const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const Address = require('../models/Address');
const { isLogin } = require('../routes/setting');
const { registerVersion } = require('firebase/app');

// เพิ่มสินค้าเข้าตะกร้า
router.post('/add-to-cart/:id', isLogin, async (req, res) => {
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
        let cart = await Cart.findOne({ user: req.user._id });

        if (!cart) {
            cart = new Cart({
                user: req.user._id,
                items: [],
                totalPrice: 0,
                totalQuantity: 0
            });
        }

        const existingItemIndex = cart.items.findIndex(item => item.productId.toString() === productId && item.size === size);

        if (existingItemIndex >= 0) {
            cart.items[existingItemIndex].quantity += parseInt(quantity);
        } else {
            const selectedSize = product.sizes.find(s => s.size === size);
            if (selectedSize) {
                cart.items.push({
                    productId: product._id,
                    quantity: parseInt(quantity),
                    size: size,
                    price: selectedSize.price
                });
            } else {
                return res.json({ success: false, message: 'ขนาดสินค้าที่เลือกไม่ถูกต้อง' });
            }
        }

        cart.totalPrice = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        cart.totalQuantity = cart.items.reduce((acc, item) => acc + item.quantity, 0);

        await cart.save();

        res.redirect('/cart');
    } catch (err) {
        console.log(err);
        res.redirect('/');
    }
});

// หน้าสินค้าในตะกร้าก่อน checkout 
router.get('/', isLogin, async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id })
        .populate({
            path: 'items.productId',
            populate: {
                path: 'category',
                model: 'Category'
            }
        });
        const address = await Address.findOne({ user: req.user._id });

        if (!cart) {
            return res.render('cart/cart', { cart: null, req: req });
        }

        let shippingCost = 0;

        const categoryCounts = {};

        cart.items.forEach(item => {
            const categoryName = item.productId.category ? item.productId.category.categoryName : 'undefined';

            if (!categoryCounts[categoryName]) {
                categoryCounts[categoryName] = 0;
            }
            categoryCounts[categoryName] += item.quantity;
        });

        for (const categoryName in categoryCounts) {
            const numItems = categoryCounts[categoryName];
            console.log(`Calculating shipping for ${categoryName}: ${numItems} items`);

            if (categoryName === "ต้นองุ่น") {
                const boxes = Math.ceil(numItems / 3);
                shippingCost += boxes * 150;
            } else if (categoryName === "ปุ๋ยน้ำหมัก") {
                shippingCost += numItems * 70;
            } else {
                shippingCost += numItems * 50;
            }
        }

        res.render('cart/cart', { cart, address, shippingCost, req: req });
    } catch (err) {
        console.log(err);
        res.redirect('/');
    }
});



// เพิ่มจำนวนสินค้า
router.post('/plus/:id', isLogin, async (req, res) => {
    const productId = req.params.id;
    const size = req.query.size;

    try {
        let cart = await Cart.findOne({ user: req.user._id });

        if (!cart) {
            return res.status(404).json({ success: false, message: 'ไม่พบตะกร้าสินค้า' });
        }

        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId && item.size === size);

        if (itemIndex >= 0) {
            cart.items[itemIndex].quantity += 1;

            cart.totalPrice = cart.items.reduce((total, item) => total + item.price * item.quantity, 0);
            await cart.save();

            res.redirect('/cart'); // Redirect to the cart page
        } else {
            req.flash('error', 'เกิดข้อผิดพลาดในการเพิ่มจำนวนสินค้า');
            res.redirect('/cart');
        }
    } catch (err) {
        console.log(err);
        res.redirect('/cart');
    }
});

// ลดจำนวนสินค้า
router.post('/minus/:id', isLogin, async (req, res) => {
    const productId = req.params.id;
    const size = req.query.size;

    try {
        let cart = await Cart.findOne({ user: req.user._id });

        if (!cart) {
            return res.redirect('/');
        }

        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId && item.size === size);

        if (itemIndex >= 0) {
            if (cart.items[itemIndex].quantity > 1) {
                cart.items[itemIndex].quantity -= 1;

                cart.totalPrice = cart.items.reduce((total, item) => total + item.price * item.quantity, 0);
                await cart.save();

                res.redirect('/cart'); // Redirect to the cart page
            } else {
                res.redirect('/cart');
            }
        } else {
            res.redirect('/cart');
        }
    } catch (err) {
        console.log(err);
        res.redirect('/cart');
    }
});

// POST route to remove item from cart
router.post('/remove-from-cart/:id', isLogin, async (req, res) => {
    const productId = req.params.id;
    const size = req.query.size; // รับค่า size จาก query string

    try {
        // Retrieve the cart from the database
        let cart = await Cart.findOne({ user: req.user._id });

        if (!cart) {
            req.flash('error', 'ไม่พบตะกร้าสินค้า');
            return res.redirect('/cart');
        }

        // Find the item in the cart
        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId && item.size === size);

        if (itemIndex >= 0) {
            // Get the item
            const item = cart.items[itemIndex];

            // Update the total price and quantity
            cart.totalPrice -= item.price * item.quantity;
            cart.totalQuantity -= item.quantity;

            // Remove the item from the cart
            cart.items.splice(itemIndex, 1);

            // Save the updated cart to the database
            await cart.save();

            req.flash('success', 'ลบสินค้าออกจากตะกร้าสำเร็จ');
            res.redirect('/cart');
        } else {
            req.flash('error', 'ไม่พบสินค้านี้ในตะกร้า');
            res.redirect('/cart');
        }
    } catch (err) {
        console.log(err);
        req.flash('error', 'เกิดข้อผิดพลาดในการลบสินค้าออกจากตะกร้า');
        res.redirect('/cart');
    }
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
