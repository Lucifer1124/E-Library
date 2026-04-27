import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useAuth } from "../context/AuthContext";
import apiClient from "../utils/apiClient";
import booksApi from "../redux/features/books/booksApi";
import { fetchAdminOverview, fetchAdminUsers } from "../redux/features/admin/adminSlice";

const openBlobDocument = (blob, fileName) => {
  const objectUrl = window.URL.createObjectURL(blob);
  window.open(objectUrl, "_blank", "noopener,noreferrer");
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60_000);

  if (!blob.type.includes("pdf") && !blob.type.includes("text")) {
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName || "library-file";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
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
        await apiClient.post(`/api/orders/instant/${book._id}`);
        dispatch(booksApi.util.invalidateTags(["Books"]));
        if (currentUser?.role === "admin") {
          dispatch(fetchAdminOverview());
          dispatch(fetchAdminUsers());
        }
        const response = await apiClient.get(`/api/books/${book._id}/document`, {
          responseType: "blob",
        });
        openBlobDocument(
          new Blob([response.data], { type: response.headers["content-type"] }),
          book.documentName
        );
      } catch (error) {
        if (error?.response?.status === 409) {
          const response = await apiClient.get(`/api/books/${book._id}/document`, {
            responseType: "blob",
          });
          openBlobDocument(
            new Blob([response.data], { type: response.headers["content-type"] }),
            book.documentName
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
