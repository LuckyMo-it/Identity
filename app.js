const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const sellerAuthRoutes = require('./routes/sellerAuthRoutes')
const db = require('./config/db')
const app = express();

app.set("view engine", "ejs");

// Use static files like CSS, JS, etc.
app.use(express.static(path.join(__dirname, "public")));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser('mehul'));

// Middleware function
function preventLoggedInUsersOnLandingPage(req, res, next) {
    if (req.cookies.user) {
        return res.redirect('/dashboard');
    }
    next();  
}

// Routes
app.get('/', preventLoggedInUsersOnLandingPage, (req, res) => {
    res.render("index");  
});

app.use(authRoutes);        
app.use(dashboardRoutes);
app.use('/seller',sellerAuthRoutes);
app.get('/verify-email/:token', async (req, res) => {
    const { token } = req.params;
    console.log("Received token:", token); 

    if (!token) {
        return res.status(400).send('Verification token is missing.');
    }
    try {
        const [rows] = await db.execute('SELECT * FROM users WHERE verification_token = ?', [token]);

        if (rows.length === 0) {
            return res.render('pages/auth/login', { msg: "Invalid or expired token." });
        }

        const user = rows[0];
        console.log("1");
        
        // Check if the token has expired
        if (user.verification_expiry < Date.now()) {
            return res.render('pages/auth/login', { msg: "Token has expired. Please register again." });
        }
        console.log("2");
        // Token is valid, mark the user's email as verified
        await db.execute('UPDATE users SET verify_status = 1 WHERE user_id = ?', [user.user_id]);
        console.log("3");
        res.render('pages/auth/login', { msg: "Email verified successfully. Please login." });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


// Start the server
app.listen(5000, () => {
    console.log("Server is running on http://localhost:5000");
});
