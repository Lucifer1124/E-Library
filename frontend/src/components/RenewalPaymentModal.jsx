import { useState } from "react";
import Swal from "sweetalert2";
import {
  useProcessRenewalPaymentMutation,
  useProcessRenewalPayLaterMutation,
} from "../redux/features/payments/paymentsApi";

const RENEWAL_RATE = 2;

const RenewalPaymentModal = ({ orderId, itemId, bookTitle, extraDays, isOpen, onClose, onSuccess }) => {
  const [paymentMethod, setPaymentMethod] = useState("gateway");
  const [processRenewalPayment, { isLoading: isPayNowLoading }] = useProcessRenewalPaymentMutation();
  const [processRenewalPayLater, { isLoading: isPayLaterLoading }] = useProcessRenewalPayLaterMutation();

  const renewalCost = extraDays * RENEWAL_RATE;

  const handlePayNow = async () => {
    try {
      await processRenewalPayment({
        orderId,
        itemId,
        extraDays,
        paymentMethod,
      }).unwrap();

      await Swal.fire({
        title: "Renewal Confirmed",
        text: `You've paid ₹${renewalCost} for ${extraDays} extra day(s).`,
        icon: "success",
        confirmButtonText: "Continue",
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      Swal.fire({
        title: "Payment Failed",
        text: error?.data?.message || "Could not process your payment. Please try again.",
        icon: "error",
      });
    }
  };

  const handlePayLater = async () => {
    try {
      const result = await processRenewalPayLater({
        orderId,
        itemId,
        extraDays,
      }).unwrap();

      await Swal.fire({
        title: "Added to Pay Later Bill",
        html: `<p>₹${renewalCost} for ${extraDays} day(s) has been added to your pending bill.</p>
               <p class="mt-2 text-sm">Your total pending bill is now: <strong>₹${result.payLaterBill}</strong></p>`,
        icon: "success",
        confirmButtonText: "Continue",
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: error?.data?.message || "Could not process your request. Please try again.",
        icon: "error",
      });
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-lg">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Renew "{bookTitle}"?</h2>
          <p className="mt-2 text-sm text-slate-600">Choose how you'd like to pay for your extension.</p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 mb-6">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-slate-600">Extra days</p>
              <p className="font-bold text-slate-900">{extraDays}</p>
            </div>
            <div>
              <p className="text-slate-600">Cost per day</p>
              <p className="font-bold text-slate-900">₹{RENEWAL_RATE}</p>
            </div>
            <div className="col-span-2 border-t border-slate-200 pt-2">
              <p className="text-slate-600">Total cost</p>
              <p className="text-xl font-bold text-slate-900">₹{renewalCost}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {/* Pay Now Option */}
          <button
            type="button"
            disabled={isPayNowLoading || isPayLaterLoading}
            onClick={handlePayNow}
            className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {isPayNowLoading ? "Processing..." : `Pay Now - ₹${renewalCost}`}
          </button>

          {/* Pay Later Option */}
          <button
            type="button"
            disabled={isPayNowLoading || isPayLaterLoading}
            onClick={handlePayLater}
            className="w-full rounded-2xl border-2 border-amber-500 px-4 py-3 font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-60"
          >
            {isPayLaterLoading ? "Processing..." : `Add to Bill - Pay Later`}
          </button>
        </div>

        <button
          type="button"
          disabled={isPayNowLoading || isPayLaterLoading}
          onClick={onClose}
          className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          Cancel
        </button>

        <p className="mt-4 text-xs text-slate-500">
          <strong>Pay Now:</strong> Immediate payment via gateway
          <br />
          <strong>Pay Later:</strong> Charges added to your account bill
        </p>
      </div>
    </div>
  );
};

export default RenewalPaymentModal;
