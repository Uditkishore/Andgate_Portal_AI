const Candidate = require("../models/candidate");

exports.searchCandidates = async (req, res) => {
  try {
    const { keyword } = req.query;

    if (!keyword || keyword.trim() === "") {
      return res.status(400).json({ message: "Keyword is required" });
    }

    // Split search into multiple keywords
    const keywords = keyword.trim().split(/\s+/); // split by spaces

    // Get only string fields from schema
    const stringFields = Object.keys(Candidate.schema.paths).filter(field => {
      const fieldType = Candidate.schema.paths[field].instance;
      return fieldType === "String";
    });

    // Build query: any keyword matches any field
    const orConditions = [];

    keywords.forEach(word => {
      stringFields.forEach(field => {
        orConditions.push({
          [field]: { $regex: word, $options: "i" }
        });
      });
    });

    const results = await Candidate.find({ $or: orConditions });

    res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });

  } catch (error) {
    console.error("Search Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};
