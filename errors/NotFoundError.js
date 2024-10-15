const { StatusCodes } = require("http-status-codes");
const CustomError = require("./CustomError");

class NotFoundError extends CustomError {
  errorCode = StatusCodes.NOT_FOUND;
  errorType = "NOT_FOUND_ERROR";
  constructor(message) {
    super(message);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }

  serializeErrors() {
    return [{ message: this.message}];
  }
}

module.exports = NotFoundError;
