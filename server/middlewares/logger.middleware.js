// Lightweight request logger — logs each request's method, path, status code
// and duration once the response is sent. Dependency-free and sufficient for
// development / FYP scope. For production scale, swap for `morgan` or `pino-http`.

export const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ` +
        `→ ${res.statusCode} (${ms}ms)`
    );
  });

  next();
};
