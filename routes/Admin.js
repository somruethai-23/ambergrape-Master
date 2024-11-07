const router = require("express").Router();
const Product = require("../models/Product");
const Order = require("../models/Order");
const Category = require("../models/Category");
const User = require('../models/User');
const { isAdmin } = require("../function/setting");
const { calculateMonthlyEarnings, calculateAnnualEarnings, getMonthlyEarnings, bestSellingAll, calculateMembershipAge, newUserPerMonth, countNewAndReturningCustomers } = require("../function/calculate");
const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
dayjs.extend(duration);


router.get('/dashboard', isAdmin, async (req, res) => {
    try {
        const monthlyEarnings = await calculateMonthlyEarnings();
        const annualEarnings = await calculateAnnualEarnings();
        const earnings = await getMonthlyEarnings();
        const orders = await Order.find();
        const pendingOrders = orders.filter(order => order.orderStatus === "รอเช็คเงินเข้า").length;
        const bestSelling = await bestSellingAll();

        const categories = await Category.find();

        res.render('admin/dashboard', { 
            categories: categories,
            monthlyEarnings: monthlyEarnings, 
            annualEarnings: annualEarnings[0], 
            layout: false, 
            pendingOrders,
            earnings,
            bestSelling
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.status(500).send('Internal Server Error');
    }
});



// --------------------------------------- Product MANAGE Page ----------------------------------------------
router.get('/manage-product', isAdmin, async (req, res) => {
    try {
        const products = await Product.find().populate('category');
        res.render('admin/productManagement', { req: req, products: products, layout:false });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});



// -------------- Order --------------------
router.get('/manage-order', isAdmin, async (req,res)=> {
    const orders = await Order.find().populate({
        path: 'items.product', // ดึงข้อมูลสินค้าใน items.product
        select: 'productName'   // เลือกเฉพาะชื่อสินค้า
    }).populate('user'); // ดึงข้อมูลผู้ใช้

    res.render('admin/orderManagement', { orders, dayjs, layout:false });
});

router.post('/update-status/:id', async (req, res) => {
    try {
        const orderId = req.params.id;
        const { status } = req.body;

        // ตรวจสอบว่ามีสถานะที่ได้รับเป็นสถานะถัดไป
        const validStatuses = ['ยังไม่ได้ชำระ', 'รอเช็คเงินเข้า', 'กำลังแพ็คสินค้า', 'จัดส่ง' , 'ยกเลิก'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'สถานะไม่ถูกต้อง', receivedStatus: status });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'ไม่พบออเดอร์' });
        }

        order.orderStatus = status;
        await order.save();

        res.redirect('/admin/manage-order');
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะออเดอร์' });
        console.log(error);
    }
});

router.post('/cancel-order/:id', async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    try {
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).send('Order not found');
        }

        order.orderStatus = 'ยกเลิก';
        order.cancelReason = reason;
        await order.save();

        res.redirect('/admin/manage-customer');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// ---------------- Customer ------------------
router.get('/manage-customer', isAdmin, async (req, res) => {
    const newUser = await newUserPerMonth();
    const { newCustomers, returningCustomers } = await countNewAndReturningCustomers();

    const totalCustomers = newCustomers + returningCustomers;
    const returningPercentage = (returningCustomers / totalCustomers) * 100;
    const newPercentage = (newCustomers / totalCustomers) * 100;

    try {
        const { search = '', sort = 'createdAt', order = 'asc' } = req.query;

        // Validate sort and order parameters
        const validSortFields = ['membershipAge', 'orderCount', 'status', 'createdAt'];
        const sortField = validSortFields.includes(sort) ? sort : 'createdAt';
        const sortOrder = order === 'desc' ? -1 : 1;

        // Build the query
        const query = {
            $or: [
                { username: new RegExp(search, 'i') },
                { email: new RegExp(search, 'i') }
            ]
        };

        // Fetch users with search query
        const users = await User.find(query);

        const userData = [];
        
        for (let user of users) {

            const registrationDate = user.createdAt;
            const membershipAge = calculateMembershipAge(user.createdAt);

            const orders = await Order.find({ user: user._id }).countDocuments();

            userData.push({
                username: user.username,
                email: user.email,
                registrationDate: dayjs(registrationDate).format('D MMMM YYYY'),
                membershipAge,
                orderCount: orders,
                isAdmin: user.isAdmin,
                _id: user._id,
            });
        }

        const adminCount = users.filter(user => user.isAdmin).length;
        const customerCount = users.length - adminCount;   

        // Sort userData array
        userData.sort((a, b) => {
            if (sortField === 'status') {
                return (a.isAdmin > b.isAdmin ? 1 : -1) * sortOrder;
            }
            return (a[sortField] > b[sortField] ? 1 : -1) * sortOrder;
        });

        res.render('admin/userManagement', { 
            users: userData, 
            dayjs, 
            layout: false, 
            search, 
            sort, 
            order,
            adminCount,
            customerCount,
            newUser,
            newPercentage,
            returningPercentage
        });
    } catch (error) {
        console.error('Error fetching user data:', error);
        req.flash('error', 'เกิดข้อผิดพลาดในการดึงข้อมูลลูกค้า');
        res.redirect('/');
    }
});


// เปลี่ยนสถานะลูกค้าเป็น Admin
router.post('/change-status/:userId', isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        console.log('Before:', user.isAdmin);  // ดูสถานะก่อนเปลี่ยน
        if (!user) {
            req.flash('error', 'ไม่พบผู้ใช้');
            return res.redirect('/admin/manage-customer');
        }

        // เปลี่ยนสถานะ
        user.isAdmin = !user.isAdmin;  // สลับสถานะจาก true เป็น false หรือ false เป็น true
        await user.save();

        req.flash('success', 'เปลี่ยนสถานะผู้ใช้เรียบร้อยแล้ว');
        res.redirect('/admin/manage-customer');
    } catch (error) {
        console.error('Error changing user status:', error);
        req.flash('error', 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะผู้ใช้');
        res.redirect('/admin/manage-customer');
    }
});




module.exports = router;