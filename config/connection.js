const mysql = require("mysql2");
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Kuttu@2312",
  database: "mydata",
});

module.exports = connection