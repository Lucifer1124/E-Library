import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import {
  useDeleteBookMutation,
  useFetchAllBooksQuery,
  useFetchSellerBooksQuery,
} from "../../../redux/features/books/booksApi";
import { useAuth } from "../../../context/AuthContext";

const ManageBooks = () => {
  const { isAdmin } = useAuth();
  const allBooksQuery = useFetchAllBooksQuery(undefined, { skip: !isAdmin });
  const sellerBooksQuery = useFetchSellerBooksQuery(undefined, { skip: isAdmin });
  const [deleteBook, { isLoading: isDeleting }] = useDeleteBookMutation();

  const books = isAdmin ? allBooksQuery.data || [] : sellerBooksQuery.data || [];
  const isLoading = isAdmin ? allBooksQuery.isLoading : sellerBooksQuery.isLoading;

  const handleDeleteBook = async (id) => {
    const result = await Swal.fire({
      title: "Delete this book?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await deleteBook(id).unwrap();
      Swal.fire({
        title: "Deleted",
        text: "Book removed successfully.",
        icon: "success",
      });
    } catch (error) {
      Swal.fire({
        title: "Delete failed",
        text: error?.data?.message || "Unable to delete this book.",
        icon: "error",
      });
    }
  };

  if (isLoading) {
    return <div className="rounded-[1.75rem] bg-white p-8 shadow-sm">Loading books...</div>;
  }

  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Inventory
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            {isAdmin ? "All books in the catalog" : "Books you uploaded"}
          </h2>
        </div>
        <Link
          to="/dashboard/add-new-book"
          className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Add New Book
        </Link>
      </div>

      {books.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 p-8 text-center text-slate-500">
          No books available yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                <th className="px-4">Title</th>
                <th className="px-4">Seller</th>
                <th className="px-4">Category</th>
                <th className="px-4">Price</th>
                <th className="px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {books.map((book) => (
                <tr key={book._id} className="rounded-2xl bg-slate-50 text-sm text-slate-700">
                  <td className="rounded-l-2xl px-4 py-4 font-semibold text-slate-900">{book.title}</td>
                  <td className="px-4 py-4">{book.sellerUsername}</td>
                  <td className="px-4 py-4 capitalize">{book.category}</td>
                  <td className="px-4 py-4">${book.newPrice}</td>
                  <td className="rounded-r-2xl px-4 py-4">
                    <div className="flex flex-wrap gap-3">
                      <Link
                        to={`/dashboard/edit-book/${book._id}`}
                        className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition hover:bg-white"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => handleDeleteBook(book._id)}
                        className="rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default ManageBooks;
