const { S3Client } = require("@aws-sdk/client-s3");
const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");

const s3Client = new S3Client({
  region: process.env.AWS_REGION, // e.g., 'us-east-1'
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

const upload = multer({
  storage: multerS3({
    s3: s3Client, // Pass the correct S3Client instance
    bucket: process.env.AWS_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    acl: "public-read",
    key: function (req, file, cb) {
      cb(
        null,
        `physician-profiles/${Date.now().toString()}-${file.originalname}`
      );
    },
  }),
  fileFilter: function (req, file, cb) {
    // Optional: Reject non-image files
    checkFileType(file, cb);
  },
});

function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|gif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb("Error: Images Only!");
  }
}

module.exports = upload;
