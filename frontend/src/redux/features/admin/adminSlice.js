import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import DOMPurify from "dompurify";
import apiClient from "../../../utils/apiClient";

const initialState = {
  overview: null,
  users: [],
  notes: [],
  maxNotes: 20,
  status: "idle",
  notesStatus: "idle",
  error: "",
  notesError: "",
};

export const fetchAdminOverview = createAsyncThunk(
  "admin/fetchOverview",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.get("/api/admin/stats");
      return data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || "We couldn't load the library overview just yet."
      );
    }
  }
);

export const fetchAdminUsers = createAsyncThunk(
  "admin/fetchUsers",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.get("/api/admin/users");
      return data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || "The member list is taking a little longer than usual."
      );
    }
  }
);

export const toggleUserBlockStatus = createAsyncThunk(
  "admin/toggleUserBlockStatus",
  async ({ userId, isBlocked }, { dispatch, rejectWithValue }) => {
    try {
      const endpoint = isBlocked ? "unblock" : "block";
      await apiClient.patch(`/api/admin/users/${userId}/${endpoint}`, {
        reason: "Updated from the management console.",
      });
      await Promise.all([dispatch(fetchAdminOverview()), dispatch(fetchAdminUsers())]);
      return { userId, isBlocked: !isBlocked };
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || "That blocklist update did not stick."
      );
    }
  }
);

export const fetchCommonNotes = createAsyncThunk(
  "admin/fetchCommonNotes",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.get("/api/common-notes");
      return data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || "The common note board is quiet right now."
      );
    }
  }
);

export const postCommonNote = createAsyncThunk(
  "admin/postCommonNote",
  async (message, { dispatch, rejectWithValue }) => {
    try {
      const sanitizedMessage = DOMPurify.sanitize(message, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
      }).trim();

      if (!sanitizedMessage) {
        return rejectWithValue("Add a short note before posting it.");
      }

      await apiClient.post("/api/common-notes", {
        message: sanitizedMessage,
      });
      await dispatch(fetchCommonNotes());
      return sanitizedMessage;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || "That note did not make it onto the board."
      );
    }
  }
);

const adminSlice = createSlice({
  name: "admin",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminOverview.pending, (state) => {
        state.status = "loading";
        state.error = "";
      })
      .addCase(fetchAdminOverview.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.overview = action.payload;
      })
      .addCase(fetchAdminOverview.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(fetchAdminUsers.fulfilled, (state, action) => {
        state.users = action.payload;
      })
      .addCase(fetchCommonNotes.pending, (state) => {
        state.notesStatus = "loading";
        state.notesError = "";
      })
      .addCase(fetchCommonNotes.fulfilled, (state, action) => {
        state.notesStatus = "succeeded";
        state.notes = action.payload.notes;
        state.maxNotes = action.payload.maxItems;
      })
      .addCase(fetchCommonNotes.rejected, (state, action) => {
        state.notesStatus = "failed";
        state.notesError = action.payload;
      })
      .addCase(postCommonNote.rejected, (state, action) => {
        state.notesError = action.payload;
      })
      .addCase(toggleUserBlockStatus.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export default adminSlice.reducer;
