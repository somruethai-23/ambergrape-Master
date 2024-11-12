const router = require("express").Router();
const Product = require("../models/Product");
const Category = require('../models/Category');
const {  isAdmin } = require("../function/setting");

router.get('/',  isAdmin, async(req,res)=> {
    try {
        const categories = await Category.find();
        return res.render('categories/categories', { categories: categories, req:req });
    } catch (error) {
        req.flash('error', 'ไม่สามารถเข้าจัดการหน้าหมวดหมู่ได้')
        console.error(error);
        return res.redirect('/categories');
    }
});

router.post('/add-category', isAdmin, async (req, res) => {
    try {
        const { categoryName } = req.body;

        if (!categoryName) {
            req.flash('error', 'กรุณาใส่ชื่อหมวดหมู่');
            return res.redirect('/categories');
        }

        const existingCategory = await Category.findOne({ categoryName });
        if (existingCategory) {
            req.flash('error', 'มีหมวดหมู่นี้อยู่แล้ว');
            return res.redirect('/categories');
        }

        const newCategory = new Category({ categoryName });
        await newCategory.save();

        req.flash('success', 'เพิ่มหมวดหมู่สำเร็จ');
        return res.redirect('/categories');
    } catch (error) {
        console.log(error);
        req.flash('error', 'มีข้อผิดพลาดเกิดขึ้นจึงไม่สามารถเพิ่มหมวดหมู่ได้');
        return res.redirect('/categories');
    }
});


router.post('/delete-category/:id',  isAdmin, async (req, res) => {
    try {
        const CategoryId = req.params.id;
        await Category.findByIdAndDelete(CategoryId);
        req.flash('success', 'ลบหมวดหมู่สำเร็จ');
        return res.redirect('/categories');
    } catch (error) {
        req.flash('error', 'เกิดข้อผิดพลาดในการลบหมวดหมู่');
        return res.redirect('/categories');
    }
});

module.exports = router;



