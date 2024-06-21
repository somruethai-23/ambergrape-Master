const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        quantity: { type: Number, required: true }
    }],
    subTotal: { type: Number, required: true },
    totalCost: { type: Number, required: true },  // เปลี่ยน totalCost เป็น totalAmount
    orderDate: {
        type: Date,
        default: Date.now,
    },
    orderStatus: {
        type: String,
        enum: ['ยังไม่ได้ชำระ', 'รอตรวจสอบการชำระ', 'กำลังดำเนินการ', 'อยู่ในช่วงขนส่ง', 'รับสินค้าแล้ว', 'ยกเลิกสำเร็จ'],
        default: 'ยังไม่ได้ชำระ',
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
    ShippingFee: {
        type: Number,
    },
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
