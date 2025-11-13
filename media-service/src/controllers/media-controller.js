const Media = require("../models/Media");
const { uploadMediaToCloudinary } = require("../utils/cloudinary");
const myLogger = require("../utils/logger");

const uploadMedia = async (req, res) => {
  myLogger.info("Starting media upload...");
  try {
    if (!req.file) {
      myLogger.error("No file found!");
      return res.status(400).json({
        success: false,
        message: "No file found!",
      });
    }
    const { originalname, mimeType } = req.file;
    const userId = req.user.userId;

    myLogger.info(`File details: name=${originalname}, type=${mimeType}`);
    myLogger.info("Uploading to cloudinary...");

    const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file);
    myLogger.info(
      `Cloudinary upload successful. Public ID:${cloudinaryUploadResult.public_id}`
    );

    const newlyCreatedMedia = new Media({
      publicId: cloudinaryUploadResult.public_id,
      originalName: originalname,
      mimeType,
      url: cloudinaryUploadResult.secure_url,
      userId,
    });

    await newlyCreatedMedia.save();

    res.status(201).json({
      success: true,
      mediaId: newlyCreatedMedia._id,
      url: newlyCreatedMedia.url,
      message: "Media upload is successful!",
    });
  } catch (e) {
    myLogger.error("Error when uploading media.", e);
    res.status(500).json({
      success: false,
      message: "Error when uploading media",
    });
  }
};

const getAllMedia = async (req, res) => {
  try {
    const results = await Media.find({});
    res.json({ results });
  } catch (error) {
    myLogger.error("Error fetching media.", error);
    res.status(500).json({
      success: false,
      message: "Error fetching media",
    });
  }
};

module.exports = { uploadMedia, getAllMedia };
