const Candidate = require("../models/candidate");

exports.getCandidateStats = async (req, res) => {
  try {
    const stats = await Candidate.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const formattedStats = {
      pending: 0,
      assigned: 0,
      onhold: 0,
      shortlisted: 0,
      employee: 0,
      trainee: 0,
      deployed: 0,
      rejected: 0,
    };

    stats.forEach(item => {
      if (formattedStats.hasOwnProperty(item._id)) {
        formattedStats[item._id] = item.count;
      }
    });

    // ✅ Return the complete formatted stats
    res.status(200).json(formattedStats);
  } catch (error) {
    console.error("Error fetching candidate stats:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getTeamLoad = async (req,res) => {
   try {
    const result = await Candidate.aggregate([
      {
        $match: {
          assignedTo: { $ne: null }
        }
      },
      {
        $group: {
          _id: "$assignedTo",
          candidateCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "users", // collection name in MongoDB (always lowercase plural)
          localField: "_id",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      {
        $unwind: "$userDetails"
      },
      {
        $project: {
          _id: 0,
          hrId: "$userDetails._id",
          name: { $concat: ["$userDetails.firstName", " ", "$userDetails.lastName"] },
          email: "$userDetails.email",
          role: "$userDetails.role",
          candidateCount: 1
        }
      },
      {
        $match: {
          role: "hr"
        }
      }
    ]);

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error while fetching team load stats",
      error: error.message
    });
  }
}

exports.getDomainStats = async (req, res) => {
  try {
    const domainCounts = await Candidate.aggregate([
      { $unwind: "$domain" },
      {
        $group: {
          _id: "$domain",
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          domain: "$_id",
          count: 1
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json(domainCounts);
  } catch (error) {
    console.error("Error fetching domain counts:", error);
    res.status(500).json({ error: "Server error" });
  }
};