const mysql = require("mysql2");
const connection = mysql.createConnection({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  ssl: {
    rejectUnauthorized: process.env.NODE_ENV === "production" ? true : false,
  },
});

module.exports = connection;
