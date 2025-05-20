const mongoose = require("mongoose");
const User = require("../models/User");
const Item = require("../models/Item");
const Friends = require("../models/Friends");
const nodemailer = require("nodemailer");
const Leaderboard = require("../models/LeaderBoard");

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

exports.email = async (data) => {
  try {
    const { email, subject, text } = data;

    // Create the transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "mahdishoorabi@gmail.com",
        pass: "rvmfdthhjryqhdaf", // use App Password (never Gmail main pass!)
      },
    });

    // Set up email data
    const mailOptions = {
      from: '"Your Game" <mahdishoorabi@gmail.com>',
      to: email,
      subject: subject,
      text: text,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    return {
      status: "success",
      message: "Email sent successfully",
    };
  } catch (error) {
    console.error("Email send error:", error);
    return {
      status: "error",
      message: "Failed to send email",
    };
  }
};

exports.friends = async (data) => {
  try {
    const { userId } = data;

    // get user
    const user = await User.findById(userId);

    if (!user) {
      return { status: "error", message: "User not found" };
    }
    // get firends
    const friends = user.friends;
    // return
    return {
      status: "success",
      message: "Friends fetched!",
      data: friends,
    };
  } catch (error) {
    console.error("Email send error:", error);
    return {
      status: "error",
      message: "Failed to send email",
    };
  }
};

exports.search = async (data) => {
  try {
    const { username } = data;

    // Search for users whose username contains the input (case-insensitive)
    const users = await User.find({
      username: { $regex: username, $options: "i" },
    }).select("username email -_id");

    // Return the search results
    return {
      status: "success",
      message: "Search results fetched!",
      data: users,
    };
  } catch (error) {
    console.error("Search error:", error);
    return {
      status: "error",
      message: "Failed to perform search",
    };
  }
};

exports.leaderboard = async (data) => {
  try {
    const { userId } = data;

    const [today, monthly, total] = await Promise.all([
      getTopPlayers(getTodayRange, userId),
      getTopPlayers(getMonthRange, userId),
      getTopPlayers(getAllTimeRange, userId),
    ]);
    // Return both leaderboard and userPlace
    return {
      status: "success",
      message: "Leaderboard fetched successfully",
      data: { today, monthly, total },
    };
  } catch (error) {
    console.error("Leaderboard error:", error);
    return {
      status: "error",
      message: "Failed to fetch leaderboard",
    };
  }
};

exports.friendsRequest = async (data) => {
  try {
    const { userId } = data;

    const friendsList = await Friends.find({ to: userId, status: "pending" })
      .populate("from", "username profileImageUrl")
      .select("from status createdAt");
    if (!friendsList.length) {
      return {
        status: "success",
        message: "No incoming friend requests found.",
        data: [],
      };
    }

    const formattedFriendsList = friendsList.map((friend) => ({
      username: friend.from.username,
      profileImageUrl: friend.from.profileImageUrl,
      status: friend.status,
      createdAt: friend.createdAt,
    }));

    // Return the friends list
    return {
      status: "success",
      message: "Friends fetched!",
      data: formattedFriendsList,
    };
  } catch (error) {
    console.error("Fetch friends error:", error);
    return {
      status: "error",
      message: "Failed to fetch friends.",
    };
  }
};

// Accept Friend Request
exports.acceptFriendRequest = async (data) => {
  try {
    const { sender, receiver } = data;

    const senderUser = await User.findOne({ username: sender });
    const receiverUser = await User.findOne({ username: receiver });

    console.log(data);

    // Check if the friend request exists (user is the "to" side)
    const friendRequest = await Friends.findOne({
      from: senderUser._id,
      to: receiverUser._id,
    });

    if (!friendRequest) {
      return {
        status: "error",
        message: "Friend request not found or already accepted.",
      };
    }

    // Update the status to accepted
    friendRequest.status = "accepted";
    await friendRequest.save();

    // add to friends array of User
    if (!receiverUser.friends.includes(senderUser.username)) {
      receiverUser.friends.push(senderUser.username);
    }

    if (!senderUser.friends.includes(receiverUser.username)) {
      senderUser.friends.push(receiverUser.username);
    }

    await receiverUser.save();
    await senderUser.save();

    return {
      status: "success",
      message: "Friend request accepted!",
    };
  } catch (error) {
    console.error("Accept friend request error:", error);
    return {
      status: "error",
      message: "Failed to accept friend request.",
    };
  }
};

// Reject Friend Request
exports.rejectFriendRequest = async (data) => {
  try {
    const { sender, receiver } = data;

    const senderUser = await User.findOne({ username: sender });
    const receiverUser = await User.findOne({ username: receiver });

    // Check if the friend request exists (user is the "to" side)
    const friendRequest = await Friends.findOne({
      from: senderUser,
      to: receiverUser,
    });

    if (!friendRequest) {
      return {
        status: "error",
        message: "Friend request not found or already rejected.",
      };
    }

    // Update the status to rejected
    friendRequest.status = "rejected";
    await friendRequest.save();

    return {
      status: "success",
      message: "Friend request rejected!",
    };
  } catch (error) {
    console.error("Reject friend request error:", error);
    return {
      status: "error",
      message: "Failed to reject friend request.",
    };
  }
};

// Helper to get start and end of today
function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// Helper to get start and end of current month
function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );
  return { start, end };
}

// Helper to get all time (no date filter)
function getAllTimeRange() {
  return { start: new Date(0), end: new Date() };
}

// Core function to get leaderboard
async function getTopPlayers(rangeFn, userId, limit = 10) {
  const { start, end } = rangeFn();

  // Aggregate top players
  const scores = await Leaderboard.aggregate([
    {
      $match: {
        date: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: "$user",
        totalScore: { $sum: "$score" },
      },
    },
    {
      $sort: { totalScore: -1 },
    },
    {
      $limit: limit,
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: "$user",
    },
    {
      $project: {
        _id: 0,
        userId: "$user._id",
        username: "$user.username",
        profileImageUrl: "$user.profileImageUrl",
        totalScore: 1,
      },
    },
  ]);

  // Get user rank among all users
  const allScores = await Leaderboard.aggregate([
    {
      $match: {
        date: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: "$user",
        totalScore: { $sum: "$score" },
      },
    },
    {
      $sort: { totalScore: -1 },
    },
  ]);

  const userRank =
    allScores.findIndex((u) => u._id.toString() === userId.toString()) + 1;

  return {
    players: scores.map(({ username, profileImageUrl }) => ({
      username,
      profileImageUrl,
    })),
    yourPosition: userRank || null,
  };
}
