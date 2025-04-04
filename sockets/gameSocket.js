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

        console.log(eventType);

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
          });

          let gameId;
          if (game) {
            console.log("Opponent found. Joining game:", game._id);
            gameId = game._id;
            ws.send(
              JSON.stringify({
                eventType: "gameDetail",
                data: { game_id: gameId },
              })
            );
            game.players.push(userId);

            // Ensure gameId exists in rooms, and add the client (ws) to the room's array
            if (!rooms[gameId]) rooms[gameId] = [];
            rooms[gameId].push(ws); // Adding player to the room's array

            console.log(
              "Game updated to in-progress. Fetching player details..."
            );
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

            // game started
            console.log(game.players.length);
            console.log(game.gameType);

            // save the game
            await game.save();

            if (
              (game.players.length == 2 && game.gameType == "Classic") ||
              (game.players.length == 4 && game.gameType == "4Player")
            ) {
              const response = {
                eventType: "gameStarted",
                data: {
                  message: `${userId} has joined the game!`,
                  players: players,
                  gameId: game._id,
                },
              };

              broadcastToRoom(gameId, JSON.stringify(response));

              game.status = "in-progress";

              await game.save();

              console.log("gameStarted event sent successfully.");
            }
          } else {
            console.log("No opponent found. Creating a new game...");
            const newGame = new Game({
              players: [userId],
              gameType: gameType,
              status: "waiting",
              startTime: new Date(),
            });

            gameId = newGame._id;
            ws.send(
              JSON.stringify({
                eventType: "gameDetail",
                data: { game_id: gameId },
              })
            );

            await newGame.save();
            console.log("New game created with ID:", gameId);

            // Ensure gameId exists in rooms, and add the client (ws) to the room's array
            if (!rooms[gameId]) rooms[gameId] = [];
            rooms[gameId].push(ws); // Adding player to the room's array
          }
        } else if (eventType == "sync_server") {
          const { gameId, whiteBallPosition, cuePosition, cueRotation } = data;
          broadcastToRoom(
            gameId,
            JSON.stringify({
              eventType: gameId + "_sync_client",
              data: { whiteBallPosition, cuePosition, cueRotation },
            }),
            ws // Broadcast sync to all in the room
          );
        } else if (eventType == "shoot_sync_server") {
          console.log(data);
          const { gameId, whiteBallPosition, cuePosition, cueRotation, power } =
            data;
          broadcastToRoom(
            gameId,
            JSON.stringify({
              eventType: "shoot_client",
              data: { whiteBallPosition, cuePosition, cueRotation, power },
            }),
            ws
          );
        }
      } catch (err) {
        console.error("Error processing message:", err);
        ws.send(
          JSON.stringify({
            eventType: "error",
            data: "An error occurred while processing your request.",
          })
        );
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
        rooms[gameId] = rooms[gameId].filter((client) => client !== ws); // Remove player from room
        if (rooms[gameId].length === 0) {
          delete rooms[gameId]; // Delete room if empty
        }
      }
    }
  }
};
