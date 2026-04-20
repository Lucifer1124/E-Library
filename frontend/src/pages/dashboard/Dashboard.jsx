import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useFetchSellerBooksQuery } from "../../redux/features/books/booksApi";
import { useGetMyOrdersQuery } from "../../redux/features/orders/ordersApi";
import apiClient from "../../utils/apiClient";
import RevenueChart from "./RevenueChart";

const Dashboard = () => {
  const { currentUser, isAdmin } = useAuth();
  const { data: sellerBooks = [], isLoading: booksLoading } = useFetchSellerBooksQuery();
  const { data: orders = [], isLoading: ordersLoading } = useGetMyOrdersQuery();
  const [adminStats, setAdminStats] = useState(null);
  const [adminError, setAdminError] = useState("");

  useEffect(() => {
    const fetchAdminStats = async () => {
      if (!isAdmin) {
        return;
      }

      try {
        const { data } = await apiClient.get("/api/admin");
        setAdminStats(data);
      } catch (error) {
        setAdminError(error?.response?.data?.message || error.message);
      }
    };

    fetchAdminStats();
  }, [isAdmin]);

  const sellerRevenue = useMemo(
    () => orders.reduce((sum, order) => sum + order.totalPrice, 0),
    [orders]
  );

  const summaryCards = isAdmin
    ? [
        { label: "Total Books", value: adminStats?.totalBooks ?? 0 },
        { label: "Total Orders", value: adminStats?.totalOrders ?? 0 },
        { label: "Total Sellers", value: adminStats?.totalSellers ?? 0 },
        { label: "Total Sales", value: `$${adminStats?.totalSales ?? 0}` },
      ]
    : [
        { label: "My Listings", value: sellerBooks.length },
        { label: "My Orders", value: orders.length },
        { label: "Order Value", value: `$${sellerRevenue.toFixed(2)}` },
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
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Monthly order and sales view</h2>
            <p className="mt-2 text-sm text-slate-600">
              Recent admin metrics from the backend stats route.
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
            <h2 className="text-xl font-bold text-slate-900">Latest orders</h2>
            <div className="mt-5 space-y-3">
              {(adminStats?.latestOrders || []).map((order) => (
                <div key={order._id} className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{order.username}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {order.paymentMethod} | {order.paymentStatus}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">${order.totalPrice}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
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
                      {book.category} | ${book.newPrice}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">My latest orders</h2>
            <div className="mt-5 space-y-3">
              {ordersLoading ? (
                <p className="text-sm text-slate-500">Loading your orders...</p>
              ) : orders.length === 0 ? (
                <p className="text-sm text-slate-500">No orders placed yet.</p>
              ) : (
                orders.slice(0, 5).map((order) => (
                  <div key={order._id} className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">{order.contactName}</p>
                    <p className="mt-1 text-sm text-slate-600 capitalize">
                      {order.paymentMethod} | {order.paymentStatus}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">${order.totalPrice}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Dashboard;
