const Job = require("../models/jobPost");
const Organization = require("../models/company");

exports.jobPost = async (req, res) => {
  try {
    const {
      title,
      location,
      organizationName,
      clientName,
      experienceMin,
      experienceMax,
      noOfPositions,
      description,
      postDate,
      endDate,
      skills,
      priority,
      status,
    } = req.body;

    if (!title || !organizationName || !location || !description) {
      return res.status(400).json({
        message:
          "Title, organization name, location, and description are required.",
      });
    }

    if (experienceMin && isNaN(experienceMin)) {
      return res
        .status(400)
        .json({ message: "experienceMin must be a number" });
    }
    if (experienceMax && isNaN(experienceMax)) {
      return res
        .status(400)
        .json({ message: "experienceMax must be a number" });
    }
    if (noOfPositions && isNaN(noOfPositions)) {
      return res
        .status(400)
        .json({ message: "noOfPositions must be a number" });
    }

    if (postDate && isNaN(Date.parse(postDate))) {
      return res.status(400).json({ message: "Invalid postDate format" });
    }
    if (endDate && isNaN(Date.parse(endDate))) {
      return res.status(400).json({ message: "Invalid endDate format" });
    }
    const allowedStatuses = ["Active", "Inactive", "On Hold", "Filled"];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Allowed values: ${allowedStatuses.join(
          ", "
        )}`,
      });
    }

    const cleanTitle = title.trim();
    const cleanOrganizationName = organizationName.trim();
    const cleanLocation = location.trim();

    // ✅ Check if organization exists
    const org = await Organization.findOne({
      organization: cleanOrganizationName,
    });
    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // ✅ Create job
    const job = new Job({
      title: cleanTitle,
      location: cleanLocation,
      organization: org.organization,
      clientName,
      experienceMin,
      experienceMax,
      noOfPositions,
      description,
      postDate,
      endDate,
      skills,
      priority,
      status,
    });

    await job.save();

    res.status(201).json({
      message: "Job posted successfully",
      job,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.getJobs = async (req, res) => {
  try {
    const { searchTerm, location, organization,experience, page = 1, limit = 10 } = req.query;

    let filter = {};

    if (location) {
      filter.location = { $regex: location, $options: "i" };
    }

    if (organization) filter.organization = organization.trim();

          // Experience filter (minimum experience based on the selected option)
    if (experience && experience !== "All") {
      const minExp = parseInt(experience, 10);
      
      // Adjust the filter to match jobs with experience greater than or equal to minExp
      filter.experienceMin = { $gte: minExp };
    }

    if (searchTerm) {
      filter.$or = [
        { title: { $regex: searchTerm, $options: "i" } },
        { location: { $regex: searchTerm, $options: "i" } },
        { priority: { $regex: searchTerm, $options: "i" } },
        { status: { $regex: `^${searchTerm}$`, $options: "i" } },
      ];
    }

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const totalJobs = await Job.countDocuments(filter);

    const jobs = await Job.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .populate(
        "candidates.candidate",
        "name email mobile skills experienceYears resume"
      )
      .populate("candidates.addedByHR", "firstName lastName email role");

    res.status(200).json({
      totalJobs,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalJobs / limitNumber),
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.addCandidatesToJob = async (req, res) => {
  try {
    const { jobId } = req.params; // jobId from URL
    const { candidates, hrId } = req.body; // from POST body

    // Validate input
    if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
      return res
        .status(400)
        .json({ message: "candidates must be a non-empty array" });
    }
    if (!hrId) {
      return res.status(400).json({ message: "hrId is required" });
    }

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });

    let added = [];
    let skipped = [];

    candidates.forEach((candidateId) => {
      const alreadyAdded = job.candidates.some(
        (c) => c.candidate.toString() === candidateId
      );

      if (alreadyAdded) {
        skipped.push(candidateId); // already in job
      } else {
        job.candidates.push({
          candidate: candidateId,
          addedByHR: hrId,
        });
        added.push(candidateId);
      }
    });

    await job.save();

    res.status(200).json({
      message: "Candidates processed",
      addedCount: added.length,
      skippedCount: skipped.length,
      added,
      skipped,
      job,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
