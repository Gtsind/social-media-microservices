require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const mediaRoutes = require("./routes/media-routes");
const errorHandler = require("./middleware/errorHandler");
const myLogger = require("./utils/logger");
const { connectRabbitMQ, consumeEvent } = require("./utils/rabbitmq");
const { handlePostDeleted } = require("./eventHandlers/media-event-handlers");

const app = express();

const PORT = process.env.PORT || 3003;
const MONGODB_URI = process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI, {
    dbName: "Microservices",
  })
  .then(() => myLogger.info("Connected to MongoDB"))
  .catch((e) => myLogger.error("MongoDB connection error", e));

app.use(cors());
app.use(helmet());
app.use(express.json());

app.use((req, res, next) => {
  myLogger.info(`Received ${req.method} request to ${req.url}`);
  myLogger.info(`Request body, ${req.body}`);
  next();
});

app.use("/api/media", mediaRoutes);
app.use(errorHandler);

async function startServer() {
  try {
    await connectRabbitMQ();
    //consume events
    await consumeEvent("post.deleted", handlePostDeleted);
    app.listen(PORT, () => {
      myLogger.info(`Media service running on port ${PORT}`);
    });
  } catch (err) {
    myLogger.error("Failed to connect to server", err);
    process.exit(1);
  }
}

startServer();

process.on("unhandledRejection", (reason, promise) => {
  myLogger.error("Unhandled rejection at", promise, "reason:", reason);
});
