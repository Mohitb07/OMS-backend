// corsConfig.js
const devCorsOptions = {
  origin: "*", // Replace with your development frontend URL
  methods: "GET,PUT,POST,DELETE,PATCH",
  allowedHeaders: "Content-Type,Authorization",
};

const prodCorsOptions = {
  origin: "*", // Replace with your production frontend URL
};

module.exports = {
  development: devCorsOptions,
  production: prodCorsOptions,
};
