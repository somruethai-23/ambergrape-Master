require("dotenv").config();
const jwt = require("jsonwebtoken");

const createSecretToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SEC, {
        expiresIn: 3 * 24 * 60 * 60 
    })
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
}