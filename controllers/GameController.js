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

exports.email = async (req, res, next) => {
  try {
    const data = requestCombiner(req);
    const status = await GameService.email(data);

    if (status.status === "error") {
      return handleError(res, status, "An error occurred while sending email.");
    }

    res.status(201).json({
      success: true,
      data: status.updatedValue,
      message: "The operation ws successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "An error occurred on the server.",
    });
  }
};

exports.friends = async (req, res, next) => {
  try {
    const data = requestCombiner(req);
    const status = await GameService.friends(data);

    if (status.status === "error") {
      return handleError(res, status, "An error occurred while sending email.");
    }

    res.status(201).json({
      success: true,
      data: status.data,
      message: "The operation ws successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "An error occurred on the server.",
    });
  }
};

exports.search = async (req, res, next) => {
  try {
    const data = requestCombiner(req);
    const status = await GameService.search(data);

    if (status.status === "error") {
      return handleError(res, status, "An error occurred while sending email.");
    }

    res.status(201).json({
      success: true,
      data: status.data,
      message: "The operation ws successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "An error occurred on the server.",
    });
  }
};

exports.leaderboard = async (req, res, next) => {
  try {
    const data = requestCombiner(req);
    const status = await GameService.leaderboard(data);

    if (status.status === "error") {
      return handleError(
        res,
        status,
        "An error occurred while retrieving leaderboard."
      );
    }

    res.status(201).json({
      success: true,
      data: status.data,
      message: "Leaderboard retrieved successfully!",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "An error occurred on the server.",
    });
  }
};
