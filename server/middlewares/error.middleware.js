// Centralized error handling.
//
// `notFound`     — catches any request that matched no route (clean 404 JSON).
// `errorHandler` — the SINGLE place server-side errors are shaped into a
//                  consistent JSON response. Express recognizes it as an error
//                  handler by its four arguments, and Express 5 auto-forwards
//                  rejected promises from async handlers here.
//
// Both must be registered AFTER all routes in index.js.

export const notFound = (req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

export const errorHandler = (err, req, res, next) => {
  // Always log the full error server-side — never sent to the client.
  console.error(`[error] ${req.method} ${req.originalUrl} —`, err);

  let status = err.status || 500;
  let message = err.message || "Internal server error";
  let details;

  // Map well-known error types to clean client responses.
  if (err.name === "ValidationError") {
    // Mongoose schema validation
    status = 400;
    message = "Validation failed";
    details = Object.values(err.errors).map((e) => e.message);
  } else if (err.name === "CastError") {
    // Malformed ObjectId, bad type, etc.
    status = 400;
    message = `Invalid value for '${err.path}'`;
  } else if (err.code === 11000) {
    // MongoDB duplicate key
    status = 409;
    message = "Duplicate resource";
    details = Object.keys(err.keyValue || {});
  } else if (
    err.name === "JsonWebTokenError" ||
    err.name === "TokenExpiredError"
  ) {
    status = 401;
    message = "Invalid or expired token";
  }

  // Never leak internal error text on a 5xx.
  if (status >= 500) {
    message = "Internal server error";
    details = undefined;
  }

  const body = { message };
  if (details && details.length) body.errors = details;
  res.status(status).json(body);
};
