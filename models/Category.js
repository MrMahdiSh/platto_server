const mongoose = require("mongoose");

const Category = new mongoose.Schema({
  name: String,
  icon: String,
});

module.exports = mongoose.model("Category", Category);
