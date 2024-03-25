const router = require("express").Router();
const Product = require("../models/Product");
const Categories = require("../models/Category");
const { isLogin, isAdmin } = require("./setting");

// firebase Storage
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const Multer = require('multer');

const storage = new Storage({
    projectId: process.env.project_ID,
    keyFilename: '../src/ambergrapeecommerce-firebase-adminsdk-5qyg1-4ae9158a1f.json', // ใช้ path ของ service account key ของคุณ
});

const bucket = storage.bucket(process.env.storage_BUCKET);
const multer = Multer({
    storage: Multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // ขนาดไฟล์ไม่เกิน 5MB
    },
});

// --------------------------------------- Product MANAGE Page ----------------------------------------------
router.get('/productmanagement', isLogin, isAdmin, async (req,res)=>{
        const products = await Product.find().populate('category');
    res.render('admin/productManagement', {req:req, products: products});
});




// --------------------------------------- ADD product page ----------------------------------------------
router.get('/add-product', isLogin, isAdmin, async (req, res) => {
    const products = await Product.find();
    const categories = await Categories.find();
    res.render('admin/productAdd', {req:req, products: products, categories: categories});
});

router.post('/add-product', multer.single('image'), async (req, res) => {
    try {
        const { productName, price, description, stockQuantity, status, sizes, category } = req.body;
        const imageUrl = req.file ? await uploadImageToStorage(req.file) : null;

        // สร้างสินค้าใหม่
        const newProduct = new Product({
            productName,
            price,
            description,
            stockQuantity,
            image: imageUrl, // ใช้ URL ของรูปภาพที่อัปโหลด
            status,
            sizes: sizes.split(',').map(size => size.trim()),
            category,
        });

        // บันทึกสินค้าลงใน MongoDB
        await newProduct.save();
        req.flash('success', 'เพิ่มสินค้าเรียบร้อยแล้ว');
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error adding product');
    }
});

async function uploadImageToStorage(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject('No file uploaded');
        }

        const fileName = Date.now() + '-' + path.basename(file.originalname);
        const filePath = `productImage/${fileName}`; // เส้นทางที่ต้องการบันทึกไฟล์

        const fileUploadStream = bucket.file(filePath).createWriteStream({
            metadata: {
                contentType: file.mimetype,
            },
        });

        fileUploadStream.on('error', (err) => {
            console.error(err);
            reject('Error uploading file');
        });

        fileUploadStream.on('finish', () => {
            const imageUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
            resolve(imageUrl);
        });

        fileUploadStream.end(file.buffer);
    });
}




// --------------------------------------- UPDATE product page ----------------------------------------------
router.get('/edit-product/:productId', isLogin, isAdmin, async(req,res) => {
    const productId = req.params.productId;
    const product = await Product.findById(productId);

    if (!product) {
        req.flash('error', 'ไม่พบสินค้าที่ต้องการแก้ไข');
        return res.redirect('/admin/productManagement');
    };
    res.render('admin/productEdit', { req: req, product: product });
});



// --------------------------------------- DELETE all products ----------------------------------------------
router.post('/delete-all-products', isLogin, isAdmin, async (req, res) => {
    try {
        await Product.deleteMany({});
        req.flash('success', 'ลบสินค้าทั้งหมดเรียบร้อยแล้ว');
        res.redirect('/admin/productManagement');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error deleting all products');
    }
});

// --------------------------------------- DELETE product by ID ----------------------------------------------
router.post('/delete-product/:productId', isLogin, isAdmin, async (req, res) => {
    try {
        const productId = req.params.productId;
        await Product.findByIdAndDelete(productId);
        req.flash('success', 'ลบสินค้าเรียบร้อยแล้ว');
        res.redirect('/admin/productManagement');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error deleting product');
    }
});


// --------------------------------------- CATEGORIES ----------------------------------------------
router.get('/categories', isLogin, isAdmin, async(req,res)=> {
    try {
        const categories = await Categories.find();
        res.render('admin/categories', { categories: categories, req:req });
    } catch (error) {
        req.flash('error', 'ไม่สามารถเข้าจัดการหน้าหมวดหมู่ได้')
        console.error(error);
        res.redirect('/admin/productManagement');
    }
});

router.post('/add-category', isLogin, isAdmin, async (req, res) => {
    try {
        const { categoryName } = req.body;

        // ตรวจสอบว่า categoryName ไม่ว่างเปล่า
        if (!categoryName) {
            req.flash('error', 'กรุณาใส่ชื่อหมวดหมู่');
            res.redirect('/admin/categories');
        }

        // ตรวจสอบว่าหมวดหมู่นี้มีอยู่แล้วหรือไม่
        const existingCategory = await Categories.findOne({ categoryName });
        if (existingCategory) {
            req.flash('error', 'มีหมวดหมู่นี้อยู่แล้ว');
            res.redirect('/admin/categories');
        }

        // สร้างหมวดหมู่ใหม่
        const newCategory = new Categories({ categoryName });
        await newCategory.save();

        req.flash('success', 'เพิ่มหมวดหมู่สำเร็จ');
            res.redirect('/admin/categories');
    } catch (error) {
        req.flash('error', 'มีข้อผิดพลาดเกิดขึ้นจึงไม่สามารถเพิ่มหมวดหมู่ได้');
        res.redirect('/admin/categories');
    }
});

// DELETE 
router.post('/delete-category/:id', isLogin, isAdmin, async (req, res) => {
    try {
        const categoryId = req.params.id;
        // ลบหมวดหมู่จากฐานข้อมูล
        await Categories.findByIdAndDelete(categoryId);
        req.flash('success', 'ลบหมวดหมู่สำเร็จ');
        res.redirect('/admin/categories');
    } catch (error) {
        req.flash('error', 'เกิดข้อผิดพลาดในการลบหมวดหมู่');
        res.redirect('/admin/categories');
    }
});

module.exports = router;