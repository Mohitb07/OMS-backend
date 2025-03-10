const { StatusCodes } = require("http-status-codes");
const CustomError = require("./CustomError");

class ForbiddenError extends CustomError {
  errorCode = StatusCodes.FORBIDDEN;
  errorType = "FORBIDDEN_ERROR";
  constructor(message) {
    super(message);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }

  serializeErrors() {
    return [{ message: this.message }];
  }
}

module.exports = ForbiddenError;
