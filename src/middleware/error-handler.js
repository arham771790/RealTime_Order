export function notFoundHandler(request, _response, next) {
  const error = new Error(`Route not found: ${request.method} ${request.originalUrl}`);
  error.statusCode = 404;
  error.code = "ROUTE_NOT_FOUND";
  next(error);
}

export function errorHandler(error, _request, response, _next) {
  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  const message = statusCode >= 500 ? "Internal server error" : error.message;
  const errorBody = {
    message,
    code: error.code ?? "INTERNAL_SERVER_ERROR"
  };

  if (error.details) {
    errorBody.details = error.details;
  }

  response.status(statusCode).json({
    error: errorBody
  });
}
