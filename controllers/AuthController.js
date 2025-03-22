const authService = require("../services/AuthServices");
const requestCombiner = require("../utils/requestCombiner");
const User = require("../models/User");

exports.signUp = async (req, res, next) => {
  try {
    const userData = requestCombiner(req);
    const user = await authService.signUpWithPhone(userData);
    res
      .status(201)
      .json({
        success: true,
        data: user,
        message: "User created successfully!",
      });
  } catch (error) {
    next(error);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { username, password } = requestCombiner(req);
    const user = await authService.loginWithPhone({ username, password });
    res
      .status(200)
      .json({ success: true, data: user, message: "Login successful!" });
  } catch (error) {
    next(error);
  }
};

exports.guest = async (req, res, next) => {
  try {
    const timestamp = new Date();
    const year = timestamp.getFullYear().toString().slice(-2);
    const month = (timestamp.getMonth() + 1).toString().padStart(2, "0");
    const day = timestamp.getDate().toString().padStart(2, "0");
    const randomString = Math.random().toString(36).substr(2, 5);
    const email = `guest_${year}${month}${day}_${randomString}@example.com`;
    const username = `guest_${year}${month}${day}_${randomString}`;

    const existingUser = await User.findOne({ username, email });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "Guest user already exists. Please try again." });
    }

    const guestUserAccount = await authService.signUpWithPhone({
      username,
      password: Math.random().toString(36).substr(2, 9),
      email,
    });

    res
      .status(201)
      .json({ success: true, data: guestUserAccount, message: "Success!" });
  } catch (error) {
    next(error);
  }
};

exports.preRegister = async (req, res, next) => {
  try {
    const { email, username } = requestCombiner(req);
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });

    if (existingUser) {
      return res.status(409).json({
        message:
          "Email or username already exists. Please try again with different credentials.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Email and username are unique.",
      code: 200,
    });
  } catch (error) {
    next(error);
  }
};
