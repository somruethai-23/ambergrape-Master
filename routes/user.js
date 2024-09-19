const router = require("express").Router();
const {  isAdmin} = require("../function/setting");
const User = require("../models/User");
const Address = require("../models/Address");
const Order = require("../models/Order");
const bcrypt = require('bcryptjs');
const dayjs = require('dayjs');
require('dayjs/locale/th');
dayjs.locale('th');


router.get("/profile/:userId",  async (req,res)=> {
    const user = await User.findById(req.params.userId);
    if (!user) {
        req.flash('error', 'กรุณาลงชื่อเข้าใช้ก่อน');
        return res.redirect("/login");
    }

    const addresses = await Address.find({ user: req.params.userId });

    res.render('user/profile', { req:req, user:user, addresses});
});

router.get("/profile-edit/:userId/",  async (req,res)=> {
    const user = await User.findById(req.params.userId);
    if (!user) {
        req.flash('error', 'กรุณาลงชื่อเข้าใช้ก่อน');
        return res.redirect("/login");
    }
    res.render('user/profileEdit', { req:req, user:user });
});

// แก้ไขข้อมูลส่วนตัว
router.post("/profile-edit/:userId",  async (req, res) => {
    try {
        const { firstname, lastname, address, city, postalCode, phone } = req.body;

        const existingAddress = await Address.findOne({ user: req.user._id });

        if (existingAddress) {
            existingAddress.firstname = firstname;
            existingAddress.lastname = lastname;
            existingAddress.address = address;
            existingAddress.city = city;
            existingAddress.postalCode = postalCode;
            existingAddress.phone = phone;

            await existingAddress.save();
            req.flash('success', 'แก้ไขที่อยู่สำเร็จ');
        } else {
            const newAddress = new Address({
                user: req.user._id,
                firstname,
                lastname,
                address,
                city,
                postalCode,
                phone
            });

            await newAddress.save();
            req.flash('success', 'เพิ่มที่อยู่สำเร็จ');
        }

        res.redirect('/user/profile/' + req.user._id);
    } catch (err) {
        console.error(err);
        req.flash('error', 'เกิดข้อผิดพลาด กรุณาลองใหม่');
        res.redirect('/user/profile/' + req.user._id);
    }
});

// change password
router.get("/change-password/:userId", async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        
        if (!user) {
            req.flash('error', 'กรุณาเข้าสู่ระบบก่อน');
            return res.redirect('/user/login');
        }

        res.render('user/changepassword', { user });
    } catch (err) {
        console.error('Error fetching user:', err);
        req.flash('error', 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้');
        res.redirect('/user/login');
    }
});

router.post("/change-password/:userId", async (req, res) => {
    const { oldPassword, newPassword, confirmNewPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmNewPassword) {
        req.flash('error', 'กรุณากรอกข้อมูลให้ครบถ้วน');
        return res.redirect(`/user/change-password/${req.params.userId}`);
    }

    if (newPassword.length < 8) {
        req.flash('error', 'ตัวอักษรควรมีอย่างน้อย 8 ตัว');
        return res.redirect(`/user/change-password/${req.params.userId}`);
    }

    if (newPassword !== confirmNewPassword) {
        req.flash('error', 'รหัสผ่านใหม่ไม่ตรงกัน');
        return res.redirect(`/user/change-password/${req.params.userId}`);
    }

    try {
        const user = await User.findById(req.params.userId);

        if (!user) {
            req.flash('error', 'ไม่พบผู้ใช้');
            return res.redirect(`/user/change-password/${req.params.userId}`);
        }

        // ตรวจสอบรหัสผ่านเก่า
        const isOldPasswordMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isOldPasswordMatch) {
            req.flash('error', 'รหัสผ่านเก่าไม่ถูกต้อง');
            return res.redirect(`/user/change-password/${req.params.userId}`);
        }

        // ตรวจสอบว่ารหัสผ่านใหม่ไม่ซ้ำกับชื่อผู้ใช้
        if (newPassword === user.username) {
            req.flash('error', 'รหัสผ่านใหม่ไม่สามารถใช้ชื่อผู้ใช้เป็นรหัสผ่านได้');
            return res.redirect(`/user/change-password/${req.params.userId}`);
        }

        // ตรวจสอบว่ารหัสผ่านใหม่ไม่ซ้ำกับรหัสผ่านเก่า
        const isNewPasswordSameAsOld = await bcrypt.compare(newPassword, user.password);
        if (isNewPasswordSameAsOld) {
            req.flash('error', 'รหัสผ่านใหม่ซ้ำกับรหัสผ่านเก่า');
            return res.redirect(`/user/change-password/${req.params.userId}`);
        }

        // เข้ารหัสรหัสผ่านใหม่
        const hashedNewPassword = bcrypt.hashSync(newPassword, 10);
        user.password = hashedNewPassword;
        await user.save();

        req.flash('success', 'เปลี่ยนรหัสผ่านสำเร็จ');
        res.redirect(`/user/profile/${req.params.userId}`);
    } catch (err) {
        req.flash('error', 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
        console.error(err);
        res.redirect(`/user/change-password/${req.params.userId}`);
    }
});


// delete
router.delete("/:id",  async (req,res)=>{
    try{
        await User.findByIdAndDelete(req.params.id)
        res.status(200).json("ลบตัวตนสำเร็จ")
    } catch(err) {
        res.status(500).json(err);
    }
});



//GET user
router.get("/find/:id", isAdmin, async (req,res)=>{
    try{
        const user = await User.findById(req.params.id)
        const { password, ...others } = user._doc;

        res.status(200).json(others);
    } catch(err) {
        res.status(500).json(err);
    }
});

//GET all user
router.get("/", isAdmin, async (req,res)=>{
    try{
        const users = await User.find();
        res.status(200).json(users);
    } catch(err) {
        res.status(500).json(err);
    }
});

//GET all user stats
router.get("/stats", isAdmin, async (req,res)=>{
    const date = new Date();
    const lastYear = new Date(date.setFullYear(date.getFullYear() - 1));

    try{
        const data = await User.aggregate([
            {$match: {createdAt: {$gte: lastYear} } },
            {
                $project:{
                    month: { $month: "$createdAt" },
                },
            },
            {
                $group: {
                    _id: "$month",
                    total:{ $sum: 1 },
                },
            },
        ]);
        res.status(200).json(data); 
    } catch(err) {
        res.status(500).json(err);
    }
});

// ประวัติสั่งซื้อ
router.get('/history', async (req, res) => {
    const sortBy = req.query.sortBy || 'createdAt-desc';

    let query = Order.find({ user: req.user._id }).populate('items.product');

    if (sortBy === 'createdAt-asc') {
        query = query.sort({ createdAt: 1 });
    } else if (sortBy === 'createdAt-desc') {
        query = query.sort({ createdAt: -1 }); 
    }

    try {
        const orders = await query.exec();
        res.render('user/history', { orders, sortBy, req, dayjs, layout: false });
    } catch (error) {
        console.error(error);
        req.flash('error', 'เกิดข้อผิดพลาดในการดึงประวัติการสั่งซื้อ');
        res.redirect('/');
    }
});



module.exports = router;