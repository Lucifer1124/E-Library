import { useState } from "react";
import Swal from "sweetalert2";
import { usePayPendingFinesMutation } from "../redux/features/payments/paymentsApi";

const FinePaymentCard = ({ pendingFines, onPaymentSuccess }) => {
  const [customAmount, setCustomAmount] = useState("");
  const [payPendingFines, { isLoading }] = usePayPendingFinesMutation();

  if (!pendingFines || pendingFines <= 0) {
    return (
      <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Account Status</p>
            <p className="mt-2 text-lg font-bold text-emerald-900">✓ No Pending Fines</p>
            <p className="mt-1 text-sm text-emerald-700">Your account is in good standing.</p>
          </div>
        </div>
      </div>
    );
  }

  const handlePayFull = async () => {
    try {
      await payPendingFines({
        amount: pendingFines,
        paymentMethod: "gateway",
      }).unwrap();

      await Swal.fire({
        title: "Payment Successful",
        text: `You've paid ₹${pendingFines} in fines. Your account has been restored.`,
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

    if (amount > pendingFines) {
      Swal.fire({
        title: "Amount Too High",
        text: `You can only pay up to ₹${pendingFines}.`,
        icon: "error",
      });
      return;
    }

    try {
      await payPendingFines({
        amount,
        paymentMethod: "gateway",
      }).unwrap();

      await Swal.fire({
        title: "Payment Successful",
        text: `You've paid ₹${amount}. Remaining fine: ₹${(pendingFines - amount).toFixed(2)}`,
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
    <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-700">⚠ Pending Fines</p>
        <p className="mt-2 text-3xl font-bold text-rose-900">₹{pendingFines.toFixed(2)}</p>
        <p className="mt-1 text-sm text-rose-700">
          You have outstanding fines. Clear them to continue renting books.
        </p>
      </div>

      <div className="space-y-4">
        {/* Pay Full Amount */}
        <button
          type="button"
          disabled={isLoading}
          onClick={handlePayFull}
          className="w-full rounded-2xl bg-rose-600 px-4 py-3 font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
        >
          {isLoading ? "Processing..." : `Pay Full Amount - ₹${pendingFines.toFixed(2)}`}
        </button>

        {/* Pay Partial Amount */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">Or pay a custom amount</label>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              max={pendingFines}
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="Enter amount"
              disabled={isLoading}
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-rose-500"
            />
            <button
              type="button"
              disabled={isLoading || !customAmount}
              onClick={handlePayPartial}
              className="rounded-2xl border border-rose-300 px-4 py-2 font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
            >
              {isLoading ? "..." : "Pay"}
            </button>
          </div>
          <p className="text-xs text-slate-500">Maximum: ₹{pendingFines.toFixed(2)}</p>
        </div>
      </div>

      <p className="mt-4 text-xs text-rose-600">
        💡 <strong>Tip:</strong> Clear your fines to restore account access and resume book rentals.
      </p>
    </div>
  );
};

export default FinePaymentCard;
