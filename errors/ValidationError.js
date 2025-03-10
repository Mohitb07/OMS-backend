const { StatusCodes } = require("http-status-codes");
const CustomError = require("./CustomError");

class ValidationError extends CustomError {
  errorCode = StatusCodes.BAD_REQUEST;
  errorType = "VALIDATION_ERROR";
  errors;

  constructor(message, errors) {
    super(message);
    this.errors = errors;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  serializeErrors() {
    return this.errors.map((error) => ({
      message: error.message,
      property: error.property,
    }));
  }
}

module.exports = ValidationError;
