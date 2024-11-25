const express = require('express');
const router = express.Router();
const multer = require('multer');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../config/db');
const { sendVerificationEmail } = require('../config/mailer'); 
const { log } = require('console');
const app = express() 
app.use(express.urlencoded({extended:true}))
function preventLoggedInUsers(req, res, next) {
    if (req.cookies.seller) {
        return res.redirect('/dashboard');
    }
    next();
}
function ensureSellerLoggedIn(req, res, next) {
    if (!req.cookies.seller) {
        return res.redirect('/seller/login');  
    }
    next();  
}

app.use('/seller-dashboard', ensureSellerLoggedIn);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './uploads/profile')
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, uniqueSuffix + '-' + file.originalname)
    }
  })
  
  const upload = multer({ storage: storage })

router.get('/register', preventLoggedInUsers, (req, res) => {
    res.render("pages/seller/auth/register", { msg: null });
});
router.get('/dashboard', ensureSellerLoggedIn, (req, res) => {
    const seller = JSON.parse(req.cookies.seller);
    res.render("pages/seller/dashboard", { msg: "true" });
});
router.get('/login', (req, res) => {
    res.render('pages/seller/auth/login', { msg: null });
});
router.get('/logout', (req, res) => {
    res.clearCookie('seller');
    res.redirect('/seller/login');
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.render('pages/seller/auth/login', { msg: 'All fields are required!' });
    }

    try {
        const [rows] = await db.execute('SELECT * FROM sellers WHERE email = ?', [email]);

        if (rows.length === 0) {
            return res.render('pages/seller/auth/login', { msg: 'User not found!' });
        }

        const seller = rows[0];
        const isPasswordValid = await bcrypt.compare(password, seller.password);

        if (!isPasswordValid) {
            return res.render('pages/seller/auth/login', { msg: 'Incorrect password!' });
        }

        if (!seller.verify_status) {
            return res.render('pages/seller/auth/login', { msg: 'Please verify your email first.' });
        }

        // Store seller info in a cookie (or session)
        res.cookie('seller', JSON.stringify({ seller_id: seller.seller_id, store_name: seller.store_name }), {
            httpOnly: true,
            secure: false,
            maxAge: 24 * 60 * 60 * 1000,
        });
        if (seller.store_address === null) {
            return res.render('pages/seller/auth/seller-detail',{name: seller.name,email:seller.email,phone: seller.phone,store_name: seller.store_name,img: seller.store_photo})
        }else{
            res.redirect('/seller/dashboard');
        }
    } catch (err) {
        console.log(err);
        res.status(500).send('Server Error');
    }
});
router.post('/register',upload.single("store_photo"),async(req,res)=>{
    const { name, email, password, phone, store_name,store_type} = req.body;
    const store_photo = req.file.filename ;
    if (!name || !email || !phone || !password || !store_name || !store_type) {
        return res.render('pages/seller/auth/register', { error: 'All fields are required!' });
    }
    try {
        const [rows] = await db.execute('SELECT * FROM sellers WHERE email = ?', [email]);

        if (rows.length > 0) {
            return res.render('pages/seller/auth/register', { error: 'Email is already in use' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpiry = new Date(Date.now() + 60 * 60 * 1000); 

        await db.execute(
            'INSERT INTO sellers (name, email, phone, password, store_name, store_type, store_photo, verification_token, verification_expiry) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, email, phone, hashedPassword, store_name, store_type, store_photo, verificationToken, verificationExpiry]
        );
        const verificationLink = `http://localhost:5000/seller/verify-email/${verificationToken}`;

        await sendVerificationEmail(email, verificationLink);
        
        res.render("pages/seller/auth/login", { msg: "Registration successful. Please check your email to verify your account." });

    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
    
})
router.get('/verify-email/:token', async (req, res) => {
    const { token } = req.params;

    try {
        const [rows] = await db.execute('SELECT * FROM sellers WHERE verification_token = ?', [token]);

        if (rows.length === 0) {
            return res.status(400).send('Invalid or expired verification link');
        }

        const seller = rows[0];
        const currentTime = new Date();

        if (currentTime > seller.verification_expiry) {
            return res.status(400).send('Verification link has expired');
        }

        await db.execute('UPDATE sellers SET verify_status = true WHERE seller_id = ?', [seller.seller_id]);
        res.send('Your email has been successfully verified!');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});
router.post('/update-detail', ensureSellerLoggedIn, async (req, res) => {
const { discription, address, facebook, instagram, twitter, linkedin, other } = req.body;
    const seller = JSON.parse(req.cookies.seller);
    const seller_id = seller.seller_id;

    // Check if both discription and address are empty
    if (!discription && !address) {
        return res.send('Please enter at least one social media link or description.');
    }

    try {
        // Get the current seller's data
        const [rows] = await db.execute('SELECT * FROM sellers WHERE seller_id = ?', [seller_id]);

        // Prepare the social links data
        const socialLinks = {
            facebook: facebook || null,
            instagram: instagram || null,
            twitter: twitter || null,
            linkedin: linkedin || null,
            other: other || null
        };

// Update the seller's description and address
        await db.execute('UPDATE sellers SET store_description = ?, store_address = ? WHERE seller_id = ?', 
            [discription || null, address || null, seller_id]);

        // Update the social links if provided
        await db.execute('UPDATE sellers SET social_links = ? WHERE seller_id = ?', 
            [JSON.stringify(socialLinks), seller_id]);

        // Fetch the updated seller data and render the profile page
        const user = rows[0];
         return res.render('/seller/dashboard'); // Redirecting to the dashboard

    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating seller details.');
    }
});

module.exports = router;