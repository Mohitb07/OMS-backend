const { StatusCodes } = require("http-status-codes");
const CustomError = require("./CustomError");

class BadRequestError extends CustomError {
  errorCode = StatusCodes.BAD_REQUEST;
  errorType = "BAD_REQUEST_ERROR";
  constructor(message) {
    super(message);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }

  serializeErrors() {
    return [{ message: this.message }];
  }
}

module.exports = BadRequestError;
