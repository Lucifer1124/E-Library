import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { HiOutlineShoppingCart } from "react-icons/hi2";
import { useSelector } from "react-redux";
import { useAuth } from "../context/AuthContext";

const accent = "#8672FF";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const cartItems = useSelector((state) => state.cart.cartItems);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
    setIsOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
      <nav className="mx-auto flex max-w-screen-2xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-2xl font-bold" style={{ color: accent }}>
            Bookie Pookie
          </Link>

          <div className="hidden items-center gap-5 text-sm font-medium text-slate-600 md:flex">
            <NavLink to="/" className="hover:text-slate-900">
              Home
            </NavLink>
            <NavLink to="/dashboard" className="hover:text-slate-900">
              Dashboard
            </NavLink>
            <NavLink to="/orders" className="hover:text-slate-900">
              My Library
            </NavLink>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {currentUser ? (
            <Link
              to="/dashboard/add-new-book"
              className="hidden rounded-lg px-4 py-2 text-sm font-semibold text-white md:inline-flex"
              style={{ backgroundColor: accent }}
            >
              Upload Book
            </Link>
          ) : null}

          <Link
            to="/cart"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: accent }}
          >
            <HiOutlineShoppingCart className="text-lg" />
            <span>{cartItems.length}</span>
          </Link>

          {currentUser ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsOpen((open) => !open)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                {currentUser.username}
              </button>

              {isOpen ? (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                  <Link
                    to="/dashboard"
                    onClick={() => setIsOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Open Dashboard
                  </Link>
                  <Link
                    to="/orders"
                    onClick={() => setIsOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    My Library
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                  >
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="rounded-lg border px-4 py-2 text-sm font-semibold"
                style={{ borderColor: accent, color: accent }}
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: accent }}
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
