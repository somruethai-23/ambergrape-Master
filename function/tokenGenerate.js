require("dotenv").config();
const jwt = require("jsonwebtoken");

module.exports.createSecretToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SEC, {
        expiresIn: 3 * 24 * 60 * 60 
    })
};

module.exports.decodeToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SEC);
    } catch (err) {
        return null;
    }
};