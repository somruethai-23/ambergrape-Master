const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        product: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        size: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        quantity: {
            type: Number,
            required: true
        }
    }],
    totalCost: {
        type: Number,
        required: true
    },
    shippingAddress: {
        type: String,
        required: true
    },
    shippingCost: {
        type: Number,
        required: true
    },
    orderStatus: {
        type: String,
        enum: ['ยังไม่ได้ชำระ', 'รอเช็คเงินเข้า', 'กำลังแพ็คสินค้า', 'จัดส่ง' , 'ยกเลิก'],
        default: 'ยังไม่ได้ชำระ'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    slipImage: {
        type: String
    },
    cancelReason: { 
        type: String
    }
});

module.exports = mongoose.model('Order', orderSchema);
