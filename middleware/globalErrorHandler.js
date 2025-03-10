const CustomError = require("../errors/CustomError");

const errorHandler = (err, req, res, next) => {
  if (err instanceof CustomError) {
    return res.status(err.errorCode).send({ errors: err.serializeErrors() });
  }
  res.status(500).send({ errors: [{message:"Some error occured"}] });
};

module.exports = errorHandler;
