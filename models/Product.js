const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        productName: {
            type: String,
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
        images: [{ 
            type: String,
        }],
        status: {
            type: String,
            enum: ["พร้อมขาย", "ไม่พร้อมขาย", "เลิกขาย"],
            default: "พร้อมขาย",
        },
        sizes: [{
            size: {
                type: String,
                required: true,
            },
            price: {
                type: Number,
                required: true,
            }
        }],       
        createdAt: {
            type: Date,
            default: Date.now
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
        },
        tags: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Tag',
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