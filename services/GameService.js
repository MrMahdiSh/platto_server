const mongoose = require("mongoose");
const User = require("../models/User");
const Item = require("../models/Item");

exports.buy = async (data) => {
  try {
    const { itemType, itemName, buyTypeInt, price, userId } = data;

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return { status: "error", message: "User not found" };
    }

    // Check if the user has sufficient funds based on the buyTypeInt
    let balance = 0;
    let item = null;
    switch (buyTypeInt) {
      case 0: // Coins
        balance = user.coins;
        break;
      case 1: // Diamonds
        balance = user.diamonds;
        break;
      default:
        return { status: "error", message: "Invalid buy type" };
    }

    // If user doesn't have enough balance, return an error
    if (balance < price) {
      return { status: "error", message: "Insufficient funds" };
    }

    // Deduct the balance
    switch (buyTypeInt) {
      case 0:
        user.coins -= price;
        break;
      case 1:
        user.diamonds -= price;
        break;
    }

    if (itemType === "character") {
      // Find the item being purchased
      item = await Item.findOne({ name: itemName });
      if (!item) {
        return { status: "error", message: "Item not found" };
      }

      // Add the item to the user's boughtItems
      user.boughtItems.push({
        itemId: item._id,
        purchaseDate: new Date(),
        name: item.name,
      });
    }

    if (itemType === "helper") {
      switch (itemName) {
        case "secondChance":
          user.secondChance = (user.secondChance || 0) + 3; // Increment secondChance
          break;
        case "peopleVotes":
          user.peopleVotes = (user.peopleVotes || 0) + 3; // Increment peopleVotes
          break;
        case "removeTwo":
          user.removeTwo = (user.removeTwo || 0) + 3; // Increment removeTwo
          break;
        default:
          return { success: false, message: "Invalid helper name" };
      }
    }

    if (itemType === "emojieChat") {
      item = await Item.findOne({ name: itemName });
      if (!item) {
        return { status: "error", message: "Item not found" };
      }

      user.boughtItems.push({
        itemId: item._id,
        purchaseDate: new Date(),
        name: item.name,
      });

      if (itemName == "chat") {
        user.chat = true;
      }
      if (itemName == "emojie") {
        user.emojie = true;
      }
    }

    // Save the user data
    await user.save();

    return { status: "success", message: "Purchase successful", item };
  } catch (error) {
    console.error(error);
    return {
      status: "error",
      message: "An error occurred while processing the purchase",
    };
  }
};

exports.pay = async (data) => {
  try {
    const { userId, type, amount, action } = data; // action: "add" or "deduct"

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return { status: "error", message: "User not found" };
    }

    // Determine which property to modify
    let updatedValue = null;

    switch (type) {
      case "coins":
        if (action === "deduct" && user.coins < amount) {
          return { status: "error", message: "Insufficient coins" };
        }
        updatedValue =
          action === "add" ? user.coins + amount : user.coins - amount;
        user.coins = updatedValue;
        break;

      case "diamonds":
        if (action === "deduct" && user.diamonds < amount) {
          return { status: "error", message: "Insufficient diamonds" };
        }
        updatedValue =
          action === "add" ? user.diamonds + amount : user.diamonds - amount;
        user.diamonds = updatedValue;
        break;

      case "secondChance":
        updatedValue =
          action === "add"
            ? (user.secondChance || 0) + amount
            : (user.secondChance || 0) - amount;
        if (updatedValue < 0) {
          return { status: "error", message: "Insufficient second chances" };
        }
        user.secondChance = updatedValue;
        break;

      case "peopleVotes":
        updatedValue =
          action === "add"
            ? (user.peopleVotes || 0) + amount
            : (user.peopleVotes || 0) - amount;
        if (updatedValue < 0) {
          return { status: "error", message: "Insufficient people votes" };
        }
        user.peopleVotes = updatedValue;
        break;

      case "removeTwo":
        updatedValue =
          action === "add"
            ? (user.removeTwo || 0) + amount
            : (user.removeTwo || 0) - amount;
        if (updatedValue < 0) {
          return {
            status: "error",
            message: "Insufficient remove two helpers",
          };
        }
        user.removeTwo = updatedValue;
        break;

      default:
        return { status: "error", message: "Invalid type" };
    }

    // Save the updated user
    await user.save();

    return { status: "success", message: "Operation successful", updatedValue };
  } catch (error) {
    console.error(error);
    return {
      status: "error",
      message: "An error occurred",
      error: error.message,
    };
  }
};
