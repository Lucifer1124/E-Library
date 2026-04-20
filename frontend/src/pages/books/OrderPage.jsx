import { useState } from "react";
import apiClient from "../../utils/apiClient";
import { useGetMyOrdersQuery } from "../../redux/features/orders/ordersApi";

const inlineMimeTypes = new Set(["application/pdf", "text/plain"]);

const OrderPage = () => {
  const { data: orders = [], isLoading, isError } = useGetMyOrdersQuery();
  const [activeDocumentKey, setActiveDocumentKey] = useState("");

  const handleOpenDocument = async (bookId, fileName, mimeType) => {
    const requestKey = `${bookId}:${fileName}`;

    try {
      setActiveDocumentKey(requestKey);
      const response = await apiClient.get(`/api/books/${bookId}/document`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: response.headers["content-type"] || mimeType,
      });
      const objectUrl = window.URL.createObjectURL(blob);

      if (inlineMimeTypes.has(blob.type)) {
        window.open(objectUrl, "_blank", "noopener,noreferrer");
        window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60_000);
        return;
      }

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName || "book-document";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      window.alert(error?.response?.data?.message || "Unable to open this purchased file right now.");
    } finally {
      setActiveDocumentKey("");
    }
  };

  if (isLoading) {
    return <div className="rounded-[2rem] bg-white p-10 text-center shadow-sm">Loading orders...</div>;
  }

  if (isError) {
    return (
      <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-10 text-center text-rose-700">
        Unable to load your orders right now.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">Orders</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Your order history</h1>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
          No orders found yet.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order, index) => (
            <article key={order._id} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Order #{index + 1}
                  </p>
                  <h2 className="mt-2 text-lg font-bold text-slate-900">{order._id}</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    {order.contactName} • {order.phone}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {order.address.street}, {order.address.city}, {order.address.state},{" "}
                    {order.address.country} - {order.address.zipcode}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                  <p>
                    <strong>Total:</strong> ${order.totalPrice}
                  </p>
                  <p className="mt-1 capitalize">
                    <strong>Payment:</strong> {order.paymentMethod}
                  </p>
                  <p className="mt-1 capitalize">
                    <strong>Status:</strong> {order.paymentStatus}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {order.items.map((item) => {
                  const requestKey = `${item.bookId}:${item.documentName}`;

                  return (
                    <div key={item.bookId} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <h3 className="font-semibold text-slate-900">{item.title}</h3>
                      <p className="mt-1 text-sm text-slate-600">Seller: {item.sellerUsername}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">${item.price}</p>
                      <p className="mt-2 text-sm text-slate-600">
                        Purchased file:{" "}
                        <span className="font-medium text-slate-800">
                          {item.hasDocument ? item.documentName : "Not uploaded for this older listing yet"}
                        </span>
                      </p>
                      <button
                        type="button"
                        disabled={!item.hasDocument || activeDocumentKey === requestKey}
                        onClick={() =>
                          handleOpenDocument(item.bookId, item.documentName, item.documentMimeType)
                        }
                        className="mt-4 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {activeDocumentKey === requestKey ? "Opening..." : "Open Purchased File"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderPage;
