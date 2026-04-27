import { FiShoppingCart } from "react-icons/fi";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getImgUrl } from "../../utils/getImgUrl";
import { addToCart } from "../../redux/features/cart/cartSlice";
import { useBookAccess } from "../../hooks/useBookAccess";

const getDocumentLabel = (mimeType) => {
  if (!mimeType) {
    return "FILE";
  }

  if (mimeType === "application/pdf") {
    return "PDF";
  }

  if (mimeType === "text/plain") {
    return "TXT";
  }

  if (mimeType.includes("wordprocessingml")) {
    return "DOCX";
  }

  return "FILE";
};

const BookCard = ({ book }) => {
  const dispatch = useDispatch();
  const { handleBookAccess } = useBookAccess();
  const bookStatus = useSelector((state) => state.bookState.statusesById[book?._id]);
  const isOwned = bookStatus === "owned";
  const isUnavailable = bookStatus === "unavailable";

  const handleAddToCart = (product) => {
    dispatch(addToCart(product));
  };

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="overflow-hidden rounded-2xl bg-slate-50 sm:w-48 sm:flex-shrink-0">
          <Link to={`/books/${book._id}`}>
            <img
              src={getImgUrl(book?.coverImage)}
              alt={book?.title}
              className="h-full w-full object-cover transition duration-300 hover:scale-105"
            />
          </Link>
        </div>

        <div className="flex flex-1 flex-col">
          <Link to={`/books/${book._id}`}>
            <h3 className="mb-2 text-xl font-semibold text-slate-900 hover:text-amber-700">
              {book?.title}
            </h3>
          </Link>
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.15em] text-slate-500">
            {book?.category} | seller {book?.sellerUsername}
          </p>
          <p className="mb-3 flex-1 text-slate-600">
            {book?.description.length > 110
              ? `${book.description.slice(0, 110)}...`
              : book?.description}
          </p>
          <p className="mb-2 text-sm text-slate-500">
            Copies available:{" "}
            <span className="font-semibold text-slate-700">
              {book?.availableCopies ?? book?.stock ?? 0}
            </span>
          </p>
          <p className="mb-5 text-sm text-slate-500">
            Included file:{" "}
            <span className="font-semibold text-slate-700">
              {book?.documentName
                ? `${book.documentName} (${getDocumentLabel(book.documentMimeType)})`
                : "Pending"}
            </span>
          </p>
          <p className="mb-5 font-medium text-slate-900">
            {book?.isFree ? "Free" : `INR ${book?.newPrice}`}
            {!book?.isFree ? (
              <span className="ml-2 text-slate-400 line-through">INR {book?.oldPrice}</span>
            ) : null}
          </p>
          <button
            onClick={() => handleBookAccess({ book, onRent: () => handleAddToCart(book) })}
            disabled={isOwned || isUnavailable}
            className="inline-flex w-fit items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FiShoppingCart />
            <span>
              {isOwned
                ? "Your Listing"
                : isUnavailable
                  ? "Unavailable"
                  : book?.isFree
                    ? "Read Free"
                    : "Add to Rental Cart"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookCard;
