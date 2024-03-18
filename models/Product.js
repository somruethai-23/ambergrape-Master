const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        productName: {
            type: String,
            required: true,
        },
        price: {
            type: Number,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        stockQuantity: {
            type: Number,
            required: true,
        },
        image: {
            type: String,
        },
        status: {
            type: String,
            enum: ["พร้อมขาย", "ไม่พร้อมขาย", "เลิกขาย"],
            default: "พร้อมขาย",
        },
        size: [{
            type: String,
        }],        
        createdAt: {
            type: Date,
            default: Date.now
        },
        category: {
            type: String,
        },
        tags: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Tag',
            },
        ],
        reviews: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Review',
            },
        ],
        discount: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Discount',
        },
    },
);

const Product = mongoose.model("Product", productSchema);

module.exports = Product;