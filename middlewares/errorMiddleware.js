module.exports = (error, req, res, next) => {
  const errorCode = error.statusCode || 500;
  const message = error.message || "Internal Server Error";
  return res.status(errorCode).json({
    success: false,
    message: message,
    code: errorCode,
  });
};