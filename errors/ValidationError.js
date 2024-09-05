const CustomError = require("./CustomError");

class ValidationError extends CustomError {
  errorCode = 400;
  errorType = "VALIDATION_ERROR";
  property;

  constructor(message, property) {
    super(message);
    this.property = property;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  serializeErrors() {
    return [{ message: this.message, property: this.property }];
  }
}
