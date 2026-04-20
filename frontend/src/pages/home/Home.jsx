import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { useFetchAllBooksQuery } from "../../redux/features/books/booksApi";
import { useAuth } from "../../context/AuthContext";
import BookCard from "../books/BookCard";

const accent = "#8672FF";
const allCategories = [
  "all",
  "action",
  "drama",
  "romance",
  "sci-fi",
  "fantasy",
  "gore",
  "adventure",
  "crime",
  "thriller",
  "heartbreak",
];

const Home = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const { currentUser } = useAuth();
  const { data: books = [], isLoading, isError } = useFetchAllBooksQuery({
    search: search.trim() || undefined,
    category,
  });

  const visibleBooks = useMemo(() => books.slice(0, 12), [books]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl p-8 text-white shadow-sm" style={{ backgroundColor: accent }}>
        <h1 className="text-4xl font-bold md:text-5xl">Bookie Pookie</h1>
        <p className="mt-3 max-w-3xl text-base text-indigo-50 md:text-lg">
          Discover, buy, and sell amazing books with local username/password auth, a seller-ready
          dashboard, and backend-driven checkout powered by your own MERN stack.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to={currentUser ? "/dashboard/add-new-book" : "/register"}
            className="rounded-lg bg-white px-5 py-3 font-semibold"
            style={{ color: accent }}
          >
            {currentUser ? "Upload Book" : "Create Account"}
          </Link>
          <Link
            to={currentUser ? "/dashboard" : "/login"}
            className="rounded-lg border border-white/50 px-5 py-3 font-semibold text-white"
          >
            {currentUser ? "Open Dashboard" : "Login"}
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-2">
          {allCategories.map((item) => {
            const active = category === item;

            return (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  active ? "text-white" : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
                style={active ? { backgroundColor: accent, borderColor: accent } : {}}
              >
                {item === "all" ? "All" : item}
              </button>
            );
          })}
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="flex items-center rounded-xl border border-slate-200 bg-white px-4">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search books by title, author, seller, or description..."
              className="w-full py-3 outline-none"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-sm font-semibold text-slate-400"
              >
                Clear
              </button>
            ) : null}
          </div>

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none"
          >
            {allCategories.map((item) => (
              <option key={item} value={item}>
                {item === "all" ? "All Categories" : item}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section>
        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading books...
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center text-rose-700 shadow-sm">
            Unable to load books from the backend right now.
          </div>
        ) : visibleBooks.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            No books found. Try another search or add a new book.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleBooks.map((book) => (
              <BookCard key={book._id} book={book} />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Backend-driven auth</h2>
          <p className="mt-2 text-sm text-slate-600">
            Username/password login, admin role checks, and 5-day JWT sessions are handled by the
            backend API.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Customer first, seller optional</h2>
          <p className="mt-2 text-sm text-slate-600">
            Every account starts as a customer, and the same account can upload books whenever the
            user wants to sell.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Local demo checkout</h2>
          <p className="mt-2 text-sm text-slate-600">
            Buyers can use demo card checkout or cash on delivery until Razorpay is added later.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Home;
