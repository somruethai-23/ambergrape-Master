const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
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
    country: {
        type: String,
        required: true,
    },
    isPrimary: {
        type: Boolean,
        default: true,
    },
    addressIndex: {
        type: String,
    },
});

const Address = mongoose.model("Address", addressSchema);

module.exports = Address;