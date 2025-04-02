const WebSocket = require("ws");
const Game = require("../models/Game");
const User = require("../models/User");
const Question = require("../models/Question");

module.exports = (wss) => {
  wss.on("connection", (ws) => {
    console.log("New player connected");

    ws.on("message", async (message) => {
      try {
        const { event, data } = JSON.parse(message);

        if (event === "Game") {
          const { gameType, userId } = data;

          console.log("Opponent found:", userId);

          let game = await Game.findOne({
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

            const [playerOne, playerTwo] = await Promise.all([
              User.findById(game.players[0]),
              User.findById(game.players[1]),
            ]);

            const response = {
              event: "gameStarted",
              data: {
                message: `${userId} has joined the game!`,
                playerOne: {
                  userId: playerOne._id,
                  profileImageUrl: playerOne.profileImageUrl,
                  username: playerOne.username,
                },
                categoryTurn: playerOne._id,
                gameId: game._id,
                playerTwo: {
                  userId: playerTwo._id,
                  profileImageUrl: playerTwo.profileImageUrl,
                  username: playerTwo.username,
                },
              },
            };

            ws.send(JSON.stringify(response));
          } else {
            const newGame = new Game({
              players: [userId],
              categoryTurn: [userId],
              gameType: gameType,
              status: "waiting",
              startTime: new Date(),
            });

            gameId = newGame._id;
            await newGame.save();
          }
        } else if (event.endsWith("_servering")) {
          const { gameId, userID, point, category, text } = data;
          const response = {
            event: gameId + "_pointsUpdate",
            data: { userID, point, category, text },
          };
          ws.send(JSON.stringify(response));
        } else if (event.endsWith("_sync_server")) {
          const { gameId, whiteBallPosition, cuePosition, cueRotation } = data;
          broadcast(
            wss,
            JSON.stringify({
              event: gameId + "_sync_client",
              data: { whiteBallPosition, cuePosition, cueRotation },
            }),
            ws
          );
        } else if (event.endsWith("_shoot_sync_server")) {
          const { gameId, whiteBallPosition, cuePosition, cueRotation, power } = data;
          broadcast(
            wss,
            JSON.stringify({
              event: gameId + "_shoot_client",
              data: { whiteBallPosition, cuePosition, cueRotation, power },
            }),
            ws
          );
        } else if (event === "categoryChoosedByUser") {
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
              broadcast(
                wss,
                JSON.stringify({
                  event: "categorySelected",
                  data: {
                    message: `${data.playerId} selected category: ${data.category}`,
                    categoryName: categoryName,
                    questions: questions,
                  },
                })
              );
            })
            .catch((err) => {
              console.error("Error fetching questions:", err);
              ws.send(JSON.stringify({ event: "error", data: "An error occurred while fetching questions." }));
            });
        } else if (event === "updateGameState") {
          broadcast(
            wss,
            JSON.stringify({
              event: "updateGameState",
              data: {
                playerId: data.playerId,
                points: data.points,
              },
            })
          );
        }
      } catch (err) {
        console.error("Error processing message:", err);
        ws.send(JSON.stringify({ event: "error", data: "An error occurred while processing your request." }));
      }
    });

    ws.on("close", () => {
      console.log("Player disconnected");
    });
  });

  function broadcast(wss, message, sender = null) {
    wss.clients.forEach((client) => {
      if (client !== sender && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
};
