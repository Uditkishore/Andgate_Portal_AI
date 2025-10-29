const express = require("express");
const router = express.Router();
const { getCandidateStats, getTeamLoad, getDomainStats } = require("../controllers/stats");

router.get("/candidates", getCandidateStats);
router.get("/teamload", getTeamLoad);
router.get("/domains", getDomainStats);

module.exports = router;