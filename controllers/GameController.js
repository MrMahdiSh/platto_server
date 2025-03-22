const requestCombiner = require("../utils/requestCombiner");
const GameService = require("../services/GameService");

// Helper function to handle errors
const handleError = (res, status, customMessage) => {
  const statusCode = status.status === "error" ? 400 : 500;
  res.status(statusCode).json({
    success: false,
    error: status.message,
    message: customMessage,
  });
};

exports.buy = async (req, res, next) => {
  try {
    const buyData = requestCombiner(req);
    const status = await GameService.buy(buyData);

    if (status.status === "error") {
      return handleError(res, status, "An error occurred while buying.");
    }

    res.status(201).json({
      success: true,
      data: status.item,
      message: "Bought successfully!",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "An error occurred on the server.",
    });
  }
};

exports.pay = async (req, res, next) => {
  try {
    const payData = requestCombiner(req);
    const status = await GameService.pay(payData);

    if (status.status === "error") {
      return handleError(
        res,
        status,
        "An error occurred while processing the payment."
      );
    }

    res.status(201).json({
      success: true,
      data: status.updatedValue, // Updated to match `pay` service output
      message: "Payment processed successfully!",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "An error occurred on the server.",
    });
  }
};
