const router = require("express").Router();
const bcrypt = require('bcryptjs');
const User = require("../models/User");
const passport = require('passport');

//REGISTER
router.get("/register", (req,res) => {
    res.render('user/register', { req:req })
})

router.post("/register", async (req,res)=> {
    const { username, email, password, confirmPassword } = req.body;

    const hashedPassword = bcrypt.hashSync(password, 10);

    try {
        // check if username or email already exist
        const existingUser = await User.findOne({ $or: [{username}, {email}] });

        if (existingUser) {
            req.flash('error', 'ชื่อผู้ใช้หรืออีเมลมีอยู่แล้ว');
            return res.redirect('/auth/register');
        };

        if (username.length < 5 && username.length < 20) {
            req.flash('error', 'ตัวอักษรควรมีอย่างน้อย 5 ตัว และไม่ยาวเกิน 20 ตัวอักษร');
            return res.redirect('/auth/register');
        };

        if (password.length < 8) {
            req.flash('error', 'ตัวอักษรควรมีอย่างน้อย 8 ตัว');
            return res.redirect('/auth/register');
        };

        if (password !== confirmPassword) {
            req.flash('error', 'รหัสผ่านไม่เหมือนกัน');
            return res.redirect('/auth/register');
        };

        const user = new User({
            username: req.body.username,
            email: req.body.email,
            password: hashedPassword,
        });
        await user.save();
        req.flash('success', 'register successful!');
        res.redirect('/auth/login');
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

router.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/auth/login', 
    failureFlash: true
}), (req, res) => {
    if (req.isAuthenticated()) {
        res.render('index', { req: req });
    } else {
        req.flash('error', 'Login failed. Please try again.');
        res.redirect('/auth/login');
    }
});
    
// logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = router;