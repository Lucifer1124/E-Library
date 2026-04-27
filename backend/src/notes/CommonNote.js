const mongoose = require("mongoose");

const MAX_NOTES = 20;

const commonNoteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 280,
    },
  },
  {
    timestamps: true,
  }
);

commonNoteSchema.pre("save", async function trimQueue() {
  if (!this.isNew) {
    return;
  }

  const Model = this.constructor;
  const count = await Model.countDocuments();

  if (count >= MAX_NOTES) {
    await Model.findOneAndDelete({}, { sort: { createdAt: 1 } });
  }
});

commonNoteSchema.statics.enqueue = async function enqueue(notePayload) {
  const note = new this(notePayload);
  await note.save();
  return note;
};

commonNoteSchema.statics.getMaxNotes = () => MAX_NOTES;

const CommonNote = mongoose.model("CommonNote", commonNoteSchema);

module.exports = CommonNote;
