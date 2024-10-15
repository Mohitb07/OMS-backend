class CustomError extends Error {
  errorCode;
  errorType;
  constructor(message) {
    super(message);

    if (this.constructor === CustomError) {
      throw new Error(
        "Abstract class 'CustomError' cannot be instantiated directly."
      );
    }

    Object.setPrototypeOf(this, CustomError.prototype);
  }
}

module.exports = CustomError;
