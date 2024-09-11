const Order = require('../models/Order');

// Function to calculate monthly earnings
async function calculateMonthlyEarnings() {
    try {
        // Get the current year and month
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // Set the start and end of the month
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0);

        // Query orders created in the current month and with status 'จัดส่ง'
        const monthlyOrders = await Order.find({
            createdAt: {
                $gte: startOfMonth,
                $lte: endOfMonth,
            },
            orderStatus: 'จัดส่ง'
        });


        // Calculate monthly earnings
        const monthlyEarnings = monthlyOrders.reduce((total, order) => {
            return total + (order.totalCost || 0) + order.shippingCost;
        }, 0);

        // Return an array with a single element (the total earnings for the month)
        return [monthlyEarnings];
    } catch (error) {
        console.error('Error in calculating monthly earnings:', error);
        throw error;
    }
}


// Function to calculate annual earnings
async function calculateAnnualEarnings() {
    try {
        // Get the current year
        const currentDate = new Date();
        const year = currentDate.getFullYear();

        // Set the start and end of the year
        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31);

        // Query orders created in the current year and with status 'จัดส่ง'
        const annualOrders = await Order.find({
            createdAt: {
                $gte: startOfYear,
                $lte: endOfYear,
            },
            orderStatus: 'จัดส่ง'
        });

        // Calculate annual earnings
        const annualEarnings = annualOrders.reduce((total, order) => {
            return total + (order.totalCost || 0) + order.shippingCost ;
        }, 0);

        // Return an array with a single element (the total earnings for the year)
        return [annualEarnings];
    } catch (error) {
        console.error('Error in calculating annual earnings:', error);
        throw error;
    }
}

async function getMonthlyEarnings() {
    const pipeline = [
        {
            $match: {  
                orderStatus: 'จัดส่ง' 
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" }
                },
                total: { $sum: { $add: ["$totalCost", "$shippingCost"] } }
            }
        },
        {
            $sort: { "_id.year": 1, "_id.month": 1 }
        }
    ];

    const result = await Order.aggregate(pipeline);

    // แปลงข้อมูลให้เป็นรูปแบบที่เหมาะสมสำหรับการส่งไปยัง Frontend
    const monthlyEarnings = result.reduce((acc, curr) => {
        const month = curr._id.month - 1; // เดือนใน JavaScript ใช้ 0-based index
        acc[month] = curr.total;
        return acc;
    }, new Array(12).fill(0));

    return monthlyEarnings;
}

async function bestSellingAll() {
    try {
        const result = await Order.aggregate([
            {
                $match: {  // เพิ่มเงื่อนไขการจัดส่ง
                    orderStatus: 'จัดส่ง'  // เฉพาะออเดอร์ที่จัดส่งแล้ว
                }
            },
            { $unwind: "$items" },  // แยกแต่ละรายการสินค้าในออเดอร์
            { $unwind: "$items.size" },  // แยกแต่ละขนาดสินค้า
            {
                $group: {
                    _id: {
                        product: "$items.product",  // กลุ่มตาม product ID
                        size: "$items.size"  // กลุ่มตามขนาด
                    },
                    totalSold: { $sum: "$items.quantity" }  // รวมจำนวนสินค้าที่ขายได้
                }
            },
            { $sort: { totalSold: -1 } },  // เรียงลำดับจากมากไปน้อย
            { $limit: 10 },  // เลือกเฉพาะ 10 อันดับแรก
            {
                $lookup: {
                    from: "products",  // เชื่อมโยงกับคอลเลกชัน Products
                    localField: "_id.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            {
                $project: {
                    productName: { $first: "$productDetails.productName" },
                    size: "$_id.size",
                    totalSold: 1,
                    category: { $first: "$productDetails.category" }  // รวมข้อมูล category
                }
            }
        ]);

        return result;
    } catch (err) {
        console.error("Error in bestSellingAll: ", err);
        throw err;
    }
}


function calculateMembershipAge(createdAt) {
    const now = new Date();
    const registrationDate = new Date(createdAt);
    
    // คำนวณความแตกต่างในมิลลิวินาที
    const diffInMs = now - registrationDate;
    
    // แปลงเป็นวัน
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    // แปลงเป็นปี, เดือน, วัน
    const years = Math.floor(diffInDays / 365);
    const months = Math.floor((diffInDays % 365) / 30);
    const days = diffInDays % 30;
    
    return `${years} ปี ${months} เดือน ${days} วัน`;
}

module.exports = {
    calculateMonthlyEarnings,
    calculateAnnualEarnings,
    getMonthlyEarnings,
    bestSellingAll,
    calculateMembershipAge
};
