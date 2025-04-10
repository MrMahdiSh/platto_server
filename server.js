const express = require("express");
const https = require("https");
const fs = require("fs");
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

const isProduction = process.env.NODE_ENV === "production"; // Check if in production

// If in production, use HTTPS with certificates, otherwise use HTTP with port 3000
let server;

if (isProduction) {
  const options = {
    key: fs.readFileSync("/etc/letsencrypt/live/ruform.ir/privkey.pem"),
    cert: fs.readFileSync("/etc/letsencrypt/live/ruform.ir/cert.pem"),
    ca: fs.readFileSync("/etc/letsencrypt/live/ruform.ir/chain.pem"),
  };

  // Create an HTTPS server for production
  server = https.createServer(options, app).listen(3000, () => {
    console.log("Server is running on https://ruform.ir");
  });
} else {
  // Create an HTTP server for development/test (localhost)
  server = app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
  });
}

const wss = new WebSocket.Server({ server });

app.use(express.json());

app.use(authRoutes);
app.use(gameRoute);
app.use(errorMiddleware);

require("./sockets/gameSocket")(wss);

console.log(process.env.MONGODB_URI);

// MongoDB connection
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
