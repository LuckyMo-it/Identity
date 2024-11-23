const mysql = require('mysql2')
const dotenv = require('dotenv')
dotenv.config()
const pool = mysql.createPool({
    // host: process.env.mysql_host,
    // user: process.env.mysql_user,
    // password: process.env.mysql_password,
    // database:process.env.mysql_database
    host : "127.0.0.1",
    user: "root",
    password: "",
    database: "ecommerce"
}).promise()

module.exports = pool;

