// corsConfig.js
const devCorsOptions = {
  origin: "*", // Replace with your development frontend URL
  methods: "GET,PUT,POST,DELETE",
  allowedHeaders: "Content-Type,Authorization",
};

const prodCorsOptions = {
  origin: "https://wondrmart.netlify.app", // Replace with your production frontend URL
  methods: "GET,PUT,POST,DELETE",
  allowedHeaders: "Content-Type,Authorization",
};

module.exports = {
  development: devCorsOptions,
  production: prodCorsOptions,
};
