const mongoose = require("mongoose");

const discountSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
    },
    discountPercentage: {
        type: Number,
        required: true,
        min: [0, 'ไม่สามารถใส่เลขติดลบได้ กรุณาใส่เลขระหว่าง 0 - 100 %'],
        max: [0, 'ไม่สามารถใส่เลขมากกว่า 100% ได้ กรุณาใส่เลขระหว่าง 0 - 100 %']
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
        validate: {
            validator: function (value) {
                return value >= this.startDate;
            },
            message: 'วันที่สิ้นสุดช่วงลดราคา ควรจะเป็นวันเดียวกับวันเริ่มต้น หรือ หลังวันเริ่มต้นช่วงลดราคา'
        }
    }
})

const Discount = mongoose.model("Discount", discountSchema);

module.exports = Discount;