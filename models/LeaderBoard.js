const mongoose = require("mongoose");

const leaderboardSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  score: { type: Number, required: true, default: 0 },
  date: { type: Date, required: true, default: Date.now },
});

module.exports = mongoose.model("Leaderboard", leaderboardSchema);
