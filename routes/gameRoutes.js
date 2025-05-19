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
router.get("/friends_requests", gameController.friendsRequests);
router.get("/friends_accept", gameController.acceptFriendRequest);
router.get("/friends_reject", gameController.rejectFriendRequest);
router.get("/friends_new", gameController.createFriendRequest);

module.exports = router;
