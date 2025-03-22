const mongoose = require("mongoose");

const PlayerStatsSchema = new mongoose.Schema({
  player: { type: mongoose.Schema.ObjectId, ref: "User" },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
});

const LeagueSchema = new mongoose.Schema({
  leagueName: { type: String, required: true },
  players: [PlayerStatsSchema], // Player statistics within the league
  winnerPrize: { type: String, default: 'TBD' },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  status: { type: String, enum: ['active', 'finished', 'upcoming'], default: 'upcoming' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("League", LeagueSchema);
