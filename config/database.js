
const mysql = require("mysql2");

const caCert = Buffer.from(process.env.CA_CERT, 'base64').toString('utf-8');

const connection = mysql.createConnection({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT,
  ssl: {
    ca: caCert,
    rejectUnauthorized: process.env.NODE_ENV === "production" ? true : false,
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
});

module.exports = connection;
