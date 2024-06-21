const router = require("express").Router();
const Product = require("../models/Product");
const Category = require("../models/Category");
const { isLogin, isAdmin } = require("./setting");

// firebase Storage
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const multer = require('multer');

const storage = new Storage({
    projectId: process.env.project_ID,
    keyFilename: path.resolve(__dirname, '../src/ambergrapeecommerce-firebase-adminsdk-5qyg1-4ae9158a1f.json'),
});

const bucket = storage.bucket(process.env.storage_BUCKET);
const upload = multer({ storage: multer.memoryStorage() });

// --------------------------------------- Product MANAGE Page ----------------------------------------------
router.get('/productmanagement', isLogin, isAdmin, async (req,res)=>{
        const products = await Product.find().populate('category');
    res.render('admin/productManagement', {req:req, products: products});
});

// --------------------------------------- ADD product page ----------------------------------------------
router.get('/add-product', isLogin, isAdmin, async (req, res) => {
    const products = await Product.find();
    const categories = await Category.find();
    res.render('admin/productAdd', {req:req, products: products, categories: categories, layout: false});
});

router.post('/add-product', upload.array("images"), async (req, res) => {

    try {
        const { productName, price, stockQuantity, status, sizes, category, description} = req.body;

        const parsedSizes = sizes.map(sizeObj => ({
            size: sizeObj.size.trim(),
            price: parseFloat(sizeObj.price)
        }));

        // สร้างอาร์เรย์เพื่อเก็บ URL หรือที่อยู่ของรูปภาพทั้งหมด
        const imageUrls = [];
        
        // วนลูปผ่านทุกไฟล์ที่อัปโหลด
        for (const file of req.files) {
            const imageUrl = await uploadImageToStorage(file);
            imageUrls.push(imageUrl);
        }

        // สร้างสินค้าใหม่โดยใช้ URL ของรูปภาพที่ได้รับ
        const newProduct = new Product({
            productName,
            price,
            description,
            stockQuantity,
            images: imageUrls, // ใช้ properties ชื่อ images เพื่อเก็บ URL ของรูปภาพ
            status,
            sizes: parsedSizes,
            category,
        });

        await newProduct.save();

        await Category.updateOne(
            { _id: category },
            { $push: { products: newProduct } }
        );

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

router.post('/edit-product/:productId', isLogin, isAdmin, async (req, res) => {
    try {
        const productId = req.params.productId;
        const { productName, price, description, stockQuantity, status, sizes, category } = req.body;
        
        const product = await Product.findById(productId);
        if (!product) {
            req.flash('error', 'ไม่พบสินค้าที่ต้องการแก้ไข');
            return res.redirect('/admin/productManagement');
        }

        product.productName = productName;
        product.price = price;
        product.description = description;
        product.stockQuantity = stockQuantity;
        product.status = status;
        product.sizes = sizes.split(',').map(size => size.trim());
        product.category = category;

        await product.save();

        req.flash('success', 'อัพเดตสินค้าเรียบร้อยแล้ว');
        res.redirect('/admin/productManagement');
    } catch (error) {
        req.flash('error', 'มีปัญหาการอัพเดทสินค้า');
        res.redirect('/admin/productManagement');
    }
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