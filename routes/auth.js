const router = require("express").Router();
const bcrypt = require('bcryptjs');
const User = require("../models/User");
const { createSecretToken, decodeToken } = require("../function/tokenGenerate");
const passport = require('../function/passport'); 

//REGISTER
router.get("/register", (req,res) => {
    res.render('user/register', { req:req })
})

router.post("/register", async (req,res)=> {
    const { username, email, password, confirmPassword } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);

    try {
        const existingUser = await User.findOne({ $or: [{username}, {email}] });

        if (existingUser) {
            req.flash('error', 'ชื่อผู้ใช้หรืออีเมลมีอยู่แล้ว');
            return res.redirect('/auth/register');
        };

        if (username.length < 5 || username.length > 20) {
            req.flash('error', 'ตัวอักษรควรมีอย่างน้อย 5 ตัว และไม่ยาวเกิน 20 ตัวอักษร');
            return res.redirect('/auth/register');
        }        

        if (password.length < 8) {
            req.flash('error', 'ตัวอักษรควรมีอย่างน้อย 8 ตัว');
            return res.redirect('/auth/register');
        };

        if (password !== confirmPassword) {
            req.flash('error', 'รหัสผ่านไม่เหมือนกัน');
            return res.redirect('/auth/register');
        };

        if (password === username) {
            req.flash('error', 'รหัสผ่านใหม่ไม่สามารถใช้ชื่อผู้ใช้เป็นรหัสผ่านได้');
            return res.redirect('/auth/register');
        }

        const newUser = new User({
            username: req.body.username,
            email: req.body.email,
            password: hashedPassword,
        });

        const user = await newUser.save();
        const token = createSecretToken(user._id);

        res.cookie("token", token, {
            path: "/",
            expires: new Date(Date.now() + 86400000),
            secure: true,
            httpOnly: true,
            sameSite: "None", 
        });

        req.flash('success', 'สมัครสำเร็จ!');
        res.redirect('/');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Something went wrong!');
        res.redirect('/auth/register');
    }
});


//LOGIN
router.get("/login", (req,res) => {
    res.render('user/login', { req:req })
})

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });

        if (!user) {
            req.flash('error', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
            return res.redirect('/auth/login');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            req.flash('error', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
            return res.redirect('/auth/login');
        }

        const token = createSecretToken(user._id);
        console.log('token:', token); // จะแสดงค่า token ที่สร้างขึ้น
        console.log('user ID:', user._id); // จะแสดงค่า user ID จากฐานข้อมูล
        console.log('req user ID:', req.user._id); // จะแสดงค่า user ID จาก session (หากมีการเข้าสู่ระบบ)

        res.cookie("token", token, {
            path: "/",
            expires: new Date(Date.now() + 86400000),
            secure: true,
            httpOnly: true,
            sameSite: "None", 
        });

        req.flash('success', 'เข้าสู่ระบบสำเร็จ')
        res.redirect('/');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Something went wrong!');
        res.redirect('/auth/login');
    }
});

// GOOGLE
// Start Google authentication
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google callback route
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
    if (!req.user) {
        return res.redirect('/');
    }

    const token = createSecretToken(user._id);
  
    res.cookie('token', token, {
      path: '/',
      expires: new Date(Date.now() + 86400000),
      secure: true,
      httpOnly: true,
      sameSite: 'None',
    });
  
    res.redirect('/');
  });
    
// logout
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    req.flash('success', 'ลงชื่อออกสำเร็จ')
    res.redirect('/');
});

module.exports = router;