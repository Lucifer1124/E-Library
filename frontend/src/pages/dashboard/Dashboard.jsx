import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../context/AuthContext";
import { useFetchSellerBooksQuery } from "../../redux/features/books/booksApi";
import { useGetMyOrdersQuery } from "../../redux/features/orders/ordersApi";
import {
  fetchAdminOverview,
  fetchAdminUsers,
  toggleUserBlockStatus,
} from "../../redux/features/admin/adminSlice";
import apiClient from "../../utils/apiClient";
import RevenueChart from "./RevenueChart";
import CommonNoteBoard from "../../components/CommonNoteBoard";

const Dashboard = () => {
  const dispatch = useDispatch();
  const { currentUser, isAdmin } = useAuth();
  const { data: sellerBooks = [], isLoading: booksLoading } = useFetchSellerBooksQuery();
  const { data: rentals = [], isLoading: rentalsLoading } = useGetMyOrdersQuery();
  const { overview: adminStats, users: adminUsers, error: adminError } = useSelector(
    (state) => state.admin
  );
  const [isAdminWorking, setIsAdminWorking] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    dispatch(fetchAdminOverview());
    dispatch(fetchAdminUsers());
  }, [dispatch, isAdmin]);

  const myActiveRentals = useMemo(
    () =>
      rentals.reduce(
        (sum, rental) => sum + rental.items.filter((item) => item.status !== "returned").length,
        0
      ),
    [rentals]
  );
  const myOutstandingFines = useMemo(
    () => rentals.reduce((sum, rental) => sum + (rental.totalOutstandingFine || 0), 0),
    [rentals]
  );

  const refreshAdminData = async () => {
    await Promise.all([dispatch(fetchAdminOverview()), dispatch(fetchAdminUsers())]);
  };

  const handleAdminUserAction = async (userId, action) => {
    try {
      setIsAdminWorking(true);
      const result = await dispatch(
        toggleUserBlockStatus({ userId, isBlocked: action === "unblock" })
      );

      if (toggleUserBlockStatus.rejected.match(result)) {
        window.alert(result.payload || "We couldn't update this member right now.");
      }
    } finally {
      setIsAdminWorking(false);
    }
  };

  const handleAdminRentalAction = async (rentalId, itemId, action) => {
    try {
      setIsAdminWorking(true);
      await apiClient.patch(`/api/admin/rentals/${rentalId}/items/${itemId}`, { action });
      await refreshAdminData();
    } catch (error) {
      window.alert(error?.response?.data?.message || "We couldn't update this rental right now.");
    } finally {
      setIsAdminWorking(false);
    }
  };

  const handleClearFine = async (rentalId, itemId, outstandingFine) => {
    try {
      setIsAdminWorking(true);
      await apiClient.patch(`/api/admin/rentals/${rentalId}/items/${itemId}`, {
        fineWaived: outstandingFine,
      });
      await refreshAdminData();
    } catch (error) {
      window.alert(error?.response?.data?.message || "We couldn't clear this fine right now.");
    } finally {
      setIsAdminWorking(false);
    }
  };

  const summaryCards = isAdmin
    ? [
        { label: "Books on shelf", value: adminStats?.totalBooks ?? 0 },
        { label: "Active rentals", value: adminStats?.checkedOutBooks ?? 0 },
        { label: "Blocked members", value: adminStats?.blocklist?.length ?? 0 },
        { label: "Pending fines", value: `INR ${adminStats?.totalOutstandingFines ?? 0}` },
      ]
    : [
        { label: "My listings", value: sellerBooks.length },
        { label: "My active rentals", value: myActiveRentals },
        { label: "My pending fines", value: `INR ${myOutstandingFines.toFixed(2)}` },
        { label: "Role", value: currentUser?.role || "user" },
      ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              {card.label}
            </p>
            <p className="mt-4 text-3xl font-black text-slate-900">{card.value}</p>
          </div>
        ))}
      </section>

      {isAdmin ? (
        <>
          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Library overview</h2>
              <p className="mt-2 text-sm text-slate-600">
                Revenue and rental movement from the live backend feed.
              </p>
              {adminError ? (
                <p className="mt-4 text-sm text-rose-600">{adminError}</p>
              ) : (
                <div className="mt-6">
                  <RevenueChart monthlySales={adminStats?.monthlySales || []} />
                </div>
              )}
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Current checkouts</h2>
              <div className="mt-5 space-y-3">
                {(adminStats?.tracking || []).slice(0, 6).map((entry) => (
                  <div key={entry.itemId} className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">{entry.title}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Copy {entry.copyNumber || "Digital"} with {entry.username}
                      {entry.isDemo ? " (demo)" : ""}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Issue: {new Date(entry.issueDate).toLocaleDateString()} | Due:{" "}
                      {new Date(entry.dueDate).toLocaleDateString()}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {!entry.isDemo ? (
                        <button
                          type="button"
                          disabled={isAdminWorking}
                          onClick={() => handleAdminRentalAction(entry.rentalId, entry.itemId, "return")}
                          className="rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60"
                        >
                          Mark returned
                        </button>
                      ) : null}
                      {entry.outstandingFine > 0 && !entry.isDemo ? (
                        <button
                          type="button"
                          disabled={isAdminWorking}
                          onClick={() => handleClearFine(entry.rentalId, entry.itemId, entry.outstandingFine)}
                          className="rounded-xl border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-60"
                        >
                          Clear fine
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Member standing</h2>
              <div className="mt-5 space-y-3">
                {adminUsers.slice(0, 8).map((user) => (
                  <div key={user._id} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {user.username}
                          {user.isDemo ? " (demo)" : ""}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Active rentals: {user.activeItemsCount} | Pending fine: INR {user.outstandingFine}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {user.isBlocked ? `Blocked: ${user.blockReason}` : "Allowed to rent"}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isAdminWorking || user.isDemo}
                        onClick={() => handleAdminUserAction(user._id, user.isBlocked ? "unblock" : "block")}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:opacity-60"
                      >
                        {user.isDemo ? "Preview" : user.isBlocked ? "Unblock" : "Block"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Rental history</h2>
              <div className="mt-5 space-y-3">
                {(adminStats?.history || []).slice(0, 8).map((entry) => (
                  <div key={entry.itemId} className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">{entry.title}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {entry.username}
                      {entry.isDemo ? " (demo)" : ""} | {entry.status} | Renewal days: {entry.renewalDays}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Issue: {new Date(entry.issueDate).toLocaleDateString()} | Return:{" "}
                      {entry.returnedDate ? new Date(entry.returnedDate).toLocaleDateString() : "Pending"}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Pending fine: INR {entry.outstandingFine}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Live possession map</h2>
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                    <th className="px-4">Book</th>
                    <th className="px-4">Available</th>
                    <th className="px-4">Possessors</th>
                  </tr>
                </thead>
                <tbody>
                  {(adminStats?.liveInventory || []).slice(0, 10).map((book) => (
                    <tr key={book._id} className="bg-slate-50 text-sm text-slate-700">
                      <td className="rounded-l-2xl px-4 py-4 font-semibold text-slate-900">
                        {book.title}
                        {book.isDemo ? " (demo)" : ""}
                      </td>
                      <td className="px-4 py-4">{book.stock}</td>
                      <td className="rounded-r-2xl px-4 py-4">
                        {book.currentPossessors?.length
                          ? book.currentPossessors
                              .map((user) => `${user.username} (${user.accountStatus})`)
                              .join(", ")
                          : "On the shelf"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">My latest listings</h2>
            <div className="mt-5 space-y-3">
              {booksLoading ? (
                <p className="text-sm text-slate-500">Loading your books...</p>
              ) : sellerBooks.length === 0 ? (
                <p className="text-sm text-slate-500">You have not added any books yet.</p>
              ) : (
                sellerBooks.slice(0, 5).map((book) => (
                  <div key={book._id} className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">{book.title}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {book.category} | {book.isFree ? "Free" : `INR ${book.newPrice}`} | {book.availableCopies} available
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">My library activity</h2>
            <div className="mt-5 space-y-3">
              {rentalsLoading ? (
                <p className="text-sm text-slate-500">Loading your rentals...</p>
              ) : rentals.length === 0 ? (
                <p className="text-sm text-slate-500">No rentals yet.</p>
              ) : (
                rentals.slice(0, 5).map((rental) => (
                  <div key={rental._id} className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">{rental.contactName}</p>
                    <p className="mt-1 text-sm text-slate-600 capitalize">
                      {rental.paymentMethod} | {rental.paymentStatus}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Pending fine: INR {rental.totalOutstandingFine || 0}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      <CommonNoteBoard />
    </div>
  );
};

export default Dashboard;
