const { Timestamp } = require("firebase/firestore");
const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    firstname: {
        type: String,
        required: true,
    },
    lastname: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    city: {
        type: String,
        required: true,
    },
    postalCode: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
});

const Address = mongoose.model("Address", addressSchema);

module.exports = Address;