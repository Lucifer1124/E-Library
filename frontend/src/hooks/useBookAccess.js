import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useAuth } from "../context/AuthContext";
import apiClient from "../utils/apiClient";
import booksApi from "../redux/features/books/booksApi";
import { fetchAdminOverview, fetchAdminUsers } from "../redux/features/admin/adminSlice";

const inlineMimeTypes = new Set(["application/pdf", "text/plain"]);

// Rewritten helper to inject a completely secure iframe preview modal inside the app
const openBlobDocument = (blob, fileName) => {
  const objectUrl = window.URL.createObjectURL(blob);

  // Handle PDF and TXT inline view
  if (inlineMimeTypes.has(blob.type)) {
    // 1. Build an isolated preview overlay container
    const previewOverlay = document.createElement('div');
    previewOverlay.id = 'inline-doc-previewer';
    previewOverlay.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.85); z-index:99999; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:sans-serif;';

    // 2. Append control toolbar
    const toolbar = document.createElement('div');
    toolbar.style.cssText = 'width:100%; max-width:90%; display:flex; justify-content:space-between; margin-bottom:10px; color:#fff;';
    toolbar.innerHTML = `<span style="font-weight:bold;">${fileName || 'Document Preview'}</span>`;

    const closeBtn = document.createElement('button');
    closeBtn.innerText = '✕ Close Preview';
    closeBtn.style.cssText = 'background:#ff4d4d; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; font-weight:bold;';
    closeBtn.onclick = () => {
      document.body.removeChild(previewOverlay);
      window.URL.revokeObjectURL(objectUrl); // Safely remove file reference from RAM
    };
    toolbar.appendChild(closeBtn);
    previewOverlay.appendChild(toolbar);

    // 3. Embed the iframe frame 
    const viewerFrame = document.createElement('iframe');
    viewerFrame.src = objectUrl;
    viewerFrame.style.cssText = 'width:90%; height:85%; border:none; background:#fff; border-radius:6px; box-shadow:0 4px 20px rgba(0,0,0,0.5);';

    previewOverlay.appendChild(viewerFrame);
    document.body.appendChild(previewOverlay);
    return;
  }

  // Handle download path for Word documents (.docx)
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName || "library-file";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
};

export const useBookAccess = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentUser } = useAuth();

  const handleBookAccess = async ({ book, onRent }) => {
    if (!currentUser) {
      navigate("/login", { state: { from: { pathname: `/books/${book._id}` } } });
      return;
    }

    if (book.sellerId === currentUser.id) {
      window.alert("You cannot rent a book you added to the library.");
      return;
    }

    if (book.isFree) {
      try {
        // 1. Process instant orders pipeline
        await apiClient.post(`/api/orders/instant/${book._id}`);
        dispatch(booksApi.util.invalidateTags(["Books"]));
        if (currentUser?.role === "admin") {
          dispatch(fetchAdminOverview());
          dispatch(fetchAdminUsers());
        }

        // 2. Fetch the raw document binary data
        const response = await apiClient.get(`/api/books/${book._id}/document`, {
          responseType: "blob",
        });

        // 3. Pass the data to the secure inline view helper
        openBlobDocument(
          new Blob([response.data], { type: response.headers["content-type"] }),
          book.documentName || book.title
        );

      } catch (error) {
        // Handle 409 conflict states gracefully
        if (error?.response?.status === 409) {
          const response = await apiClient.get(`/api/books/${book._id}/document`, {
            responseType: "blob",
          });
          openBlobDocument(
            new Blob([response.data], { type: response.headers["content-type"] }),
            book.documentName || book.title
          );
          return;
        }

        window.alert(
          error?.response?.data?.message || "We couldn't open that title right now."
        );
      }
      return;
    }

    onRent();
  };

  return { handleBookAccess };
};
