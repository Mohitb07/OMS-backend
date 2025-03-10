const { StatusCodes } = require("http-status-codes");
const CustomError = require("./CustomError");

class UnauthorizedError extends CustomError {
  errorCode = StatusCodes.UNAUTHORIZED;
  errorType = "UNAUTHORIZED_ERROR";
  constructor(message) {
    super(message);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }

  serializeErrors() {
    return [{ message: this.message }];
  }
}

module.exports = UnauthorizedError;
