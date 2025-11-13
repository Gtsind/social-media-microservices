const logger = require("../utils/logger");
const Post = require("../models/Post");
const { validateCreatePost } = require("../utils/validator");
const { invalidatePostCache } = require("../utils/invalidatePostCache");
const { publishEvent } = require("../utils/rabbitmq");

const createPost = async (req, res) => {
  logger.info("Create Post endpoint hit...");
  try {
    const { error } = validateCreatePost(req.body);
    if (error) {
      logger.warn("Validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    const { content, mediaIds } = req.body;
    const newlyCreatedPost = new Post({
      user: req.user.userId,
      content,
      mediaIds: mediaIds || [],
    });

    await newlyCreatedPost.save();
    await publishEvent("post.created", {
      postId: newlyCreatedPost._id.toString(),
      userId: newlyCreatedPost.user.toString(),
      content: newlyCreatedPost.content,
      createdAt: newlyCreatedPost.createdAt,
    });
    await invalidatePostCache(req, newlyCreatedPost._id.toString());
    logger.info(`Post created successfully: ${newlyCreatedPost}`);
    res.status(201).json({
      success: true,
      message: "Post created successfully!",
    });
  } catch (e) {
    logger.error("Error when creating post", e);
    res.status(500).json({
      success: false,
      message: "Error when creating post",
    });
  }
};

const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    const cacheKey = `posts:${page}:${limit}`;
    const cachedPosts = await req.redisClient.get(cacheKey);

    if (cachedPosts) {
      logger.info("Cache hit for all posts.");
      return res.json(JSON.parse(cachedPosts));
    }

    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const totalNumberOfPosts = await Post.countDocuments();
    const result = {
      posts,
      currentpage: page,
      totalPages: Math.ceil(totalNumberOfPosts / limit),
      totalPosts: totalNumberOfPosts,
    };
    //save in redis cache
    await req.redisClient.setex(cacheKey, 300, JSON.stringify(result));

    res.json(result);
  } catch (e) {
    logger.error("Error when getting all posts:", e);
    res.status(500).json({
      success: false,
      message: "Error getting all posts",
    });
  }
};

const getPost = async (req, res) => {
  try {
    const postId = req.params.id;
    const cacheKey = `post:${postId}`;
    const cachedPost = await req.redisClient.get(cacheKey);

    if (cachedPost) {
      logger.info(`Cache hit for ${cacheKey}`);
      return res.json(JSON.parse(cachedPost));
    }

    const postById = await Post.findById(postId);
    if (!postById) {
      return res.status(404).json({
        success: false,
        message: "Post not found!",
      });
    }

    await req.redisClient.setex(cacheKey, 3600, JSON.stringify(postById)); //Store this value under this key and automatically delete it after N seconds

    res.json(postById);
  } catch (e) {
    logger.error("Error when fetching post", e);
    res.status(500).json({
      success: false,
      message: "Error when fetching post",
    });
  }
};

const deletePost = async (req, res) => {
  try {
    const post = await Post.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!post) {
      logger.warn("No post was found!");
      return res.status(404).json({
        success: false,
        message: "Post not found!",
      });
    }

    //publish post delete method ->
    await publishEvent("post.deleted", {
      postId: post._id.toString(),
      userId: req.user.userId,
      mediaIds: post.mediaIds,
    });

    await invalidatePostCache(req, req.params.id);
    res.json({
      message: "Post deleted successfully.",
    });
  } catch (e) {
    logger.error("Error when deleting post", e);
    res.status(500).json({
      success: false,
      message: "Error when deleting post",
    });
  }
};

module.exports = { createPost, getAllPosts, getPost, deletePost };
