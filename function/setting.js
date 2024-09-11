function isAdmin(req, res, next) {
    if (req.user.isAdmin === true) {
        return next();
    }

    req.flash('error', 'คุณไม่มีสิทธิ์ใช้งานฟังค์ชั่นนี้');
    res.redirect('/user/login');
}

module.exports = {
    isAdmin
};