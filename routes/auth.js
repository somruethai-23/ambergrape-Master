const router = require("express").Router();
const CryptoJS = require("crypto-js");
const User = require("../models/User");
const jwt = require('jsonwebtoken');
const cors = require("cors");

//REGISTER
router.get("/register", (req,res) => {
    res.render('user/register', { req:req })
})

router.post("/register", async (req,res)=> {
    const { username, email, password, confirmPassword } = req.body;

    const existingUser = await User.findOne({ $or: [{ email: email }, { username: username }] });
    if (existingUser) {
        req.flash('error', 'อีเมลหรือชื่อผู้ใช้นี้ถูกใช้แล้ว กรุณาใช้อีเมลหรือชื่อผู้ใช้อื่น')
    }
    if (username.length<5) {
        req.flash('error', 'ชื่อผู้ใช้จำเป็นต้องมีออย่างน้อย 5 ตัวอักษร')
        return res.redirect('/user/register');
    }

    if (password !== confirmPassword) {
        req.flash('error', 'รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
        return res.redirect('/user/register');
    }

    const encryptedPassword = CryptoJS.AES.encrypt(password, process.env.SEC_KEY).toString();

    const newUser = new User({
        username: username,
        email: email,
        password: encryptedPassword,
    });

    try {
        const savedUser = await newUser.save();
        req.flash('success', 'สมัครสมาชิกสำเร็จ');
        res.redirect('/user/login');
    } catch (err) {
        req.flash('error', 'สมัครไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        console.log(err);
        return res.redirect('/user/register');
    }
});


//LOGIN
router.get("/login", (req,res) => {
    res.render('user/login', { req:req })
})

router.post("/login", async (req,res)=> {
    try{
        const user = await User.findOne({username: req.body.username });
        if (!user) {
            req.flash('error', 'ไม่มีสมาชิกนี้ในระบบ กรุณาสมัครสมาชิกหรือลองใหม่อีกครั้ง')
            return res.render('user/login', {req:req});
        }

        const hashedPassword = CryptoJS.AES.decrypt(user.password, process.env.SEC_KEY);
        const OriginalPassword = hashedPassword.toString(CryptoJS.enc.Utf8);

        if (OriginalPassword !== req.body.password) {
        req.flash('error', 'รหัสผ่านผิด กรุณาลองใหม่อีกครั้งค่ะ')
        return res.render('user/login', {req:req});
        }

        const accessToken = jwt.sign({
            id: user._id,
            isAdmin: user.isAdmin,
            }, 
            process.env.JWT_SEC,
            {expiresIn: "5d"}
        );

        req.flash('success', 'เข้าสู่ระบบสำเร็จ ยินดีต้อนรับค่ะคุณ', req.username);
        return res.render('/', {req:req});
        
    } catch(err) {
        res.status(500).json(err);
    }
});

module.exports = router;