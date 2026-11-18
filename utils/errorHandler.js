const { ZodError } = require("zod");

const formatZodError = (error) =>
  error.issues
    .map((issue) => `${issue.path.join(".") || "request"}: ${issue.message}`)
    .join(", ");

const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const isZodError = error instanceof ZodError;
  const requestedStatus = isZodError ? 400 : error.status || error.statusCode;
  const status =
    Number.isInteger(requestedStatus) && requestedStatus >= 400 && requestedStatus < 600
      ? requestedStatus
      : 500;
  const message =
    status < 500
      ? isZodError
        ? formatZodError(error)
        : error.message || "Something went wrong"
      : "Something went wrong";

  console.error("Request failed", {
    status,
    method: req.method,
    path: `${req.baseUrl || ""}${req.path || ""}`,
    error: error.name,
  });

  return res.status(status).render("listings/error.ejs", {
    err: { status, message },
  });
};

module.exports = errorHandler;
