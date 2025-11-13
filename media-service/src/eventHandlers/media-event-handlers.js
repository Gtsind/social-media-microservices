const Media = require("../models/Media");
const { deleteMediaFromCloudinary } = require("../utils/cloudinary");
const myLogger = require("../utils/logger");

const handlePostDeleted = async (event) => {
  const { postId, mediaIds } = event;
  try {
    const mediaToDelete = await Media.find({ _id: { $in: mediaIds } }); //find all media documents whose _id is contained in the mediaIds array

    for (const media of mediaToDelete) {
      await deleteMediaFromCloudinary(media.publicId);
      await Media.findByIdAndDelete(media._id);
      myLogger.info(
        `Deleted media: ${media._id} associated with this deleted post ${postId}`
      );
    }

    myLogger.info(`Processed deletion of media for post id: ${postId}`);
  } catch (error) {
    myLogger.error(error, "Error deleting post from cloud");
  }
};

module.exports = { handlePostDeleted };
