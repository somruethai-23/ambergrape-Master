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

    return res.render('user/profile', { req:req, user:user, addresses});
});

router.get("/profile-edit/:userId/",  async (req,res)=> {
    const user = await User.findById(req.params.userId).populate("addresses");
    if (!user) {
        req.flash('error', 'กรุณาลงชื่อเข้าใช้ก่อน');
        return res.redirect("/login");
    }
    
    return res.render('user/profileEdit', { req:req, user });
});


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

        return res.redirect('/user/profile/' + req.user._id);
    } catch (err) {
        console.error(err);
        req.flash('error', 'เกิดข้อผิดพลาด กรุณาลองใหม่');
        return res.redirect('/user/profile/' + req.user._id);
    }
});


router.get("/change-password/:userId", async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        
        if (!user) {
            req.flash('error', 'กรุณาเข้าสู่ระบบก่อน');
            return res.redirect('/user/login');
        }

        return res.render('user/changepassword', { user });
    } catch (err) {
        console.error('Error fetching user:', err);
        req.flash('error', 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้');
        return res.redirect('/user/login');
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

        const isOldPasswordMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isOldPasswordMatch) {
            req.flash('error', 'รหัสผ่านเก่าไม่ถูกต้อง');
            return res.redirect(`/user/change-password/${req.params.userId}`);
        }

        if (newPassword === user.username) {
            req.flash('error', 'รหัสผ่านใหม่ไม่สามารถใช้ชื่อผู้ใช้เป็นรหัสผ่านได้');
            return res.redirect(`/user/change-password/${req.params.userId}`);
        }

        const isNewPasswordSameAsOld = await bcrypt.compare(newPassword, user.password);
        if (isNewPasswordSameAsOld) {
            req.flash('error', 'รหัสผ่านใหม่ซ้ำกับรหัสผ่านเก่า');
            return res.redirect(`/user/change-password/${req.params.userId}`);
        }


        const hashedNewPassword = bcrypt.hashSync(newPassword, 10);
        user.password = hashedNewPassword;
        await user.save();

        req.flash('success', 'เปลี่ยนรหัสผ่านสำเร็จ');
        return res.redirect(`/user/profile/${req.params.userId}`);
    } catch (err) {
        req.flash('error', 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
        console.error(err);
        return res.redirect(`/user/change-password/${req.params.userId}`);
    }
});


router.delete("/:id",  async (req,res)=>{
    try{
        await User.findByIdAndDelete(req.params.id)
        res.status(200).json("ลบตัวตนสำเร็จ")
    } catch(err) {
        res.status(500).json(err);
    }
});

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
        return res.render('user/history', { orders, sortBy, req, dayjs, layout: false });
    } catch (error) {
        console.error(error);
        req.flash('error', 'เกิดข้อผิดพลาดในการดึงประวัติการสั่งซื้อ');
        return res.redirect('/');
    }
});



module.exports = router;