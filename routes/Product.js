const router = require("express").Router();
const Product = require("../models/Product");
const Category = require("../models/Category");
const { changeMainImage } = require("./function");

router.get('/:productId', async (req, res) => {
    try {
        const product = await Product.findById(req.params.productId);
        if (!product) {
            return res.status(404).send("Product not found");
        }
        const category = await Category.findById(product.category);
        if (!category) {
            return res.status(404).send("Category not found");
        }
        res.render('singleProduct', { req:req ,product: product, categoryName: category.categoryName, changeMainImage });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});


module.exports = router;