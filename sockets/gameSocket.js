const Game = require("../models/Game");
const User = require("../models/User");
const Question = require("../models/Question");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("New player connected:", socket.id);

    socket.on("Game", async (data) => {
      const { gameType, userId } = data;

      console.log("Opponent found:", userId);

      try {
        const game = await Game.findOne({
          status: "waiting",
          gameType: gameType,
          players: { $size: 1 },
        });

        let gameId;
        if (game) {
          gameId = game._id;
          game.players.push(userId);
          game.status = "in-progress";
          await game.save();

          socket.join(gameId.toString());
          const [playerOne, playerTwo] = await Promise.all([
            User.findById(game.players[0]),
            User.findById(game.players[1]),
          ]);

          const playerOneDetails = {
            userId: playerOne._id,
            profileImageUrl: playerOne.profileImageUrl,
            username: playerOne.username,
          };

          const playerTwoDetails = {
            userId: playerTwo._id,
            profileImageUrl: playerTwo.profileImageUrl,
            username: playerTwo.username,
          };

          io.to(gameId.toString()).emit("gameStarted", {
            message: `${userId} has joined the game!`,
            playerOne: playerOneDetails,
            categoryTurn: playerOne._id,
            gameId: game._id,
            playerTwo: playerTwoDetails,
          });
        } else {
          const newGame = new Game({
            players: [userId],
            categoryTurn: [userId],
            gameType: gameType,
            status: "waiting",
            startTime: new Date(),
          });

          gameId = newGame._id;
          const savedGame = await newGame.save();
          socket.join(savedGame._id.toString());
        }

        socket.on(gameId.toString() + "_servering", async (data) => {
          const { userID, point, category, text } = data;
          socket.emit(
            gameId.toString() + "_pointsUpdate",
            userID,
            point,
            category,
            text
          );
        });

        socket.on(gameId.toString() + "_sync_server", (data) => {
          const { whiteBallPosition, cuePosition, cueRotation } = data;

          console.log("Received sync data:", {
            whiteBallPosition,
            cuePosition,
            cueRotation,
          });

          // Broadcast the received data to other clients
          socket.broadcast.emit(gameId.toString() + "_sync_client", {
            whiteBallPosition,
            cuePosition,
            cueRotation,
          });
        });

        socket.on(gameId.toString() + "_shoot_sync_server", (data) => {
          const { whiteBallPosition, cuePosition, cueRotation, power } = data;

          console.log("Received sync data:", {
            whiteBallPosition,
            cuePosition,
            cueRotation,
            power,
          });

          // Broadcast the received data to other clients
          socket.broadcast.emit(gameId.toString() + "_shoot_client", {
            whiteBallPosition,
            cuePosition,
            cueRotation,
            power,
          });
        });
      } catch (err) {
        console.error("Error finding or creating game:", err);
        socket.emit("error", "An error occurred while managing the game.");
      }
    });

    socket.on("categoryChoosedByUser", async (data) => {
      const { gameID, categoryName } = data;
      const game = await Game.findById(gameID);
      game.categoryTurn =
        game.categoryTurn === game.players[0]
          ? game.players[1]
          : game.players[0];
      game.currentCategory = categoryName;
      await game.save();

      Question.aggregate([
        { $match: { category: categoryName } },
        { $sample: { size: 3 } },
      ])
        .then((questions) => {
          io.to(gameID).emit("categorySelected", {
            message: `${data.playerId} selected category: ${data.category}`,
            categoryName: categoryName,
            questions: questions,
          });
        })
        .catch((err) => {
          console.error("Error fetching questions:", err);
          socket.emit("error", "An error occurred while fetching questions.");
        });
    });

    socket.on("updateGameState", (data) => {
      io.to(data.gameId).emit("updateGameState", {
        playerId: data.playerId,
        points: data.points,
      });
    });

    socket.on("disconnect", () => {
      console.log("Player disconnected:", socket.id);
    });
  });
};
