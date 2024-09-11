const router = require("express").Router();
const Product = require("../models/Product");
const Category = require('../models/Category');
const {  isAdmin } = require("../function/setting");

// --------------------------------------- Category ----------------------------------------------
router.get('/',  isAdmin, async(req,res)=> {
    try {
        const categories = await Category.find();
        res.render('categories/categories', { categories: categories, req:req });
    } catch (error) {
        req.flash('error', 'ไม่สามารถเข้าจัดการหน้าหมวดหมู่ได้')
        console.error(error);
        res.redirect('/categories');
    }
});

router.post('/add-category',  isAdmin, async (req, res) => {
    try {
        const { categoryName } = req.body;

        // ตรวจสอบว่า CategoryName ไม่ว่างเปล่า
        if (!categoryName) {
            req.flash('error', 'กรุณาใส่ชื่อหมวดหมู่');
            res.redirect('/categories');
        }

        // ตรวจสอบว่าหมวดหมู่นี้มีอยู่แล้วหรือไม่
        const existingCategory = await Category.findOne({ categoryName });
        if (existingCategory) {
            req.flash('error', 'มีหมวดหมู่นี้อยู่แล้ว');
            res.redirect('/categories');
        }

        // สร้างหมวดหมู่ใหม่
        const newCategory = new Category({ categoryName });
        await newCategory.save();

        req.flash('success', 'เพิ่มหมวดหมู่สำเร็จ');
            res.redirect('/categories');
    } catch (error) {
        req.flash('error', 'มีข้อผิดพลาดเกิดขึ้นจึงไม่สามารถเพิ่มหมวดหมู่ได้');
        res.redirect('/categories');
    }
});

// DELETE 
router.post('/delete-category/:id',  isAdmin, async (req, res) => {
    try {
        const CategoryId = req.params.id;
        // ลบหมวดหมู่จากฐานข้อมูล
        await Category.findByIdAndDelete(CategoryId);
        req.flash('success', 'ลบหมวดหมู่สำเร็จ');
        res.redirect('/categories');
    } catch (error) {
        req.flash('error', 'เกิดข้อผิดพลาดในการลบหมวดหมู่');
        res.redirect('/categories');
    }
});

module.exports = router;



