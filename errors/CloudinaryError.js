const { StatusCodes } = require("http-status-codes");
const CustomError = require("./CustomError");

class CloudinaryError extends CustomError {
  errorCode = StatusCodes.INTERNAL_SERVER_ERROR;
  errorType = "CLOUDINARY_ERROR";
  constructor(message) {
    super(message);
    Object.setPrototypeOf(this, CloudinaryError.prototype);
  }

  serializeErrors() {
    return [{ message: this.message }];
  }
}

module.exports = CloudinaryError;
