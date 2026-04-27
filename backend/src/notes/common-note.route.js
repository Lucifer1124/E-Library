const express = require("express");
const verifyToken = require("../middleware/verifyToken");
const { createCommonNote, listCommonNotes } = require("./common-note.controller");

const router = express.Router();

router.get("/", verifyToken, listCommonNotes);
router.post("/", verifyToken, createCommonNote);

module.exports = router;
