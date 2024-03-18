const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    products: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
    }],
    subTotal: {
        type: Number,
        required: true,
        min: 0,
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0,
    },
    orderDate: {
        type: Date,
        default: Date.now,
    },
    orderStatus: {
        type: String,
        enum: ['กำลังดำเนินการ', 'อยู่ในช่วงขนส่ง', 'รับสินค้าแล้ว', 'ยกเลิกสำเร็จ'],
        default: 'กำลังดำเนินการ',
    },
    paymentMethod: {
        type: String,
    },
    paymentStatus: {
        type: String,
        enum: ['ยังไม่ได้จ่าย', 'กำลังตรวจสอบ', 'จ่ายสำเร็จ'],
    },
    trackingNumber: {
        type: String,
    },
    notes: {
        type: String,
    },
    shippingAddress: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Address',
    },
    ShippingMethod: {
        type: String,
    },
    ShippingFee: {
        type: Number,
    },
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;