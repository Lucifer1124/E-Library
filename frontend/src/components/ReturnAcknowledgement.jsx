import { useEffect } from "react";

const ReturnAcknowledgement = ({ acknowledgement, isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      // Auto-close after 8 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !acknowledgement) {
    return null;
  }

  const fineAmount = acknowledgement.outstandingFine || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-[2rem] border border-emerald-200 bg-white p-6 shadow-lg">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="inline-block rounded-full bg-emerald-100 p-4 mb-3">
            <svg className="h-8 w-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Return Confirmed</h2>
          <p className="mt-1 text-sm text-slate-600">Your book has been successfully returned</p>
        </div>

        {/* Book Details */}
        <div className="rounded-2xl bg-slate-50 p-4 mb-6 space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Book Title</span>
            <span className="font-semibold text-slate-900">{acknowledgement.bookTitle}</span>
          </div>

          {acknowledgement.copyNumber && (
            <div className="flex justify-between border-t border-slate-200 pt-3">
              <span className="text-sm text-slate-600">Copy Number</span>
              <span className="font-semibold text-slate-900">{acknowledgement.copyNumber}</span>
            </div>
          )}

          <div className="flex justify-between border-t border-slate-200 pt-3">
            <span className="text-sm text-slate-600">Issue Date</span>
            <span className="font-semibold text-slate-900">{new Date(acknowledgement.issueDate).toLocaleDateString()}</span>
          </div>

          <div className="flex justify-between border-t border-slate-200 pt-3">
            <span className="text-sm text-slate-600">Due Date</span>
            <span className="font-semibold text-slate-900">{new Date(acknowledgement.dueDate).toLocaleDateString()}</span>
          </div>

          <div className="flex justify-between border-t border-slate-200 pt-3">
            <span className="text-sm text-slate-600">Returned Date</span>
            <span className="font-semibold text-slate-900">
              {new Date(acknowledgement.returnedDate).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Fine Information */}
        {fineAmount > 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 mb-6">
            <p className="text-sm font-semibold text-amber-900">⚠ Outstanding Fine</p>
            <p className="mt-2 text-2xl font-bold text-amber-900">₹{fineAmount.toFixed(2)}</p>
            <p className="mt-2 text-xs text-amber-700">
              You returned this book after the due date. The fine has been added to your account. You can pay it from your dashboard.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 mb-6">
            <p className="text-sm font-semibold text-emerald-900">✓ No Fine</p>
            <p className="mt-1 text-xs text-emerald-700">You returned this book on time. Great job!</p>
          </div>
        )}

        {/* Action Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800"
        >
          Close
        </button>

        {/* Auto-close message */}
        <p className="mt-4 text-center text-xs text-slate-500">This modal will close automatically in 8 seconds</p>
      </div>
    </div>
  );
};

export default ReturnAcknowledgement;
