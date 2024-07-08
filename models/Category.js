const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
    categoryName: {
        type: String,
    },
    products: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product' }],
    shippingCost: {
        type: Number,
        default: 0,
    }
});

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;