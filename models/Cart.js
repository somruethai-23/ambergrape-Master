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
                type: Number, min: 1, required: true,
            },
        },
    ],
    totalPrice: { type: Number },
    totalQuantity: { type: Number },
}, {timestamps: true});


const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
