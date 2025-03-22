const mongoose = require("mongoose");
const User = require("../models/User");

exports.signUpWithPhone = async (userData) => {
  try {
    const newUser = new User(userData);
    await newUser.save();
    return newUser;
  } catch (error) {
    throw error;
  }
};

exports.loginWithPhone = async (loginData) => {
  try {
    const user = await User.findOne({ username: loginData.username });
    if (!user) {
      throw new Error("User not found");
    }

    if (user.password !== loginData.password) {
      throw new Error("Invalid credentials");
    }

    return user;
  } catch (error) {
    throw error;
  }
};
