import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { HiOutlineBookOpen, HiOutlineChartBar, HiOutlinePlusCircle } from "react-icons/hi2";
import { useAuth } from "../../context/AuthContext";

const linkClassName = ({ isActive }) =>
  `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
    isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;

const DashboardLayout = () => {
  const navigate = useNavigate();
  const { currentUser, isAdmin, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <Link to="/" className="block rounded-2xl bg-slate-900 px-5 py-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
            {isAdmin ? "Admin" : "Seller"}
          </p>
          <h1 className="mt-2 text-2xl font-bold">{currentUser?.username}</h1>
          <p className="mt-2 text-sm text-slate-300">
            {isAdmin ? "Manage the full catalog and store health." : "Upload and manage your own books."}
          </p>
        </Link>

        <nav className="mt-6 space-y-2">
          <NavLink to="/dashboard" end className={linkClassName}>
            <HiOutlineChartBar className="text-lg" />
            Overview
          </NavLink>
          <NavLink to="/dashboard/add-new-book" className={linkClassName}>
            <HiOutlinePlusCircle className="text-lg" />
            Add Book
          </NavLink>
          <NavLink to="/dashboard/manage-books" className={linkClassName}>
            <HiOutlineBookOpen className="text-lg" />
            Manage Books
          </NavLink>
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-8 w-full rounded-2xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
        >
          Logout
        </button>
      </aside>

      <div className="space-y-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Dashboard
          </p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">
                {isAdmin ? "Admin command center" : "Seller workspace"}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {isAdmin
                  ? "Admin can add or delete any book in the catalog."
                  : "You can add books and manage the listings attached to your account."}
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/dashboard/add-new-book"
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Add a Book
              </Link>
              <Link
                to="/dashboard/manage-books"
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Manage Listings
              </Link>
            </div>
          </div>
        </div>

        <Outlet />
      </div>
    </section>
  );
};

export default DashboardLayout;
