const UploadModel = require("../models/upload");
const path = require("path");
const CandidateModel = require("../models/candidate");
const User = require("../models/User");
const transporter = require("../utils/mailer");
const { htmlTemplate } = require("../utils/emailTemplates");

exports.getAllUnassignedCanditates = async (req, res) => {
  const search = req.query.search;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 6;
  const skip = (page - 1) * limit;

  const searchConditions = search
    ? {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
        { domain: { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } },
        { experienceYears: { $regex: search, $options: "i" } },
      ],
    }
    : {};

  // Build date range filter if provided
  const dateFilter = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) {
      dateFilter.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      // set endDate to the end of the day
      dateFilter.createdAt.$lte = new Date(
        new Date(endDate).setHours(23, 59, 59, 999)
      );
    }
  }

  const baseFilter = {
    isAssigned: false,
    status: { $ne: "rejected" },
  };

  const filter = {
    ...baseFilter,
    ...searchConditions,
    ...dateFilter,
  };

  try {
    const [registrationForms, total] = await Promise.all([
      CandidateModel.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean()
        .exec(),

      CandidateModel.countDocuments({
        ...baseFilter,
        ...searchConditions,
        ...dateFilter,
      }),
    ]);

    return res.status(200).json({
      status: true,
      data: registrationForms,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching unassigned candidates:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch unassigned candidates.",
      error: error.message,
    });
  }
};

exports.getAssignedCanditatesToMe = async (req, res) => {
  const user = req.user;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 6;
  const search = req.query.search || "";
  const skip = (page - 1) * limit;

  try {
    const query = {
      assignedTo: user._id,
      status: { $nin: ["rejected", "shortlisted"] },
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ],
    };

    const total = await CandidateModel.countDocuments(query);

    const allAssigned = await CandidateModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.status(200).json({
      status: true,
      data: allAssigned,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching assigned candidates:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch assigned candidates.",
      error: error.message,
    });
  }
};

// Shortlisted Candidates for Particular HR with Pagination and Search
exports.getShortlistedCanditatesToParticularHr = async (req, res) => {
  const user = req.user;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";

  const query = {
    assignedTo: user._id,
    status: "shortlisted",
    $or: [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { mobile: { $regex: search, $options: "i" } },
      { domain: { $regex: search, $options: "i" } },
      { status: { $regex: search, $options: "i" } },
      { experienceYears: { $regex: search, $options: "i" } },
    ],
  };

  try {
    const total = await CandidateModel.countDocuments(query);
    const allShortlisted = await CandidateModel.find(query)
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      status: true,
      data: allShortlisted,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching shortlisted candidates:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch shortlisted candidates.",
      error: error.message,
    });
  }
};
exports.getAllShortlistedCanditates = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search?.trim() || "";

    let query = { status: "shortlisted" };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
        { domain: { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } },
        { experienceYears: { $regex: search, $options: "i" } },
      ];

      const asNumber = Number(search);
      if (!isNaN(asNumber)) {
        query.$or.push({ experienceYears: asNumber });
      }
    }

    const total = await CandidateModel.countDocuments(query);

    const allShortlisted = await CandidateModel.find(query)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      status: true,
      data: allShortlisted,
      totalCount: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching shortlisted candidates:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch shortlisted candidates.",
      error: error.message,
    });
  }
};

exports.getAllAsssignedAndShortlisted = async (req, res) => {
  const user = req.user;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 6;
  const search = req.query.search || "";
  const skip = (page - 1) * limit;


  try {
    const query = {
      assignedTo: user._id,
      status: { $in: ["assigned", "shortlisted"] },
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ],
    };

    const total = await CandidateModel.countDocuments(query);

    const allAssigned = await CandidateModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.status(200).json({
      status: true,
      data: allAssigned,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching assigned candidates:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch assigned candidates.",
      error: error.message,
    });
  }
};

exports.getAllAssignedCanditates = async (req, res) => {
  const search = req.query.search?.trim();
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 6;
  const skip = (page - 1) * limit;

  // Date filter on updatedAt
  const dateFilter = {};
  if (startDate || endDate) {
    dateFilter.updatedAt = {};
    if (startDate) {
      dateFilter.updatedAt.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.updatedAt.$lte = new Date(
        new Date(endDate).setHours(23, 59, 59, 999)
      );
    }
  }

  try {
    const pipeline = [
      {
        $match: {
          isAssigned: true,
          ...dateFilter,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "assignedTo",
          foreignField: "_id",
          as: "user",
          pipeline: [
            {
              $project: {
                _id: 1,
                firstName: 1,
                lastName: 1,
                email: 1,
              },
            },
          ],
        },
      },
      { $unwind: "$user" },
    ];

    // Search filter on HR name, candidate name/email, status
    if (search) {
      const searchRegex = new RegExp(search, "i");
      console.log(searchRegex);
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: searchRegex } }, // Candidate Name
            { email: { $regex: searchRegex } }, // Candidate Email
            { status: { $regex: searchRegex } }, // Candidate Status
            { "user.firstName": { $regex: searchRegex } }, // HR First Name
            { "user.lastName": { $regex: searchRegex } }, // HR Last Name
          ],
        },
      });
    }

    // Count total filtered documents
    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await CandidateModel.aggregate(countPipeline);
    const totalCount = countResult[0]?.total || 0;

    // Apply sorting, pagination
    pipeline.push({ $sort: { updatedAt: -1 } });
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    const candidates = await CandidateModel.aggregate(pipeline);

    return res.status(200).json({
      status: true,
      data: candidates,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    console.error("Error fetching assigned candidates:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch assigned candidates.",
      error: error.message,
    });
  }
};

exports.uploadResume = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const ext = path
    .extname(req.file.originalname)
    .toLowerCase()
    .replace(".", "");

  const allowedTypes = ["pdf", "doc", "docx"];
  if (!allowedTypes.includes(ext)) {
    return res.status(400).json({ error: "Invalid file type" });
  }

  try {
    const uploadDoc = new UploadModel({
      fileName: req.file.originalname,
      fileType: ext,
      filePath: req.file.path,
    });

    await uploadDoc.save();

    res.status(200).json({
      status: true,
      file: {
        fileName: uploadDoc.fileName,
        filePath: uploadDoc.filePath,
      },
    });
  } catch (err) {
    console.error("Upload save error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.uploadConsentForm = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const { candidateId } = req.params;

  const ext = path
    .extname(req.file.originalname)
    .toLowerCase()
    .replace(".", "");
  const allowedTypes = ["pdf"];

  if (!allowedTypes.includes(ext)) {
    return res
      .status(400)
      .json({ error: "Invalid file type. Only PDF allowed." });
  }

  try {
    // Convert to base64
    const base64 = req.file.buffer.toString("base64");
    const base64Pdf = `data:application/pdf;base64,${base64}`;

    // Save to DB
    const updatedCandidate = await CandidateModel.findByIdAndUpdate(
      candidateId,
      {
        status: "shortlisted",
        consentForm: base64Pdf,
        isConsentUploaded: true,
      },
      { new: true }
    );

    res.status(200).json({
      status: true,
      message: "Consent form uploaded successfully",
      data: updatedCandidate,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.fresherRegistration = async (req, res) => {
  const {
    availability,
    degree,
    domain,
    email,
    graduationYear,
    mobile,
    name,
    poc,
    preferredLocation,
    currentLocation,
    resume,
    skills,
    dob,
  } = req.body;

  const requiredFields = {
    name,
    email,
    mobile,
    degree,
    domain,
    graduationYear,
    resume,
    availability,
    preferredLocation,
    currentLocation,
    skills,
    dob,
  };

  const missingFields = Object.entries(requiredFields)
    .filter(
      ([_, value]) =>
        !value || (typeof value === "string" && value.trim() === "")
    )
    .map(([key]) => key);

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `The following fields are required: ${missingFields.join(", ")}`,
      missingFields,
    });
  }

  try {
    const existingCandidate = await CandidateModel.findOne({
      $or: [{ email }, { mobile }],
    });

    if (
      existingCandidate &&
      existingCandidate.mobile.trim() === mobile.trim()
    ) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 2);

      if (
        existingCandidate.status === "rejected" &&
        existingCandidate.updatedAt >= sixMonthsAgo
      ) {
        return res.status(403).json({
          success: false,
          message: "You cannot apply again within 6 months of being rejected.",
        });
      }

      return res.status(400).json({
        success: false,
        message: "You have already applied.",
      });
    }

    const candidateData = {
      availability,
      degree,
      domain,
      email,
      graduationYear,
      mobile,
      name,
      poc,
      preferredLocation,
      currentLocation,
      resume,
      skills,
      dob,
      ...(poc && { assignedTo: poc, isAssigned: true }),
    };

    if (poc) {
      let user = await User.findById(poc);
      candidateData.poc = user.firstName + " " + user.lastName;
    }

    const candidate = new CandidateModel(candidateData);
    await candidate.save();

    // 📧 Send mail
    const personalizedHtml = htmlTemplate.replace(
      "{{candidateName}}",
      candidate.name
    );

    const mailOptions = {
      from: `"Andgate HR Team" <${process.env.SMTP_USER}>`,
      to: candidate.email,
      subject: "Thanks for applying to Andgate",
      text: `Dear ${candidate.name},\n\nYour application has been accepted. We will contact you soon with next steps.\n\n- Andgate HR Team`,
      html: personalizedHtml,
    };

    const info = await transporter.sendMail(mailOptions);

    if (info.rejected.length > 0) {
      return res.status(500).json({
        status: false,
        message: "Email rejected, Please provide valid Email.",
        error: `Email rejected for: ${info.rejected.join(", ")}`,
      });
    }

    return res.status(200).json({
      status: true,
      message: "Registration Successful.",
      candidateId: candidate._id,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.experiencedRegistration = async (req, res) => {
  const {
    availability,
    bondDetails,
    bondWilling,
    companiesAppliedSixMonths,
    currentCTC,
    degree,
    domain,
    email,
    expIncludingTraining,
    expectedCTC,
    experienceYears,
    foreignWork,
    graduationYear,
    individualRole,
    interviewsAttended,
    jobChangeReason,
    mobile,
    name,
    offerDetails,
    poc,
    preferredLocation,
    currentLocation,
    releventExp,
    resume,
    selfRating,
    skills,
    dob,
  } = req.body;

  const requiredFields = {
    availability,
    bondDetails,
    bondWilling,
    companiesAppliedSixMonths,
    currentCTC,
    degree,
    domain,
    email,
    expIncludingTraining,
    expectedCTC,
    experienceYears,
    foreignWork,
    graduationYear,
    individualRole,
    interviewsAttended,
    jobChangeReason,
    mobile,
    name,
    offerDetails,
    preferredLocation,
    currentLocation,
    releventExp,
    resume,
    selfRating,
    skills,
    dob,
  };

  const missingFields = [];

  for (const [field, value] of Object.entries(requiredFields)) {
    if (!value || (typeof value === "string" && value.trim() === "")) {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `The following fields are required: ${missingFields.join(", ")}`,
      missingFields,
    });
  }

  try {
    const existingCandidate = await CandidateModel.findOne({
      $or: [{ email }, { mobile }],
    });

    if (
      existingCandidate &&
      existingCandidate.mobile.trim() === mobile.trim()
    ) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 3);

      if (
        existingCandidate.status === "rejected" &&
        existingCandidate.updatedAt >= sixMonthsAgo
      ) {
        return res.status(403).json({
          success: false,
          message: "You cannot apply again within 6 months of being rejected.",
        });
      }

      return res.status(400).json({
        success: false,
        message: "You have already applied.",
      });
    }

    const candidate = new CandidateModel({
      availability,
      bondDetails,
      bondWilling,
      companiesAppliedSixMonths,
      currentCTC,
      degree,
      domain,
      email,
      expIncludingTraining,
      expectedCTC,
      experienceYears,
      foreignWork,
      graduationYear,
      individualRole,
      interviewsAttended,
      jobChangeReason,
      mobile,
      name,
      offerDetails,
      preferredLocation,
      currentLocation,
      releventExp,
      resume,
      selfRating,
      skills,
      dob,
      isExperienced: true,
    });

    if (poc) {
      try {
        const user = await User.findById(poc);
        if (user) {
          candidate.poc = `${user.firstName} ${user.lastName}`; // set full name
          candidate.assignedTo = user._id;
          candidate.isAssigned = true;
        }
      } catch (err) {
        console.error("Failed to find user for poc ID:", err);
      }
    }

    await candidate.save();

    const personalizedHtml = htmlTemplate.replace(
      "{{candidateName}}",
      candidate.name
    );

    const mailOptions = {
      from: `"Andgate HR Team" <${process.env.SMTP_USER}>`,
      to: candidate.email,
      subject: "Thanks for applying to Andgate",
      text: `Dear ${candidate.name},\n\nYour application has been accepted. We will contact you soon with next steps.\n\n- Andgate HR Team`,
      html: personalizedHtml,
    };

    const info = await transporter.sendMail(mailOptions);

    if (info.rejected.length > 0) {
      return res.status(500).json({
        status: false,
        message: "Email rejected, Please provide valid Email.",
        error: `Email rejected for: ${info.rejected.join(", ")}`,
      });
    }

    return res.status(200).json({
      status: true,
      message: "Registration Successful.",
      candidateId: candidate._id,
    });
  } catch (error) {
    console.error("Registration save error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.assignedToMe = async (req, res) => {
  const user = req.user;
  const candidateId = req.params.candidateId;

  try {
    const candidate = await CandidateModel.findOneAndUpdate(
      {
        _id: candidateId,
      },
      {
        assignedTo: user._id,
        isAssigned: true,
      },
      {
        new: true,
      }
    );

    if (!candidate) {
      return res.status(404).json({
        status: false,
        message: "Candidate not found or not assigned to you.",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Candidate updated successfully.",
      candidate,
    });
  } catch (error) {
    console.error("Error updating assigned candidate:", error);

    return res.status(500).json({
      status: false,
      message: "Failed to update assigned candidate.",
      error: error.message,
    });
  }
};

exports.statusChange = async (req, res) => {
  const candidateId = req.params.candidateId;
  const status = req.body.status;
  try {
    const candidate = await CandidateModel.findOneAndUpdate(
      { _id: candidateId },
      { status: status },
      { new: true }
    );
    if (!candidate) {
      return res.status(404).json({
        status: false,
        message: "Candidate not found or not assigned to you.",
      });
    }
    return res.status(200).json({
      status: true,
      message: "Candidate status updated successfully.",
      candidate,
    });
  } catch (error) {
    console.error("Error updating candidate status:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to update candidate status.",
      error: error.message,
    });
  }
};

exports.addRemark = async (req, res) => {
  const user = req.user;
  const candidateId = req.params.candidateId;
  const remark = req.body.remark;

  try {
    const candidate = await CandidateModel.findById(candidateId);

    if (!candidate) {
      return res.status(404).json({
        status: false,
        message: "Candidate not found or not assigned to you.",
      });
    }
    candidate.remark.push({
      title : remark,
      by: user._id,
      name: user.firstName + " " + user.lastName,
      date: new Date(),
    });

    await candidate.save();

    return res.status(200).json({
      status: true,
      message: "Candidate remark updated successfully.",
      candidate,
    });
  } catch (error) {
    console.error("Error updating candidate remark:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to update candidate remark.",
      error: error.message,
    });
  }
};

exports.getCandidateDetails = async (req, res) => {
  const { candidateId } = req.params;
  try {
    const candidate = await CandidateModel.findById(candidateId);

    if (!candidate) {
      return res.status(400).json({
        status: false,
        message: "Candidate Not available.",
      });
    }

    return res.status(200).json({
      status: true,
      data: candidate,
    });
  } catch (error) {
    console.log("Failed to get Candidates", error);
    res.status(500).json({
      status: false,
      message: "Something went wrong.",
      error: error.message,
    });
  }
};

exports.dummyRegistration = async (req, res) => {
  try {
    const {
      email,
      name,
      mobile,
      dob,
      degree,
      graduationYear,
      skills,
      currentLocation,
      preferredLocation,
      availability,
      resume,
      isDummy,
    } = req.body;

    // Check if email or mobile already exists
    const existingCandidate = await CandidateModel.findOne({
      $or: [{ email }, { mobile }],
    });

    if (existingCandidate) {
      return res.status(400).json({
        status: false,
        message:
          existingCandidate.email === email
            ? "Email already registered."
            : "Mobile number already registered.",
      });
    }

    // Create candidate
    const candidateData = await CandidateModel.create({
      email,
      name,
      mobile,
      dob,
      degree,
      graduationYear,
      skills,
      currentLocation,
      preferredLocation,
      availability,
      resume,
      isDummy: true,
    });

    return res.status(200).json({
      status: true,
      message: "Registration successful.",
    });
  } catch (error) {
    console.error("Error Registration:", error);
    return res.status(500).json({
      status: false,
      message: "Failed Registration.",
      error: error.message,
    });
  }
};

exports.getAssignedHrToCandidate = async (req, res) => {
  const { hrId } = req.params;
  try {
    const user = await User.findById(hrId).select(
      "firstName lastName email role"
    );
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "HR not found.",
      });
    }
    return res.status(200).json({
      status: true,
      data: user,
    });
  }
  catch (error) {
    console.error("Error fetching HR details:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch HR details.",
      error: error.message,
    });
  }
}
