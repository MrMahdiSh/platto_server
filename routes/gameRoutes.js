const express = require("express");
const router = express.Router();
const gameController = require("../controllers/GameController");

// router.post("/new_game", gameController);

router.post("/buy", gameController.buy);
router.post("/pay", gameController.pay);
router.post("/send_email", gameController.email);
router.get("/friends", gameController.friends);
router.get("/search", gameController.search);
router.get("/leaderboard", gameController.leaderboard);

module.exports = router;
