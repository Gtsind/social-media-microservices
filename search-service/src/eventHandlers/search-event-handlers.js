const Search = require("../models/Search");
const myLogger = require("../utils/logger");

async function handlePostCreated(event) {
  try {
    const newSearchPost = new Search({ ...event });
    await newSearchPost.save();
    myLogger.info(
      `Search post created: ${event.postId}, ${newSearchPost._id.toString()}`
    );
  } catch (error) {
    myLogger.error(error, "Error handling post creation event");
  }
}

async function handlePostDeleted(event) {
  try {
    await Search.findOneAndDelete({ postId: event.postId });
    myLogger.info(`Search post deleted: ${event.postId}`);
  } catch (error) {
    myLogger.error(error, "Error handling post deletion event");
  }
}

module.exports = { handlePostCreated, handlePostDeleted };
