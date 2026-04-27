import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCommonNotes, postCommonNote } from "../redux/features/admin/adminSlice";
import { useAuth } from "../context/AuthContext";

const CommonNoteBoard = () => {
  const dispatch = useDispatch();
  const { currentUser } = useAuth();
  const { notes, maxNotes, notesStatus, notesError } = useSelector((state) => state.admin);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!currentUser) {
      return undefined;
    }

    dispatch(fetchCommonNotes());
    const intervalId = window.setInterval(() => {
      dispatch(fetchCommonNotes());
    }, 12000);

    return () => window.clearInterval(intervalId);
  }, [currentUser, dispatch]);

  if (!currentUser) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    const result = await dispatch(postCommonNote(draft));

    if (!postCommonNote.rejected.match(result)) {
      setDraft("");
    }
  };

  return (
    <aside className="common-note-shell">
      <div className="common-note-card">
        <div className="common-note-header">
          <p className="common-note-kicker">Common Note</p>
          <h2>Shared notes from the floor</h2>
          <p className="common-note-copy">
            The board keeps the latest {maxNotes} notes and quietly lets the older ones fall away.
          </p>
        </div>

        <div className="common-note-list">
          {notes.length === 0 ? (
            <div className="common-note-empty">
              {notesStatus === "loading"
                ? "Loading the board."
                : "Nothing posted yet."}
            </div>
          ) : (
            notes.map((note) => (
              <article key={note._id} className="common-note-item">
                <div className="common-note-meta">
                  <span>{note.username}</span>
                  <span>{new Date(note.createdAt).toLocaleString()}</span>
                </div>
                <p>{note.message}</p>
              </article>
            ))
          )}
        </div>

        <form className="common-note-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="common-note-input"
            maxLength={280}
            placeholder="Leave a short note for the room."
          />
          <button
            type="submit"
            className="common-note-button"
            disabled={!draft.trim() || notesStatus === "loading"}
          >
            Post
          </button>
        </form>

        {notesError ? <p className="common-note-error">{notesError}</p> : null}
      </div>
    </aside>
  );
};

export default CommonNoteBoard;
