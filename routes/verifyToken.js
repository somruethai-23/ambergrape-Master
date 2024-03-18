const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.token;

    if (authHeader) {
        const token = authHeader.split(" ")[1];
        jwt.verify(token, process.env.JWT_SEC, (err, user) => {
            if (err) res.status(401).json("เกิดข้อผิดพลาดในส่วนของ Token");
            req.user = user;
            next();
        });
    } else {
        return res.status(401).json("ขออภัย คุณไม่มีสิทธิ์ใช้งาน");
    }
};

const Authorize = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.id === req.params.id || req.user.isAdmin) {
            next();
        } else {
            res.status(403).json("ขออภัย คุณไม่มีสิทธิ์ใช้งานในส่วนนี้");
        }
    });
};

const Admin = (req,res,next) => {
    verifyToken(req, res, () => {
        if (req.user.isAdmin) {
            next();
        } else {
            res.status(403).json("ขออภัย คุณไม่ใช่แอดมิน คุณจึงไม่มีสิทธิ์ในส่วนนี้");
        }
    });
}

module.exports = { verifyToken, Authorize, Admin };