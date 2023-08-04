// corsConfig.js
const devCorsOptions = {
  origin: "*", // Replace with your development frontend URL
  methods: "GET,PUT,POST,DELETE,PATCH, OPTIONS",
  allowedHeaders: "Content-Type,Authorization",
};

const prodCorsOptions = {
  origin: process.env.CLIENT_URL, // Replace with your production frontend URL
  methods: "GET,PUT,POST,DELETE,PATCH, OPTIONS",
  allowedHeaders: "Content-Type,Authorization",
  credentials: true,
};

module.exports = {
  development: devCorsOptions,
  production: prodCorsOptions,
};
