export class AppError extends Error {
  constructor(message, { statusCode = 500, code = "APP_ERROR", details } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message, details) {
    super(message, {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      details
    });
  }
}

export class NotFoundError extends AppError {
  constructor(message) {
    super(message, {
      statusCode: 404,
      code: "NOT_FOUND"
    });
  }
}
