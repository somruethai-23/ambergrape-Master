const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
        },
        username: {
            type: String,
            unique: true,
            maxlength: [20, 'ชื่อผู้ใช้ห้ามยาวเกิน 20 ตัวอักษร'],
        },
        password: {
            type: String,
            minlength: [8, 'รหัสผ่านควรมีอย่างน้อย 8 ตัวอักษร'],
        },        
        isAdmin: {
            type: Boolean,
            default: false,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
        orderHistory: [
            {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            },
        ],
        googleId: { type: String },
        email: { type: String },
        displayName: { type: String },
    }
);

userSchema.methods.validPassword = function (password) {
    return bcrypt.compareSync(password, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;