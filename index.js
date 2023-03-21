require('dotenv').config()
const express = require("express");
const cors = require("cors");
const authRouter = require('./routes/auth')
const userRouter = require('./routes/user')

const connection = require('./services/connection')

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.urlencoded({ extended: true}));
app.use(express.json());

connection.connect(function (err) {
  if (err) {
    console.error("Error connecting to MySQL database: " + err.stack);
    return;
  }
  console.log("Connected to MySQL database.");
});

app.use(userRouter)
app.use(authRouter)

app.listen(PORT, () => {
  console.log(`listening to ${PORT}`)
})
