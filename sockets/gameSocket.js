const WebSocket = require("ws");
const Game = require("../models/Game");
const User = require("../models/User");
const Question = require("../models/Question");

module.exports = (wss) => {
  const rooms = {}; // Object to store game-specific connections, using gameId as the key

  wss.on("connection", (ws) => {
    console.log("New player connected");

    ws.on("message", async (message) => {
      try {
        const { eventType, data } = JSON.parse(message);

        if (!eventType) {
          console.error("eventType is missing from the message:", message);
          return;
        }

        if (eventType === "Game") {
          const { gameType, userId } = data;

          console.log("Received Game event with data:", data);
          console.log("Searching for an opponent...");
          let game = await Game.findOne({
            status: "waiting",
            gameType: gameType,
            players: { $size: 1 },
          });

          let gameId;
          if (game) {
            console.log("Opponent found. Joining game:", game._id);
            gameId = game._id;
            ws.send(JSON.stringify({ eventType: "gameDetail", data: { game_id: gameId } }));
            game.players.push(userId);
            game.status = "in-progress";
            await game.save();

            // Ensure gameId exists in rooms, and add the client (ws) to the room's array
            if (!rooms[gameId]) rooms[gameId] = [];
            rooms[gameId].push(ws); // Adding player to the room's array

            console.log("Game updated to in-progress. Fetching player details...");
            const players = await Promise.all(
              game.players.map(async (playerId) => {
                const player = await User.findById(playerId);
                return {
                  userId: player._id,
                  username: player.username,
                  profileImageUrl: player.profileImageUrl,
                };
              })
            );

            console.log("Players fetched. Sending gameStarted event...");
            const response = {
              eventType: "gameStarted",
              data: {
                message: `${userId} has joined the game!`,
                players: players,
                gameId: game._id,
              },
            };

            broadcastToRoom(gameId, JSON.stringify(response)); // Broadcast only to players in the game room
            console.log("gameStarted event sent successfully.");
          } else {
            console.log("No opponent found. Creating a new game...");
            const newGame = new Game({
              players: [userId],
              gameType: gameType,
              status: "waiting",
              startTime: new Date(),
            });

            gameId = newGame._id;
            ws.send(JSON.stringify({ eventType: "gameDetail", data: { game_id: gameId } }));

            await newGame.save();
            console.log("New game created with ID:", gameId);

            // Ensure gameId exists in rooms, and add the client (ws) to the room's array
            if (!rooms[gameId]) rooms[gameId] = [];
            rooms[gameId].push(ws); // Adding player to the room's array
          }
        } else if (eventType.endsWith("_servering")) {
          const { gameId, userID, point, category, text } = data;
          const response = { event: gameId + "_pointsUpdate", data: { userID, point, category, text } };
          sendToRoom(gameId, JSON.stringify(response), ws); // Send update to the room
        } else if (eventType.endsWith("_sync_server")) {
          const { gameId, whiteBallPosition, cuePosition, cueRotation } = data;
          broadcastToRoom(
            gameId,
            JSON.stringify({ event: gameId + "_sync_client", data: { whiteBallPosition, cuePosition, cueRotation } }),
            ws // Broadcast sync to all in the room
          );
        } else if (eventType.endsWith("_shoot_sync_server")) {
          const { gameId, whiteBallPosition, cuePosition, cueRotation, power } = data;
          broadcastToRoom(
            gameId,
            JSON.stringify({ event: gameId + "_shoot_client", data: { whiteBallPosition, cuePosition, cueRotation, power } }),
            ws // Broadcast shoot sync to all in the room
          );
        } else if (eventType === "categoryChoosedByUser") {
          const { gameID, categoryName } = data;
          const game = await Game.findById(gameID);
          game.categoryTurn = game.categoryTurn === game.players[0] ? game.players[1] : game.players[0];
          game.currentCategory = categoryName;
          await game.save();

          Question.aggregate([{ $match: { category: categoryName } }, { $sample: { size: 3 } }])
            .then((questions) => {
              broadcastToRoom(
                gameID,
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
        } else if (eventType === "updateGameState") {
          broadcastToRoom(
            data.gameId,
            JSON.stringify({
              event: "updateGameState",
              data: { playerId: data.playerId, points: data.points },
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
      removeFromRooms(ws); // Ensure cleanup of disconnected players
    });
  });

  // Broadcast message to all clients in the specified game room
  function broadcastToRoom(gameId, message, sender = null) {
    if (!rooms[gameId]) return;
    console.log(rooms[gameId]); // Check the room contents
    rooms[gameId].forEach((client) => {
      if (client !== sender && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Send message to the specified room but only to the sender
  function sendToRoom(gameId, message, sender) {
    if (!rooms[gameId]) return;
    if (sender && sender.readyState === WebSocket.OPEN) {
      sender.send(message);
    }
  }

  // Clean up disconnected players
  function removeFromRooms(ws) {
    for (const gameId in rooms) {
      if (rooms[gameId].includes(ws)) {
        rooms[gameId] = rooms[gameId].filter(client => client !== ws); // Remove player from room
        if (rooms[gameId].length === 0) {
          delete rooms[gameId]; // Delete room if empty
        }
      }
    }
  }
};