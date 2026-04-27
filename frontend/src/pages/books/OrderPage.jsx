import { useState } from "react";
import apiClient from "../../utils/apiClient";
import {
  useGetMyOrdersQuery,
  useRenewRentalItemMutation,
  useReturnRentalItemMutation,
} from "../../redux/features/orders/ordersApi";
import CommonNoteBoard from "../../components/CommonNoteBoard";

const inlineMimeTypes = new Set(["application/pdf", "text/plain"]);

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "Not returned");

const OrderPage = () => {
  const { data: orders = [], isLoading, isError } = useGetMyOrdersQuery();
  const [activeDocumentKey, setActiveDocumentKey] = useState("");
  const [renewRentalItem, { isLoading: isRenewing }] = useRenewRentalItemMutation();
  const [returnRentalItem, { isLoading: isReturning }] = useReturnRentalItemMutation();

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
      link.download = fileName || "library-document";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      window.alert(error?.response?.data?.message || "Unable to open this library file right now.");
    } finally {
      setActiveDocumentKey("");
    }
  };

  const handleRenew = async (orderId, itemId) => {
    const input = window.prompt("Add how many extra days? Each day costs INR 2.", "1");
    const extraDays = Number(input);

    if (!input) {
      return;
    }

    if (!Number.isInteger(extraDays) || extraDays < 1) {
      window.alert("Please enter a valid whole number of days.");
      return;
    }

    try {
      await renewRentalItem({ orderId, itemId, extraDays }).unwrap();
    } catch (error) {
      window.alert(error?.data?.message || "Unable to renew this rental.");
    }
  };

  const handleReturn = async (orderId, itemId) => {
    try {
      await returnRentalItem({ orderId, itemId }).unwrap();
    } catch (error) {
      window.alert(error?.data?.message || "Unable to return this rental.");
    }
  };

  if (isLoading) {
    return <div className="rounded-[2rem] bg-white p-10 text-center shadow-sm">Loading library activity...</div>;
  }

  if (isError) {
    return (
      <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-10 text-center text-rose-700">
        Unable to load your library activity right now.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">Library</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Your rentals and reading access</h1>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
          No rentals found yet.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order, index) => (
            <article key={order._id} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Rental #{index + 1}
                  </p>
                  <h2 className="mt-2 text-lg font-bold text-slate-900">{order._id}</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    {order.contactName} | {order.phone}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {order.address.street}, {order.address.city}, {order.address.state},{" "}
                    {order.address.country} - {order.address.zipcode}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                  <p>
                    <strong>Total:</strong> INR {order.totalPrice}
                  </p>
                  <p className="mt-1 capitalize">
                    <strong>Payment:</strong> {order.paymentMethod}
                  </p>
                  <p className="mt-1">
                    <strong>Outstanding Fine:</strong> INR {order.totalOutstandingFine || 0}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {order.items.map((item) => {
                  const requestKey = `${item.bookId}:${item.documentName}`;
                  const isBusy = activeDocumentKey === requestKey || isRenewing || isReturning;
                  const outstandingFine = Math.max(
                    (item.fineAccrued || 0) - (item.finePaid || 0) - (item.fineWaived || 0),
                    0
                  );

                  return (
                    <div key={item._id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-slate-900">{item.title}</h3>
                          <p className="mt-1 text-sm text-slate-600">Seller: {item.sellerUsername}</p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-600">
                          {item.status}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1 text-sm text-slate-600">
                        <p>Copy number: {item.copyNumber || "Digital"}</p>
                        <p>Issue date: {formatDate(item.issueDate)}</p>
                        <p>Due date: {formatDate(item.dueDate)}</p>
                        <p>Return date: {formatDate(item.returnedDate)}</p>
                        <p>Renewal days: {item.renewalDays}</p>
                        <p>Rental fee: {item.isFree ? "Free" : `INR ${item.price}`}</p>
                        <p>Outstanding fine: INR {outstandingFine}</p>
                      </div>

                      <p className="mt-3 text-sm text-slate-600">
                        Library file:{" "}
                        <span className="font-medium text-slate-800">
                          {item.hasDocument ? item.documentName : "Missing for this listing"}
                        </span>
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={!item.hasDocument || item.status !== "active" || isBusy}
                          onClick={() =>
                            handleOpenDocument(item.bookId, item.documentName, item.documentMimeType)
                          }
                          className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {activeDocumentKey === requestKey ? "Opening..." : "Read File"}
                        </button>
                        <button
                          type="button"
                          disabled={item.status === "returned" || isBusy}
                          onClick={() => handleRenew(order._id, item._id)}
                          className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Renew
                        </button>
                        <button
                          type="button"
                          disabled={item.status === "returned" || isBusy}
                          onClick={() => handleReturn(order._id, item._id)}
                          className="rounded-2xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Return
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      )}

      <CommonNoteBoard />
    </div>
  );
};

export default OrderPage;
