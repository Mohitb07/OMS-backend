const mysql = require("mysql2");
const connection = mysql.createConnection({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  ssl:{
    rejectUnauthorized: true
  }
});

module.exports = connection