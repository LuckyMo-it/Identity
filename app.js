const express = require('express')
const app = express()
const path = require('path')
const db = require('./config/db')
const bcrypt = require('bcrypt');
const { error, log } = require('console')
app.set("view engine","ejs")
app.use(express.static(path.join(__dirname, "public")))
app.use(express.json())
app.use(express.urlencoded({ extended: true }));

app.get('/',(req,res)=>{
    res.render("index")
})

app.get('/register',(req,res)=>{
    res.render("pages/auth/register",{error:null})
})


app.post('/register',async(req,res)=>{
    const {name ,email,number, password} = req.body
 
    if(!name || !email  || !number|| !password){
        return res.render("pages/auth/register",{error:"All fields are required!"})
    }
    try{
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);

        // Log the rows to see the result of the query
        console.log("Query Result: ", rows);

        // Check if the rows array is not empty
        if (rows.length > 0) {
            // If user exists, send an error message
            return res.render('register', { error: 'Email is already in use' });
        }
        console.log("2");
        const hashpwd = await bcrypt.hash(password, 10);
        console.log("3");
        await db.execute("INSERT INTO users (name,email,phone,password)VALUES(?,?,?,?)",[name,email,number,hashpwd])
        console.log("4");
        res.render("pages/auth/login",{msg:"Register done"})

    }catch(err){
        console.error(err);
        res.status(500).send('Server error');
    }
})

app.post("/login",(req,res)=>{
    
})





app.listen(5000,console.log("server is running on http://localhost:5000"))