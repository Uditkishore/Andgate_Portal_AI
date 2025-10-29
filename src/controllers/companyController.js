const CompanyModel = require("../models/company");
const multer = require("multer"); // Import multer

// Setup multer storage configuration for logo upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "src/uploads/"); // Specify the folder where images will be stored
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); // Ensure file names are unique
  }
});

const upload = multer({ storage: storage });

// Modify the createCompany function to handle logo upload
exports.createCompany = async (req, res) => {
  try {
    // Handle file upload as a part of the request
    upload.single("logo")(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          status: false,
          message: "Error uploading logo.",
          error: err.message,
        });
      }

      const { organization, email, phone, address, website, industry } = req.body;
      const logo = req.file ? req.file.path : null; // Save the logo file path

      // Check if the required fields are provided
      if (!organization || !email || !phone || !address) {
        return res.status(400).json({
          status: false,
          message: "Please provide all required fields: organization, email, phone, address",
        });
      }

      // Check if the company already exists
      const existingCompany = await CompanyModel.findOne({ email });
      if (existingCompany) {
        return res.status(409).json({
          status: false,
          message: "Company with this email already exists.",
        });
      }

      // Create a new company document
      const newCompany = new CompanyModel({
        organization,
        email,
        phone,
        address,
        website,
        industry,
        logo, // Save the logo path
      });

      // Save the company to the database
      const savedCompany = await newCompany.save();

      return res.status(200).json({
        status: true,
        message: "Company created successfully",
        data: savedCompany,
      });
    });
  } catch (error) {
    console.error("Error adding company:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to add company.",
      error: error.message,
    });
  }
};

// exports.createCompany = async (req, res) => {
//     try {
//         const { organization, email, phone, address, website, industry } = req.body;

//         if (!organization || !email || !phone || !address) {
//             return res.status(400).json({
//                 status: false,
//                 message: "Please provide all required fields: organization, email, phone, address",
//             });
//         }

//         const existingCompany = await CompanyModel.findOne({ email });
//         if (existingCompany) {
//             return res.status(409).json({
//                 status: false,
//                 message: "Company with this email already exists.",
//             });
//         }

//         const newCompany = new CompanyModel({
//             organization,
//             email,
//             phone,
//             address,
//             website,
//             industry,
//         });

//         const savedCompany = await newCompany.save();

//         return res.status(200).json({
//             status: true,
//             message: "Company created successfully",
//             data: savedCompany,
//         });
//     } catch (error) {
//         console.error("Error adding company:", error);

//         return res.status(500).json({
//             status: false,
//             message: "Failed to add company.",
//             error: error.message,
//         });
//     }
// };

exports.getCompanyById = async (req, res) => {
    const { companyId } = req.params;

    try {
        const company = await CompanyModel.findById(companyId);
        if (!company) {
            return res.status(404).json({
                status: false,
                message: "Company not found",
            });
        }
        return res.status(200).json({
            status: true,
            data: company,
        });
    } catch (error) {
        console.error("Error fetching company:", error);
        return res.status(500).json({
            status: false,
            message: "Failed to fetch company.",
            error: error.message,
        });
    }
};

exports.getAllOrganizations = async (req, res) => {
    try {
        const companies = await CompanyModel.find(
            {},
            { organization: 1, email: 1, phone: 1, address: 1, website: 1, industry: 1, _id: 1 }
        ).lean();

        if (!companies || companies.length === 0) {
            return res.status(404).json({
                status: false,
                message: "No companies found",
            });
        }

        return res.status(200).json({
            status: true,
            data: companies,
        });
    } catch (error) {
        console.error("Error fetching companies:", error);
        return res.status(500).json({
            status: false,
            message: "Failed to fetch companies.",
            error: error.message,
        });
    }
};