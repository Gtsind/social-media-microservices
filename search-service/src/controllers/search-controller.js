const Search = require("../models/Search");
const myLogger = require("../utils/logger");

const searchPostController = async (req, res) => {
  myLogger.info("Search endpoint hit...");
  try {
    const { query } = req.query;
    const results = await Search.find(
      {
        $text: { $search: query },
      },
      {
        score: { $meta: "textScore" },
      }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(10);
    res.json(results);
  } catch (error) {
    myLogger.error("Error while searching post", error);
    res.status(500).json({
      success: false,
      message: "Error while searching post",
    });
  }
};

module.exports = { searchPostController };
