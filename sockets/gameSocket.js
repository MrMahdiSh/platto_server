const WebSocket = require("ws");
const Game = require("../models/Game");
const Tournament = require("../models/Tournament");
const User = require("../models/User");
const Question = require("../models/Question");

module.exports = (wss) => {
  const rooms = {};
  const tournamentWS = {};
  const tournamentPlayers = 4;
  const gameCupCost = 5;
  const simpleGamesWinnerCoinPrize = 5;
  const simpleGamesWinnerCupPrize = 5;
  const tournamentGamesWinnerCoinsPrize = 40;
  const tournamentGamesWinnerCupPrize = 40;

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
          const { gameType, userId, targetHost = null } = data;

          ws.userId = userId;

          if (gameType != "Tournament") {
            let game;
            if (process.env.NODE_ENV === "production") {
              game = await Game.findOne({
                status: "waiting",
                gameType: gameType == "Friendly" ? targetHost : gameType,
                players: { $ne: userId },
              });
            } else {
              game = await Game.findOne({
                status: "waiting",
                gameType: gameType == "Friendly" ? targetHost : gameType,
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

              console.log("Players fetched. Sending gameStarted event...");

              // game started
              console.log(game.players.length);
              console.log(game.gameType);

              // save the game
              await game.save();

              if (
                (game.players.length == 2 && game.gameType == "Classic") ||
                (game.players.length == 2 && game.gameType == "Friendly") ||
                (game.players.length == 4 && game.gameType == "4Player")
              ) {
                const players = await Promise.all(
                  game.players.map(async (playerId) => {
                    const player = await User.findById(playerId);
                    const afterReduce = player.stats.totalPoints - gameCupCost;
                    if (afterReduce >= 0) {
                      player.stats.totalPoints -= gameCupCost;
                    } else {
                      player.stats.totalPoints = 0;
                    }
                    await player.save();
                    return {
                      userId: player._id,
                      username: player.username,
                      profileImageUrl: player.profileImageUrl,
                    };
                  })
                );
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
              // THERE IS A TOURNAMENT WAITING FOR US :)
              // Save the WS connection for later usage
              if (!tournamentWS[tournament._id])
                tournamentWS[tournament._id] = [];
              tournamentWS[tournament._id].push(ws);

              // push our self into the players
              tournament.players.push(userId);

              // Ok now if you reach the number of players, start the game and if not wait
              console.log(
                "tournomant players => " +
                  tournament.players.length +
                  "should be => " +
                  tournamentPlayers
              );
              if (tournament.players.length == tournamentPlayers) {
                // first calculate the number of the games should we create
                const firstRoundGamesCount = tournamentPlayers / 2;

                tournament.status = "in-progress";

                for (let i = 0; i < firstRoundGamesCount; i++) {
                  // CREATE THE GAME AND TELL OTHER ITS STARTED
                  // Get Players
                  const PlayerOneUser = tournament.players[i * 2];
                  const PlayerTwoUser = tournament.players[i * 2 + 1];
                  const game = new Game({
                    players: [PlayerOneUser, PlayerTwoUser],
                    gameType: gameType,
                    status: "in-progress",
                    startTime: new Date(),
                  });

                  await game.save();

                  // SEND GAME DETAIL (PREPARE USER TO JOIN GAME)
                  // send the game id to the players
                  const response = {
                    eventType: "gameDetail",
                    data: { game_id: game._id },
                  };

                  // send for first player
                  const firstPlayerWS = tournamentWS[tournament._id][i * 2];
                  firstPlayerWS.send(JSON.stringify(response));

                  // send for second one
                  const secondPlayerWS =
                    tournamentWS[tournament._id][i * 2 + 1];
                  secondPlayerWS.send(JSON.stringify(response));

                  // CREATE ROOM AND ADD GUYS TO THEM FOR SPECIFIC GAME
                  if (!rooms[game._id]) rooms[game._id] = [];
                  rooms[game._id].push(firstPlayerWS);
                  rooms[game._id].push(secondPlayerWS);

                  const players = await Promise.all(
                    tournament.players.map(async (playerId) => {
                      const player = await User.findById(playerId);
                      const afterReduce =
                        player.stats.totalPoints - gameCupCost;
                      if (afterReduce >= 0) {
                        player.stats.totalPoints -= gameCupCost;
                      } else {
                        player.stats.totalPoints = 0;
                      }
                      await player.save();
                      return {
                        userId: player._id,
                        username: player.username,
                        profileImageUrl: player.profileImageUrl,
                      };
                    })
                  );

                  const gameStartedResponse = {
                    eventType: "gameStarted",
                    data: {
                      message: `Tournament game has started!`,
                      players: players,
                      gameId: game._id,
                      tournamentId: tournament._id,
                    },
                  };

                  // SEND THE GAME STARTED MESSAGE TO THE GUYS
                  // send for first player
                  firstPlayerWS.send(JSON.stringify(gameStartedResponse));

                  // send for second one
                  secondPlayerWS.send(JSON.stringify(gameStartedResponse));

                  tournament.games.push(game._id);
                }
              }
              await tournament.save();
            } else {
              // create a new tournament
              const newTournament = new Tournament({
                players: [userId],
                gameType: gameType,
                status: "waiting",
                startTime: new Date(),
              });

              // create the first game room
              if (!tournamentWS[newTournament._id])
                tournamentWS[newTournament._id] = [];
              tournamentWS[newTournament._id].push(ws);
              // save tournament
              await newTournament.save();
            }
          }
        } else if (eventType == "tournament_user_win") {
          const { tournamentId, winnerId } = data;
          const tournament = await Tournament.findById(tournamentId);

          if (!tournament) {
            console.error("Tournament not found:", tournamentId);
            return;
          }
          // Determine the number of games that must be played
          const totalGamesRequired = tournamentPlayers - 1;

          console.log(
            `Tournament ${tournamentId} has ${tournament.games.length} games played out of ${totalGamesRequired}.`
          );

          const completedGames = await Game.countDocuments({
            _id: { $in: tournament.games },
            players: { $size: 2 },
          });

          if (completedGames >= totalGamesRequired) {
            console.log("Tournament is complete. Declaring the winner...");

            tournament.status = "completed";
            tournament.winner = winnerId;

            const winner = await User.findById(winnerId);
            if (winner) {
              winner.coins += tournamentGamesWinnerCoinsPrize;
              winner.stats.totalPoints += tournamentGamesWinnerCupPrize;
              winner.stats.tournamentsWon =
                (winner.stats.tournamentsWon || 0) + 1;
              await winner.save();
            }

            const tournamentCompleteResponse = {
              eventType: "tournamentComplete",
              data: {
                message: `Tournament is complete! Winner is ${winner.username}.`,
                winner: {
                  userId: winner._id,
                  username: winner.username,
                  profileImageUrl: winner.profileImageUrl,
                },
              },
            };

            broadcastToRoom(
              tournamentId,
              JSON.stringify(tournamentCompleteResponse)
            );
          } else {
            console.log("Checking for games with a single player waiting...");
            const singlePlayerGame = await Game.findOne({
              _id: { $in: tournament.games },
              status: "waiting",
              players: { $size: 1 },
            });

            if (singlePlayerGame) {
              // create the room
              if (!rooms[singlePlayerGame._id])
                rooms[singlePlayerGame._id] = [];
              rooms[singlePlayerGame._id].push(ws);

              console.log(
                "Found a game with a single player waiting. Joining that game."
              );
              singlePlayerGame.players.push(winnerId);
              await singlePlayerGame.save();

              ws.send(
                JSON.stringify({
                  eventType: "gameDetail",
                  data: { game_id: singlePlayerGame._id },
                })
              );

              const players = await Promise.all(
                singlePlayerGame.players.map(async (playerId) => {
                  const player = await User.findById(playerId);
                  return {
                    userId: player._id,
                    username: player.username,
                    profileImageUrl: player.profileImageUrl,
                  };
                })
              );

              const gameStartedResponse = {
                eventType: "gameStarted",
                data: {
                  message: `Tournament game has started!`,
                  players: players,
                  gameId: singlePlayerGame._id,
                  gameNumber: completedGames,
                  allGames: totalGamesRequired,
                },
              };

              broadcastToRoom(
                singlePlayerGame._id,
                JSON.stringify(gameStartedResponse)
              );
            } else {
              console.log(
                "No single player games found. Creating a new game..."
              );
              const newGame = new Game({
                players: [winnerId],
                gameType: tournament.gameType,
                status: "waiting",
                startTime: new Date(),
              });

              await newGame.save();

              tournament.games.push(newGame._id);

              await tournament.save();

              // create rooms
              if (!rooms[newGame._id]) rooms[newGame._id] = [];
              rooms[newGame._id].push(ws);

              console.log(
                "New game created for the tournament with ID:",
                newGame._id
              );

              ws.send(
                JSON.stringify({
                  eventType: "gameDetail",
                  data: { game_id: newGame._id },
                })
              );
            }
          }
        } else if (eventType == "cue_pos_sync_server") {
          const { gameId, whiteBallPosition, cuePosition, cueRotation } = data;
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
        } else if (eventType == "ball_pos_sync_server") {
          const {
            gameId,
            ballId,
            ballPosition,
            ballRotation,
            ballVelocity,
            isLast,
          } = data;
          broadcastToRoom(
            gameId,
            JSON.stringify({
              eventType: "ball_pos_sync",
              data: {
                ballId,
                ballPosition,
                ballRotation,
                ballVelocity,
                isLast,
              },
            }),
            ws
          );
        } else if (eventType == "message_server") {
          const { sender, gameId, message } = data;
          broadcastToRoom(
            gameId,
            JSON.stringify({
              eventType: "message",
              data: {
                sender,
                gameId,
                message,
              },
            }),
            ws
          );
        } else if (eventType == "friend_invitation_server") {
          const { sender, receiver, gameId } = data;
          console.log(data);
          broadcastToRoom(
            gameId,
            JSON.stringify({
              eventType: "friend_invitation",
              data: { sender, receiver, gameId },
            }),
            ws
          );
        } else if (eventType === "friend_invitation_accept_server") {
          const { sender, receiver, gameId } = data;

          const senderUser = await User.findOne({ username: sender });
          const receiverUser = await User.findOne({ username: receiver });

          if (!senderUser || !receiverUser) {
            console.log("One of the users not found");
            return;
          }

          // Prevent duplicates
          if (!receiverUser.friends.includes(senderUser.username)) {
            receiverUser.friends.push(senderUser.username);
          }

          if (!senderUser.friends.includes(receiverUser.username)) {
            senderUser.friends.push(receiverUser.username);
          }

          await receiverUser.save();
          await senderUser.save();

          broadcastToRoom(
            gameId,
            JSON.stringify({
              eventType: "friend_invitation_accept",
              data: { sender, receiver, gameId },
            }),
            ws
          );
        } else if (eventType === "play_friend_request_server") {
          const { sender, receiver, gameId } = data;
          console.log(data);
          broadcastToAll(
            JSON.stringify({
              eventType: "play_friend_request",
              data: { sender, receiver, gameId },
            })
          );
        } else if (eventType === "play_friend_request_accepted_server") {
          const { sender, receiver } = data;

          broadcastToAll(
            JSON.stringify({
              eventType: "play_friend_request_accepted",
              data: { sender, receiver },
            })
          );
        } else if (eventType === "win_server") {
          const { gameId, userName } = data;
          // find user and game
          const game = await Game.findById(gameId);
          const user = await User.findOne({ username: userName });
          if (!game) return;
          // update game
          game.winner = user._id;
          game.status = "completed";
          await game.save();
          // update user
          user.coins += simpleGamesWinnerCoinPrize;
          user.stats.totalPoints += simpleGamesWinnerCupPrize + gameCupCost;
          user.stats.gamesPlayed += 1;
          user.stats.gamesWon += 1;
          await user.save();
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

  // Send a message to all connected users
  function broadcastToAll(message) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
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
    Tournament.findOne({
      players: id,
      status: { $in: ["in-progress", "waiting"] },
    })
      .then(async (tournament) => {
        if (tournament) {
          if (tournament.status === "in-progress") {
            // tournament.status = "completed";
            // await tournament.save();
            // teh logic of when a user disconnect
          } else if (tournament.status === "waiting") {
            tournament.players = tournament.players.filter(
              (playerId) => playerId.toString() !== id.toString()
            );
            if (tournament.players.length === 0) {
              await Tournament.deleteOne({ _id: tournament._id });
            } else {
              await tournament.save();
            }
          }
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
