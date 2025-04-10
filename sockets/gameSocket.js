const WebSocket = require("ws");
const Game = require("../models/Game");
const Tournament = require("../models/Tournament");
const User = require("../models/User");
const Question = require("../models/Question");

module.exports = (wss) => {
  const rooms = {}; // Object to store game-specific connections, using gameId as the key
  const tournamentPlayers = 4;
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

          ws.userId = userId;

          if (gameType != "Tournament") {
            let game;
            if (process.env.NODE_ENV === "production") {
              game = await Game.findOne({
                status: "waiting",
                gameType: gameType,
                players: { $ne: userId },
              });
            } else {
              game = await Game.findOne({
                status: "waiting",
                gameType: gameType,
              });
            }

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
          } else {
            // search for a tournomant
            let tournament = await Tournament.findOne({
              status: "waiting",
              gameType: gameType,
            });

            if (tournament) {
              tournament.players.push(userId);
              if (!rooms[tournament._id]) rooms[tournament._id] = [];
              rooms[tournament._id].push(ws);

              if (tournament.players.count == tournamentPlayers) {
                const players = await Promise.all(
                  tournament.players.map(async (playerId) => {
                    const player = await User.findById(playerId);
                    return {
                      userId: player._id,
                      username: player.username,
                      profileImageUrl: player.profileImageUrl,
                    };
                  })
                );
              }
              await tournament.save();
            } else {
              const newTournament = new Tournament({
                players: [userId],
                gameType: gameType,
                status: "waiting",
                startTime: new Date(),
              });

              if (!rooms[newTournament._id]) rooms[newTournament._id] = [];
              rooms[newTournament._id].push(ws);
              await newTournament.save();
            }
          }
        } else if (eventType == "cue_pos_sync_server") {
          const { gameId, whiteBallPosition, cuePosition, cueRotation } = data;
          console.log(data);
          broadcastToRoom(
            gameId,
            JSON.stringify({
              eventType: "cue_pos_sync",
              data: { whiteBallPosition, cuePosition, cueRotation, gameId },
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
      // tell other ones to put them on client side
      for (const [roomId, clients] of Object.entries(rooms)) {
        const index = clients.indexOf(ws);
        if (index !== -1) {
          clients.splice(index, 1);

          if (clients.length === 0) {
            delete rooms[roomId];
            console.log(`Room ${roomId} is now empty and deleted.`);
          } else {
            // Notify remaining players
            const disconnectMessage = JSON.stringify({
              eventType: "playerDisconnected",
              data: {
                message: "A player has disconnected.",
                userId: ws.userId,
              },
            });

            clients.forEach((client) => {
              console.log("|||message sent for" + roomId);
              try {
                client.send(disconnectMessage);
              } catch (err) {
                console.error("Failed to notify client of disconnection:", err);
              }
            });
          }

          break; // Exit loop since we found the room
        }
      }
      console.log("Player disconnected");
      removeFromRooms(ws);
      userDisconnected(ws.userId);
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

  function userDisconnected(id) {
    if (!id) return;

    // Handle game disconnection
    console.log(`Checking for games involving user ${id}...`);
    Game.findOne({ players: id, status: { $in: ["in-progress", "waiting"] } })
      .then(async (game) => {
        if (game) {
          console.log(`Game found for user ${id}:`, game._id);
          if (game.status === "in-progress") {
            console.log(
              `Game ${game._id} is in-progress. Marking as completed.`
            );
            game.status = "completed";
            await game.save();
            console.log(`Game ${game._id} marked as completed.`);
          } else if (game.status === "waiting") {
            console.log(
              `Game ${game._id} is waiting. Removing user ${id} from players.`
            );
            game.players = game.players.filter(
              (playerId) => playerId.toString() !== id.toString()
            );
            if (game.players.length === 0) {
              console.log(
                `No players left in game ${game._id}. Deleting game.`
              );
              await Game.deleteOne({ _id: game._id });
              console.log(`Game ${game._id} deleted.`);
            } else {
              await game.save();
              console.log(
                `Player ${id} removed from game ${game._id}. Remaining players:`,
                game.players
              );
            }
          }
        } else {
          console.log(`No active games found for user ${id}.`);
        }
      })
      .catch((err) => {
        console.error("Error updating game status on user disconnect:", err);
      });

    // Handle tournament disconnection
    Tournament.findOne({ players: id, status: "in-progress" })
      .then(async (tournament) => {
        if (tournament) {
          // tournament.status = "completed";
          // await tournament.save();
        }
      })
      .catch((err) => {
        console.error(
          "Error updating tournament status on user disconnect:",
          err
        );
      });
  }
};
