const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');

async function calculateMonthlyEarnings() {
    try {
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0);

        const monthlyOrders = await Order.find({
            createdAt: {
                $gte: startOfMonth,
                $lte: endOfMonth,
            },
            orderStatus: 'จัดส่ง'
        });

        const monthlyEarnings = monthlyOrders.reduce((total, order) => {
            return total + (order.totalCost || 0);
        }, 0);

        return [monthlyEarnings];
    } catch (error) {
        console.error('Error in calculating monthly earnings:', error);
        throw error;
    }
}


async function calculateAnnualEarnings() {
    try {
        const currentDate = new Date();
        const year = currentDate.getFullYear();

        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31);

        const annualOrders = await Order.find({
            createdAt: {
                $gte: startOfYear,
                $lte: endOfYear,
            },
            orderStatus: 'จัดส่ง'
        });

        const annualEarnings = annualOrders.reduce((total, order) => {
            return total + (order.totalCost || 0) ;
        }, 0);

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
                total: { $sum: { $add: ["$totalCost"] } }
            }
        },
        {
            $sort: { "_id.year": 1, "_id.month": 1 }
        }
    ];

    const result = await Order.aggregate(pipeline);

    const monthlyEarnings = result.reduce((acc, curr) => {
        const month = curr._id.month - 1;
        acc[month] = curr.total;
        return acc;
    }, new Array(12).fill(0));

    return monthlyEarnings;
}

async function bestSellingAll() {
    try {
        const result = await Order.aggregate([
            {
                $match: { 
                    orderStatus: 'จัดส่ง' 
                }
            },
            { $unwind: "$items" }, 
            { $unwind: "$items.size" }, 
            {
                $group: {
                    _id: {
                        product: "$items.product", 
                        size: "$items.size"
                    },
                    totalSold: { $sum: "$items.quantity" } 
                }
            },
            { $sort: { totalSold: -1 } },  
            { $limit: 10 }, 
            {
                $lookup: {
                    from: "products", 
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
                    category: { $first: "$productDetails.category" } 
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
    
    const diffInMs = now - registrationDate;
    
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    const years = Math.floor(diffInDays / 365);
    const months = Math.floor((diffInDays % 365) / 30);
    const days = diffInDays % 30;
    
    return `${years} ปี ${months} เดือน ${days} วัน`;
}

async function newUserPerMonth() {
    const newUsersCountByMonth = Array(12).fill(0);

    const newUsers = await User.aggregate([
        {
            $group: {
                _id: {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" }
                },
                count: { $sum: 1 }
            }
        },
        {
            $sort: { "_id.year": 1, "_id.month": 1 }
        }
    ]);

    newUsers.forEach(user => {
        const monthIndex = user._id.month - 1;
        newUsersCountByMonth[monthIndex] = user.count;
    });

    return newUsersCountByMonth;
}


async function countNewAndReturningCustomers() {
    const customers = await User.aggregate([
        {
            $lookup: {
                from: 'orders',
                localField: '_id', 
                foreignField: 'user', 
                as: 'orderHistory' 
            }
        },
        {
            $addFields: {
                orderCount: { $size: "$orderHistory" } 
            }
        }
    ]);

    let newCustomers = 0;
    let returningCustomers = 0;

    customers.forEach(customer => {
        if (customer.orderCount <= 1) {
            newCustomers++;
        } else {
            returningCustomers++;
        }
    });

    return { newCustomers, returningCustomers };
}

module.exports = {
    calculateMonthlyEarnings,
    calculateAnnualEarnings,
    getMonthlyEarnings,
    bestSellingAll,
    calculateMembershipAge,
    newUserPerMonth,
    countNewAndReturningCustomers
};
