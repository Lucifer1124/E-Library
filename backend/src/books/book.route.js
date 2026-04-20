const express = require("express");
const {
  deleteABook,
  getAllBooks,
  getBookDocument,
  getMyBooks,
  getSingleBook,
  postABook,
  updateBook,
} = require("./book.controller");
const verifyToken = require("../middleware/verifyToken");
const { uploadBookDocument } = require("./book.upload");

const router = express.Router();
const documentUpload = uploadBookDocument.single("document");

router.get("/", getAllBooks);
router.get("/mine", verifyToken, getMyBooks);
router.get("/:id/document", verifyToken, getBookDocument);
router.get("/:id", getSingleBook);
router.post("/create-book", verifyToken, documentUpload, postABook);
router.put("/edit/:id", verifyToken, documentUpload, updateBook);
router.delete("/:id", verifyToken, deleteABook);

router.use((error, _req, res, _next) => {
  if (error?.name === "MulterError") {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "Document size must be 10MB or less." });
    }

    return res
      .status(400)
      .json({ message: "Only PDF, DOC, DOCX, and TXT files are supported." });
  }

  return res.status(500).json({ message: "Unable to process the uploaded document." });
});

module.exports = router;
