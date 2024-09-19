function isLogin(req, res, next) {
    if (req.user) {
        return next();
    }

    req.flash('error', 'กรุณาเข้าสู่ระบบก่อน');
    res.redirect('/auth/login')
}

function isAdmin(req, res, next) {
    if (req.user && req.user.isAdmin === true) {
        return next();
    }

    req.flash('error', 'คุณไม่มีสิทธิ์ใช้งานฟังค์ชั่นนี้');
    res.redirect('/auth/login');
}

module.exports = {
    isLogin,
    isAdmin
};