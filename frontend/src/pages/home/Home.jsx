import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useFetchAllBooksQuery } from "../../redux/features/books/booksApi";
import { useAuth } from "../../context/AuthContext";
import BookCard from "../books/BookCard";
import { hydrateBookStatuses } from "../../redux/features/books/bookSlice";

const accent = "#312e81";
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
  const dispatch = useDispatch();
  const { currentUser } = useAuth();
  const { data: books = [], isLoading, isError } = useFetchAllBooksQuery({
    search: search.trim() || undefined,
    category,
  });

  const visibleBooks = useMemo(() => books.slice(0, 12), [books]);

  useEffect(() => {
    dispatch(
      hydrateBookStatuses({
        books,
        currentUserId: currentUser?.id,
      })
    );
  }, [books, currentUser?.id, dispatch]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl p-8 text-white shadow-sm" style={{ backgroundColor: accent }}>
        <h1 className="text-4xl font-bold md:text-5xl">Bookie Pookie</h1>
        <p className="mt-3 max-w-3xl text-base text-indigo-50 md:text-lg">
          A quieter library for reading, lending, and keeping track of every copy in one place.
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
            No books found. Try another search or add a new title.
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
          <h2 className="text-lg font-bold text-slate-900">Backend-led access</h2>
          <p className="mt-2 text-sm text-slate-600">
            Username login, role checks, and the five-day session all stay on the server.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Reader first, seller when needed</h2>
          <p className="mt-2 text-sm text-slate-600">
            Each account can read, rent, and also list books without juggling separate profiles.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Rental flow with renewal</h2>
          <p className="mt-2 text-sm text-slate-600">
            Every rental starts with five days and can be extended at INR 2 per day.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Home;
