const express = require("express");
const router = express.Router();
const {
  jobPost,
  getJobs,
  addCandidatesToJob,
} = require("../controllers/jobPostController");

router.post("/jobpost", jobPost);
router.get("/getjobs", getJobs);
router.post("/addcandidatestojob/:jobId", addCandidatesToJob);

module.exports = router;
