// routes/authRoutes.js
const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');
const { sendVerificationEmail } = require('../config/mailer'); 

// Middleware to prevent logged-in users from accessing login and register pages
function preventLoggedInUsers(req, res, next) {
    if (req.cookies.user) {
        return res.redirect('/dashboard');
    }
    next();
}

// GET - Register
router.get('/register', preventLoggedInUsers, (req, res) => {
    res.render("pages/auth/register", { error: null });
});
router.get('/reverify',(req,res)=>{
    
    res.render('pages/verify/reverification',{msg:null})
})
// GET - Login
router.get('/login', preventLoggedInUsers, (req, res) => {
    res.render("pages/auth/login", { msg: null });
});

// POST - Register
router.post('/register', async (req, res) => {
    const { name, email, number, password } = req.body;

    if (!name || !email || !number || !password) {
        return res.render("pages/auth/register", { error: "All fields are required!" });
    }

    try {
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);

        if (rows.length > 0) {
            return res.render('pages/auth/register', { error: 'Email is already in use' });
        }

        const hashpwd = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString('hex'); 
        const verificationExpiry = Date.now() + 3600000;
        await db.execute("INSERT INTO users (name, email, phone, password, verification_token, verification_expiry) VALUES (?, ?, ?, ?,?,?)", [name, email, number, hashpwd,verificationToken, verificationExpiry]);
        const verificationLink = `http://localhost:5000/verify-email/${verificationToken}`
        await sendVerificationEmail(email, verificationLink);
        
        res.render("pages/auth/login", { msg: "Registration successful. Please check your email to verify your account." });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.post('/reverify', async(req,res)=>{
    const {email} = req.body;
    if(!email){
        return res.render('pages/verify/reverification',{msg:"Please Enter a Email!"})
    }
    try {
        const [rows] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
        if (rows.length === 0) {
            return res.render('pages/verify/reverification',{msg:"Please Enter a Valid Email!"})
        }
        const user = rows[0];
        const verificationToken = crypto.randomBytes(32).toString('hex'); 
        const verificationExpiry = Date.now() + 3600000;
        await db.execute("UPDATE users SET verification_token = ?,verification_expiry = ?",[verificationToken,verificationExpiry])
        const verificationLink = `http://localhost:5000/verify-email/${verificationToken}`    
        await sendVerificationEmail(email, verificationLink);
        res.render("pages/auth/login", { msg: "Verification link has been send successfully. Please check your email to verify your account." });
    } catch (errr) {
        console.log(err);
        res.status(500).send("Server Error");
    }
})

// POST - Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.render('pages/auth/login', { msg: "All fields are required!" });
    }

    try {
        const [rows] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);

        if (rows.length === 0) {
            return res.render("pages/auth/login", { msg: "User not found!" });
        }

        const user = rows[0];
        if (!user.verify_status) {
            if(user.verification_expiry < Date.now()){
                return res.render('pages/auth/login', { msg: "Token has expired. Please reverify it again." });
            }
            return res.render("pages/auth/login", { msg: "Please verify your email first! Email has already send!" });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.render("pages/auth/login", { msg: "Incorrect password!" });
        }
        console.log(user.verify_status);
        res.cookie('user', JSON.stringify({ id: user.id, name: user.name, email: user.email,verify: user.verify_status,phone:user.phone }), {
            httpOnly: true,
            secure: false,
            maxAge: 24 * 60 * 60 * 1000
        });

        res.redirect('/dashboard');
    } catch (err) {
        console.log(err);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
