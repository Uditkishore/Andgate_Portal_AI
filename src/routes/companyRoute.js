const express = require("express");
const router = express.Router();
const companyController = require("../controllers/companyController");
const { authMiddleware } = require("../middlewares/authMiddleware");

router.post("/create_company", authMiddleware, companyController.createCompany);
router.get("/organization/:companyId", authMiddleware, companyController.getCompanyById);
router.get("/getAllOrganizations", authMiddleware, companyController.getAllOrganizations);

module.exports = router;
