import { createSlice } from "@reduxjs/toolkit";

const computeStatus = (book, currentUserId) => {
  if (currentUserId && String(book?.sellerId) === String(currentUserId)) {
    return "owned";
  }

  return (book?.availableCopies ?? book?.stock ?? 0) > 0 ? "available" : "unavailable";
};

const bookSlice = createSlice({
  name: "bookState",
  initialState: {
    statusesById: {},
  },
  reducers: {
    hydrateBookStatuses: (state, action) => {
      const { books = [], currentUserId = "" } = action.payload || {};

      books.forEach((book) => {
        if (!book?._id) {
          return;
        }

        state.statusesById[book._id] = computeStatus(book, currentUserId);
      });
    },
    clearBookStatuses: (state) => {
      state.statusesById = {};
    },
  },
});

export const { hydrateBookStatuses, clearBookStatuses } = bookSlice.actions;
export default bookSlice.reducer;
