const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");

aws.config.update({
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  region: process.env.AWS_REGION,
});

const s3 = new aws.S3();

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME, // Your bucket name
    contentType: multerS3.AUTO_CONTENT_TYPE, // Automatically set file type (jpg/png)
    acl: "public-read", // MAKE FILE PUBLIC so we can view it
    key: function (req, file, cb) {
      // This defines the file name in the bucket
      // We prepend Date.now() to avoid name collisions
      cb(null, Date.now().toString() + "-" + file.originalname);
    },
  }),
  fileFilter: function (req, file, cb) {
    // Optional: Reject non-image files
    checkFileType(file, cb);
  },
});

module.exports = upload;
