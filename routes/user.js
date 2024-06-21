const router = require("express").Router();
const { isLogin, isAdmin} = require("./setting");
const User = require("../models/User");
const Address = require("../models/Address");


router.get("/profile/:userId", isLogin, async (req,res)=> {
    const user = await User.findById(req.params.userId);
    if (!user) {
        req.flash('error', 'กรุณาลงชื่อเข้าใช้ก่อน');
        return res.redirect("/login");
    }

    const addresses = await Address.find({ user: req.params.userId });

    res.render('user/profile', { req:req, user:user, addresses});
});

router.get("/profile-edit/:userId/", isLogin, async (req,res)=> {
    const user = await User.findById(req.params.userId);
    if (!user) {
        req.flash('error', 'กรุณาลงชื่อเข้าใช้ก่อน');
        return res.redirect("/login");
    }
    res.render('user/profileEdit', { req:req, user:user });
});

// แก้ไขข้อมูลส่วนตัว
router.post("/profile-edit/:userId", isLogin, async (req, res) => {
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



// update username
router.put("/profile/:userId", isLogin, async (req,res)=>{
    if(req.body.password) {
        req.body.password = CryptoJS.AES.encrypt(
            req.body.password ,
            process.env.SEC_KEY
        ).toString();
    }

    try{
        const updatedUser = await User.findByIdAndUpdate(req.params.id, {
            $set: req.body
        },{new: true});
        res.status(200).json(updatedUser);
    } catch(err) {
        res.status(500).json(err);
    }
});


// delete
router.delete("/:id", isLogin, async (req,res)=>{
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

module.exports = router;