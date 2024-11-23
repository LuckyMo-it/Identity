const express = require('express');
const path = require('path');
const db = require('./config/db');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');

const app = express();
app.set("view engine", "ejs");

// Use static files like CSS, JS, etc.
app.use(express.static(path.join(__dirname, "public")));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser('mehul'));

// Middleware to prevent logged-in users from accessing login and register pages
function preventLoggedInUsers(req, res, next) {
    if (req.cookies.user) {  
        return res.redirect('/dashboard');
    }
    next();
}
// Middleware to prevent caching of sensitive pages like the dashboard
function preventCache(req, res, next) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
}

// Routes
app.get('/', (req, res) => {
    res.render("index");
});

app.get('/register', preventLoggedInUsers, (req, res) => {
    res.render("pages/auth/register", { error: null });
});

app.get("/login", preventLoggedInUsers, (req, res) => {
    res.render("pages/auth/login", { msg: null });
});

app.get('/dashboard',preventCache, (req, res) => {
    const user = req.cookies.user;  

    if (!user) {
        return res.redirect('/login');  
    }

    res.render('dashboard', { user: JSON.parse(user) });  
});

app.get('/logout', (req, res) => {
    res.clearCookie('user');
    res.redirect('/login');  
});

// POST - Register route
app.post('/register', async (req, res) => {
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

        await db.execute("INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)", [name, email, number, hashpwd]);

       
        res.render("pages/auth/login", { msg: "Registration successful. Please login." });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// POST - Login route
app.post('/login', async (req, res) => {
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
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.render("pages/auth/login", { msg: "Incorrect password!" });
        }
        
        res.cookie('user', JSON.stringify({ id: user.id, name: user.name, email: user.email }), {
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

// Start the server
app.listen(5000, () => {
    console.log("Server is running on http://localhost:5000");
});
