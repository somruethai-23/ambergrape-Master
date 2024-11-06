require("dotenv").config();
const jwt = require("jsonwebtoken");

// สร้าง JWT ใหม่
const createSecretToken = (userId) => {
    const secretKey = process.env.JWT_SEC;
    const payload = { userId };

    // กำหนดเวลาในการหมดอายุของ token
    const token = jwt.sign(payload, secretKey, {
        expiresIn: '24h', // หมดอายุใน 1 ชั่วโมง
        algorithm: 'HS256', // ใช้ algorithm HS256
    });

    return token;
};

const decodeToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SEC);
    } catch (err) {
        return null;
    }
};

module.exports = { 
    createSecretToken,
    decodeToken
};