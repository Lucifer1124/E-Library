import { FiShoppingCart } from "react-icons/fi";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getImgUrl } from "../../utils/getImgUrl";
import { addToCart } from "../../redux/features/cart/cartSlice";
import { useFetchBookByIdQuery } from "../../redux/features/books/booksApi";
import { useBookAccess } from "../../hooks/useBookAccess";
import { useAuth } from "../../context/AuthContext";
import { hydrateBookStatuses } from "../../redux/features/books/bookSlice";

const getDocumentLabel = (mimeType) => {
  if (mimeType === "application/pdf") {
    return "PDF";
  }

  if (mimeType === "text/plain") {
    return "TXT";
  }

  if (mimeType?.includes("wordprocessingml")) {
    return "DOCX";
  }

  return "FILE";
};

const SingleBook = () => {
  const { id } = useParams();
  const { data: book, isLoading, isError } = useFetchBookByIdQuery(id);
  const dispatch = useDispatch();
  const { handleBookAccess } = useBookAccess();
  const { currentUser } = useAuth();
  const bookStatus = useSelector((state) => state.bookState.statusesById[id]);

  useEffect(() => {
    if (!book) {
      return;
    }

    dispatch(
      hydrateBookStatuses({
        books: [book],
        currentUserId: currentUser?.id,
      })
    );
  }, [book, currentUser?.id, dispatch]);

  const handleAddToCart = (product) => {
    dispatch(addToCart(product));
  };

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error happened while loading book info.</div>;

  return (
    <div className="mx-auto grid max-w-5xl gap-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[0.85fr_1fr]">
      <div className="overflow-hidden rounded-[1.5rem] bg-slate-50">
        <img src={getImgUrl(book.coverImage)} alt={book.title} className="h-full w-full object-cover" />
      </div>

      <div className="flex flex-col justify-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
          {book.category}
        </p>
        <h1 className="mb-6 text-4xl font-black text-slate-900">{book.title}</h1>

        <div className="mb-6 space-y-3 text-slate-700">
          <p>
            <strong>Author:</strong> {book.author}
          </p>
          <p>
            <strong>Seller:</strong> {book.sellerUsername}
          </p>
          <p>
            <strong>Published:</strong> {new Date(book?.createdAt).toLocaleDateString()}
          </p>
          <p>
            <strong>5-Day Rental:</strong> {book.isFree ? "Free" : `INR ${book.newPrice}`}
            {!book.isFree ? (
              <span className="ml-2 text-slate-400 line-through">INR {book.oldPrice}</span>
            ) : null}
          </p>
          <p>
            <strong>Copies Available:</strong> {book.availableCopies ?? book.stock}
          </p>
          <p>
            <strong>Description:</strong> {book.description}
          </p>
          <p>
            <strong>Included file:</strong> {book.documentName} ({getDocumentLabel(book.documentMimeType)})
          </p>
        </div>

        <button
          onClick={() => handleBookAccess({ book, onRent: () => handleAddToCart(book) })}
          disabled={bookStatus === "owned" || bookStatus === "unavailable"}
          className="inline-flex w-fit items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FiShoppingCart />
          <span>
            {bookStatus === "owned"
              ? "Your Listing"
              : bookStatus === "unavailable"
                ? "No Copy Available"
                : book.isFree
                  ? "Read Free"
                  : "Add to Rental Cart"}
          </span>
        </button>
      </div>
    </div>
  );
};

export default SingleBook;
