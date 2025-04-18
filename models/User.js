const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
    },
    profileImageUrl: {
      type: String,
      default: "default",
      trim: true,
    },
    boughtItems: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Item",
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        purchaseDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    coins: {
      type: Number,
      default: 50,
      min: [0, "Coins cannot be negative"],
    },
    bestPlace: {
      type: Number,
      default: 0,
    },
    diamonds: {
      type: Number,
      default: 0,
      min: [0, "Diamonds cannot be negative"],
    },
    secondChance: {
      type: Number,
      default: 0,
      trim: true,
      min: [0, "cannot be negative"],
    },
    peopleVotes: {
      type: Number,
      default: 0,
      trim: true,
      min: [0, "cannot be negative"],
    },
    removeTwo: {
      type: Number,
      default: 0,
      trim: true,
      min: [0, "cannot be negative"],
    },
    emojie: {
      type: Boolean,
      default: false,
    },
    chat: {
      type: Boolean,
      default: false,
    },
    friends: [
      {
        type: String,
        ref: "User",
      },
    ],
    stats: {
      tournamentsWon: {
        type: Number,
        default: 0,
        min: [0, "Tournaments Won cannot be negative"],
      },
      gamesPlayed: {
        type: Number,
        default: 0,
        min: [0, "Games played cannot be negative"],
      },
      gamesWon: {
        type: Number,
        default: 0,
        min: [0, "Games won cannot be negative"],
      },
      totalPoints: {
        type: Number,
        default: 0,
        min: [0, "Total points cannot be negative"],
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

module.exports = mongoose.model("User", userSchema);
