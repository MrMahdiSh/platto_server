const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const WebSocket = require("ws");
const authRoutes = require("./routes/authRoutes");
const gameRoute = require("./routes/gameRoutes");
require("dotenv").config();
require("./app");
const errorMiddleware = require("./middlewares/errorMiddleware");
const cors = require("cors");

const app = express();
app.use(cors());
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());

app.use(authRoutes);

app.use(gameRoute);

app.use(errorMiddleware);

require("./sockets/gameSocket")(wss);

console.log(process.env.MONGODB_URI);
// Your MongoDB connection here
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

// Start server
server.listen(3000, () => {
  console.log("Server is running on port 3000");
});
