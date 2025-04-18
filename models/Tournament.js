const mongoose = require("mongoose");

const TournamentSchema = new mongoose.Schema({
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  gameType: String,
  games: [{ type: mongoose.Schema.Types.ObjectId, ref: "Game" }],
  status: {
    type: String,
    enum: ["waiting", "in-progress", "completed"],
    default: "waiting",
  },
  startTime: Date,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Tournament", TournamentSchema);
