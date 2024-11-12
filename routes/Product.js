const router = require("express").Router();
const Product = require("../models/Product");
const Category = require("../models/Category");
const {  isAdmin } = require("../function/setting");

// firebase Storage
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const multer = require('multer');
const { connectStorageEmulator } = require("firebase/storage");

const storage = new Storage({
    projectId: process.env.project_ID,
    credentials: JSON.parse(process.env.FIREBASE_CREDENTIALS),
});

const bucket = storage.bucket(process.env.storage_BUCKET);
const upload = multer({ storage: multer.memoryStorage() });

// --------------------------------------- Product MANAGE Page ----------------------------------------------
router.get('/productmanagement',  isAdmin, async (req,res)=>{
        const products = await Product.find().populate('category');
        return res.render('admin/manage-product', {req:req, products: products});
});

// --------------------------------------- ADD product page ----------------------------------------------
router.get('/add-product', isAdmin, async (req, res) => {
    const products = await Product.find();
    const categories = await Category.find();
    return res.render('product/productAdd', { req: req, products: products, categories: categories, layout: false });
});

router.post('/add-product', upload.array("images"), async (req, res) => {

    try {
        const { productName, price, stockQuantity, status, sizes, category, description } = req.body;

        const parsedSizes = sizes.map(sizeObj => ({
            size: sizeObj.size.trim(),
            price: parseFloat(sizeObj.price),
        }));

        const imageUrls = [];

        for (const file of req.files) {
            const imageUrl = await uploadImageToStorage(file);
            imageUrls.push(imageUrl);
        }

        const newProduct = new Product({
            productName,
            price,
            description,
            stockQuantity,
            images: imageUrls,
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
        return res.redirect('/admin/manage-product');
    } catch (error) {
        console.error(error);
        req.flash('error', 'เกิดข้อผิดพลาดในการ เพิ่มสินค้า');
        return res.redirect('/admin/manage-product');
    }
});

async function uploadImageToStorage(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject('No file uploaded');
        }

        const fileName = Date.now() + '-' + path.basename(file.originalname);
        const filePath = `productImage/${fileName}`;

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

async function deleteImageFromStorage(imageUrl) {
    const filePath = imageUrl.split('/').slice(-2).join('/');
    await bucket.file(filePath).delete();
}



// --------------------------------------- UPDATE product page ----------------------------------------------
router.get('/edit-product/:productId',  isAdmin, async (req, res) => {
    const productId = req.params.productId;

    try {
        const product = await Product.findById(productId).populate('category');
        const categories = await Category.find();

        if (!product) {
            req.flash('error', 'ไม่พบสินค้าที่ต้องการแก้ไข');
            return res.redirect('/admin/productManagement');
        }

        return res.render('product/productEdit', { req: req, product: product, categories: categories, layout: false});
    } catch (error) {
        console.error(error);
        req.flash('error', 'มีปัญหาในการแก้ไขสินค้า');
        return res.redirect('/admin/productManagement');
    }
});

router.post('/edit-product/:productId', upload.array("images"),  isAdmin, async (req, res) => {
    try {
        const productId = req.params.productId;
        const { productName, description, stockQuantity, status, sizes, category } = req.body;
        const deleteImages = req.body.deleteImages || [];

        if (!Array.isArray(sizes)) {
            console.error("sizes is not an array");
            return res.redirect('/admin/productManagement');
        }

        const filteredSizes = sizes.filter(sizeObj => sizeObj.size.trim() !== '' && sizeObj.price.trim() !== '');

        const parsedSizes = filteredSizes.map(sizeObj => ({
            size: sizeObj.size.trim(),
            price: parseFloat(sizeObj.price)
        }));

        const product = await Product.findById(productId);
        if (!product) {
            req.flash('error', 'ไม่พบสินค้าที่ต้องการแก้ไข');
            return res.redirect('/admin/productManagement');
        }

        // Delete selected images
        for (const imageUrl of deleteImages) {
            await deleteImageFromStorage(imageUrl);
            product.images = product.images.filter(image => image !== imageUrl);
        }

        product.productName = productName;
        product.description = description;
        product.stockQuantity = stockQuantity;
        product.status = status;
        product.sizes = parsedSizes;
        product.category = category;

        const newImageUrls = [];
        if (req.files) {
            for (const file of req.files) {
                const imageUrl = await uploadImageToStorage(file);
                newImageUrls.push(imageUrl);
            }
            product.images = product.images.concat(newImageUrls);
        }

        await product.save();

        req.flash('success', 'อัพเดตสินค้าเรียบร้อยแล้ว');
        return res.redirect('/admin/manage-product');
    } catch (error) {
        req.flash('error', 'มีปัญหาการอัพเดทสินค้า');
        console.error(error);
        return res.redirect('/admin/manage-product');
    }
});


// --------------------------------------- DELETE all products ----------------------------------------------
router.post('/delete-all-products',  isAdmin, async (req, res) => {
    try {
        await Product.deleteMany({});
        req.flash('success', 'ลบสินค้าทั้งหมดเรียบร้อยแล้ว');
        return res.redirect('/admin/manage-product');
    } catch (error) {
        req.flash('error', 'มีปัญหาการลบสินค้า');
        return res.redirect('/admin/manage-product');
    }
});

// --------------------------------------- DELETE product by ID ----------------------------------------------
router.post('/delete-product/:productId',  isAdmin, async (req, res) => {
    try {
        const productId = req.params.productId;
        await Product.findByIdAndDelete(productId);
        req.flash('success', 'ลบสินค้าเรียบร้อยแล้ว');
        return res.redirect('/admin/manage-product');
    } catch (error) {
        req.flash('error', 'มีปัญหาการลบสินค้า');
        console.error(error);
        return res.redirect('/admin/manage-product');
    }
});


router.get('/:productId', async (req, res) => {
    try {
        const product = await Product.findById(req.params.productId).populate('category');

        if (!product) {
            return res.status(404).send("Product not found");
        }
        const category = await Category.findById(product.category);
        if (!category) {
            return res.status(404).send("Category not found");
        }
        
        return res.render('singleProduct', { req:req ,product: product, categoryName: category.categoryName, layout: false });
    } catch (error) {
        req.flash('error', 'หาหน้าสินค้าไม่พบ');
        console.error(error);
        return res.redirect('/');
    }
});

module.exports = router;
