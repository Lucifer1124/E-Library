const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const uploadDirectory = path.join(__dirname, "../../uploads/documents");
const allowedMimeTypes = new Set([
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const allowedExtensions = new Set([".pdf", ".txt", ".doc", ".docx"]);

fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const safeName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    cb(null, safeName);
  },
});

const fileFilter = (_req, file, cb) => {
  const extension = path.extname(file.originalname || "").toLowerCase();

  if (!allowedExtensions.has(extension) || !allowedMimeTypes.has(file.mimetype)) {
    cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "document"));
    return;
  }

  cb(null, true);
};

const uploadBookDocument = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
  fileFilter,
});

const removeUploadedDocument = async (storageName) => {
  if (!storageName) {
    return;
  }

  const filePath = path.join(uploadDirectory, storageName);

  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
};

const getDocumentFilePath = (storageName) => path.join(uploadDirectory, storageName);

module.exports = {
  allowedMimeTypes,
  getDocumentFilePath,
  removeUploadedDocument,
  uploadBookDocument,
};
