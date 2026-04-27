const test = require("node:test");
const assert = require("node:assert/strict");
const CommonNote = require("../src/notes/CommonNote");

const originalCountDocuments = CommonNote.countDocuments;
const originalFindOneAndDelete = CommonNote.findOneAndDelete;

test.afterEach(() => {
  CommonNote.countDocuments = originalCountDocuments;
  CommonNote.findOneAndDelete = originalFindOneAndDelete;
});

test("common note pre-save hook trims the oldest entry when full", async () => {
  let deleteOptions = null;

  CommonNote.countDocuments = async () => 20;
  CommonNote.findOneAndDelete = async (_query, options) => {
    deleteOptions = options;
    return { _id: "oldest-note-id" };
  };

  const note = new CommonNote({
    userId: "507f191e810c19729de860ea",
    username: "reader1",
    message: "A fresh note for the board.",
  });

  await new Promise((resolve, reject) => {
    CommonNote.schema.s.hooks.execPre("save", note, [note], (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  assert.deepEqual(deleteOptions, { sort: { createdAt: 1 } });
});
