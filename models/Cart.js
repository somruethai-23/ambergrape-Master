const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId, 
                ref: 'Product',
                required: true,
            },
            quantity: {
                type: Number, 
                min: 1, 
                required: true,
            },
            size: {
                type: String, 
                required: true,
            },
            price: {
                type: Number, 
                required: true,
            }
        },
    ],
    totalPrice: { type: Number, default: 0 },
    totalQuantity: { type: Number, default: 0 },
}, { timestamps: true });

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
