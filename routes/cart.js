const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const Address = require('../models/Address');
const { isLogin } = require('../function/setting');

router.post('/add-to-cart/:id', isLogin, async (req, res) => {
    const productId = req.params.id;
    const { quantity, size } = req.body;
    const product = await Product.findById(productId);

    if (!req.user) {
        req.flash('error', 'กรุณาเข้าสู่ระบบก่อน');
        return res.redirect('/auth/login');
    }

    if (!product) {
        req.flash('error', 'เกิดข้อผิดพลาด ไม่มีสินค้าในระบบ');
        return res.redirect('/');
    }

    if (quantity > product.stockQuantity) {
        req.flash('error', 'ไม่มีสินค้าในสต็อก หรือสินค้าหมด');
        return res.redirect('/');
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
                req.flash('error', 'ขนาดสินค้าไม่ถูกต้อง');
                return res.redirect('/');
            }
        }

        cart.totalPrice = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        cart.totalQuantity = cart.items.reduce((acc, item) => acc + item.quantity, 0);

        await cart.save();
        req.flash('success', `เพิ่มสินค้า ${product.productName} เข้าตะกร้าแล้ว`)
        res.redirect(`/product/${productId}`);
    } catch (err) {
        console.log(err);
        res.redirect('/');
    }
});


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

            if (categoryName === "ต้นองุ่น") {
                const boxes = Math.ceil(numItems / 3);
                shippingCost += boxes * 150;
            } else if (categoryName === "ปุ๋ยน้ำหมัก") {
                switch (numItems) {
                    case 1:
                        shippingCost += 40;
                        break;
                    case 2:
                        shippingCost += 70;
                        break;
                    case 3:
                        shippingCost += 70;
                        break;
                    case 4:
                        shippingCost += 80;
                        break;
                    default:
                        if (numItems > 4) {
                            shippingCost += 100;
                        }
                        break;
                }
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

            res.redirect('/cart');
        } else {
            req.flash('error', 'เกิดข้อผิดพลาดในการเพิ่มจำนวนสินค้า');
            res.redirect('/cart');
        }
    } catch (err) {
        console.log(err);
        res.redirect('/cart');
    }
});

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

router.post('/remove-from-cart/:id', isLogin, async (req, res) => {
    const productId = req.params.id;
    const size = req.query.size; 

    try {
        let cart = await Cart.findOne({ user: req.user._id });

        if (!cart) {
            req.flash('error', 'ไม่พบตะกร้าสินค้า');
            return res.redirect('/cart');
        }

        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId && item.size === size);

        if (itemIndex >= 0) {
            const item = cart.items[itemIndex];

            cart.totalPrice -= item.price * item.quantity;
            cart.totalQuantity -= item.quantity;

            cart.items.splice(itemIndex, 1);

            await cart.save();

            req.flash('success', 'ลบสินค้าออกจากตะกร้าสำเร็จ');
            return res.redirect('/cart');
        } else {
            req.flash('error', 'ไม่พบสินค้านี้ในตะกร้า');
            return res.redirect('/cart');
        }

    } catch (err) {
        console.log(err);
        req.flash('error', 'เกิดข้อผิดพลาดในการลบสินค้าออกจากตะกร้า');
        return res.redirect('/cart');
    }
});


router.delete("/", isLogin, (req, res) => {
    try {
        req.session.cart = null;
        req.flash('success', 'ลบสินค้าในตะกร้าสำเร็จ');
    } catch (err) {
        req.flash('error', 'ลบไม่สำเร็จ กรุณาลองใหม่');
        console.log('ลบสินค้าในตะกร้ามีปัญหา: ', err);
        return res.redirect('/cart');
    }
    return res.redirect('/');
});


module.exports = router;
