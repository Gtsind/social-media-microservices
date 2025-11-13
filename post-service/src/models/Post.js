const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    mediaIds: [
      {
        type: String,
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

//we could skip this since we have a different service for search, but this is fine too (no harm done)
postSchema.index({ content: "text" });

const Post = mongoose.model("Post", postSchema);

module.exports = Post;
