const CommonNote = require("./CommonNote");

const listCommonNotes = async (_req, res) => {
  try {
    const notes = await CommonNote.find().sort({ createdAt: -1 }).lean();
    return res.status(200).json({
      maxItems: CommonNote.getMaxNotes(),
      notes,
    });
  } catch (error) {
    console.error("Failed to list common notes", error);
    return res.status(500).json({ message: "Unable to load the common note board." });
  }
};

const createCommonNote = async (req, res) => {
  try {
    const message = req.body?.message?.replace(/<[^>]*>/g, "").trim();

    if (!message) {
      return res.status(400).json({ message: "Write a short note before posting it." });
    }

    const note = new CommonNote({
      userId: req.user._id,
      username: req.user.username,
      message,
    });
    await note.save();

    return res.status(201).json({
      message: "Your note is now on the common board.",
      note,
    });
  } catch (error) {
    console.error("Failed to create common note", error);
    return res.status(500).json({ message: "We couldn't post that note right now." });
  }
};

module.exports = {
  createCommonNote,
  listCommonNotes,
};
