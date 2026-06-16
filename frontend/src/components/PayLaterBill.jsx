import { useState } from "react";
import Swal from "sweetalert2";
import { useSettlePayLaterBillMutation } from "../redux/features/payments/paymentsApi";

const PayLaterBill = ({ payLaterBill, onPaymentSuccess }) => {
  const [customAmount, setCustomAmount] = useState("");
  const [settlePayLaterBill, { isLoading }] = useSettlePayLaterBillMutation();

  if (!payLaterBill || payLaterBill <= 0) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">Pay Later Bill</p>
            <p className="mt-2 text-lg font-bold text-slate-900">₹0</p>
            <p className="mt-1 text-sm text-slate-600">No pending charges on your account.</p>
          </div>
        </div>
      </div>
    );
  }

  const handlePayFull = async () => {
    try {
      await settlePayLaterBill({
        amount: payLaterBill,
        paymentMethod: "gateway",
      }).unwrap();

      await Swal.fire({
        title: "Payment Successful",
        text: `You've paid ₹${payLaterBill.toFixed(2)} towards your bill.`,
        icon: "success",
        confirmButtonText: "Continue",
      });

      onPaymentSuccess?.();
    } catch (error) {
      Swal.fire({
        title: "Payment Failed",
        text: error?.data?.message || "Could not process your payment. Please try again.",
        icon: "error",
      });
    }
  };

  const handlePayPartial = async () => {
    const amount = parseFloat(customAmount);

    if (!customAmount || amount <= 0) {
      Swal.fire({
        title: "Invalid Amount",
        text: "Please enter a valid amount to pay.",
        icon: "error",
      });
      return;
    }

    if (amount > payLaterBill) {
      Swal.fire({
        title: "Amount Too High",
        text: `You can only pay up to ₹${payLaterBill.toFixed(2)}.`,
        icon: "error",
      });
      return;
    }

    try {
      await settlePayLaterBill({
        amount,
        paymentMethod: "gateway",
      }).unwrap();

      await Swal.fire({
        title: "Payment Successful",
        text: `You've paid ₹${amount.toFixed(2)}. Remaining bill: ₹${(payLaterBill - amount).toFixed(2)}`,
        icon: "success",
        confirmButtonText: "Continue",
      });

      setCustomAmount("");
      onPaymentSuccess?.();
    } catch (error) {
      Swal.fire({
        title: "Payment Failed",
        text: error?.data?.message || "Could not process your payment. Please try again.",
        icon: "error",
      });
    }
  };

  return (
    <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">💰 Pay Later Bill</p>
        <p className="mt-2 text-3xl font-bold text-amber-900">₹{payLaterBill.toFixed(2)}</p>
        <p className="mt-1 text-sm text-amber-700">Accumulated charges from renewals and pay-later selections.</p>
      </div>

      <div className="space-y-4">
        {/* Pay Full Amount */}
        <button
          type="button"
          disabled={isLoading}
          onClick={handlePayFull}
          className="w-full rounded-2xl bg-amber-600 px-4 py-3 font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
        >
          {isLoading ? "Processing..." : `Pay Full Bill - ₹${payLaterBill.toFixed(2)}`}
        </button>

        {/* Pay Partial Amount */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">Or pay a custom amount</label>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              max={payLaterBill}
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="Enter amount"
              disabled={isLoading}
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-amber-500"
            />
            <button
              type="button"
              disabled={isLoading || !customAmount}
              onClick={handlePayPartial}
              className="rounded-2xl border border-amber-300 px-4 py-2 font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60"
            >
              {isLoading ? "..." : "Pay"}
            </button>
          </div>
          <p className="text-xs text-slate-500">Maximum: ₹{payLaterBill.toFixed(2)}</p>
        </div>
      </div>

      <p className="mt-4 text-xs text-amber-600">
        📌 <strong>Note:</strong> You selected "Pay Later" for some renewals. This bill accumulates those charges.
      </p>
    </div>
  );
};

export default PayLaterBill;
