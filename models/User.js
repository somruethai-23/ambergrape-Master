const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
        },
        username: {
            type: String,
            required: true,
            unique: true,
            maxlength: 20,
        },
        password: {
            type: String,
            required: true,
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
    }
);

const User = mongoose.model("User", userSchema);

module.exports = User;