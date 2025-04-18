const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema({
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  currentCategory: String,
  points: [
    {
      player: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      points: { type: Number, default: 0 },
    },
  ],
  categoryTurn: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
  answers: [
    {
      player: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      question: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
      answer: Number,
      isCorrect: Boolean,
    },
  ],
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  gameType: String,
  status: {
    type: String,
    enum: ["waiting", "in-progress", "completed"],
    default: "waiting",
  },
  startTime: Date,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Game", gameSchema);
