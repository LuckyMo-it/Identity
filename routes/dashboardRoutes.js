// routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();

// Middleware to prevent caching of sensitive pages like the dashboard
function preventCache(req, res, next) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
}

// GET - Dashboard
router.get('/dashboard', preventCache, (req, res) => {
    const user = req.cookies.user;

    if (!user) {
        return res.redirect('/login');
    }

    res.render('dashboard', { user: JSON.parse(user) });
});

// GET - Logout
router.get('/logout', (req, res) => {
    res.clearCookie('user');
    res.redirect('/login');
});

module.exports = router;
