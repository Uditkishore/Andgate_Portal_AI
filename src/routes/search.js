const express = require("express");
const router = express.Router();
const { searchCandidates } = require("../controllers/searchController");

router.get("/search", searchCandidates);

module.exports = router;