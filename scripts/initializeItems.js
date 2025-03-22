const mongoose = require("mongoose");
const Item = require("../models/Item");

const dbUri = "mongodb://127.0.0.1:27017/quizBaaz"; // Replace with your database name
mongoose
  .connect(dbUri)
  .then(() => console.log("Database connected successfully"))
  .catch((err) => console.error("Database connection error:", err));

async function initializeItems() {
  try {
    // Remove all existing items
    await Item.deleteMany({});
    console.log("Existing items removed successfully.");

    // Insert new items
    const items = [
      { name: "Character1", price: 500, itemType: "character" },
      { name: "Character2", price: 600, itemType: "character" },
      { name: "Character3", price: 650, itemType: "character" },
      { name: "Character4", price: 700, itemType: "character" },
      { name: "Character5", price: 720, itemType: "character" },
      { name: "Character6", price: 750, itemType: "character" },
      { name: "Character7", price: 800, itemType: "character" },
      { name: "Character8", price: 850, itemType: "character" },
      { name: "Character9", price: 900, itemType: "character" },
      { name: "Character10", price: 1000, itemType: "character" },
      { name: "500", price: 14000, itemType: "coin" },
      { name: "1000", price: 20000, itemType: "coin" },
      { name: "2000", price: 35000, itemType: "coin" },
      { name: "30", price: 14000, itemType: "diamond" },
      { name: "60", price: 20000, itemType: "diamond" },
      { name: "120", price: 35000, itemType: "diamond" },
      { name: "secondChance", price: 150, itemType: "helper" },
      { name: "peopleVotes", price: 150, itemType: "helper" },
      { name: "emojie", price: 35, itemType: "helper" },
      { name: "chat", price: 35, itemType: "emojieChat" },
    ];
    await Item.insertMany(items);
    console.log("Items initialized successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Error initializing items:", err);
    process.exit(1);
  }
}

initializeItems();
