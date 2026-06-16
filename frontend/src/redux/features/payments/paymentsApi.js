import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import getBaseUrl from "../../../utils/baseURL";

const baseQuery = fetchBaseQuery({
  baseUrl: `${getBaseUrl()}/api/payments`,
  credentials: "include",
});

const paymentsApi = createApi({
  reducerPath: "paymentsApi",
  baseQuery,
  tagTypes: ["Payments"],
  endpoints: (builder) => ({
    // Pay pending fines
    payPendingFines: builder.mutation({
      query: ({ amount, paymentMethod = "gateway" }) => ({
        url: "/fines",
        method: "POST",
        body: { amount, paymentMethod },
      }),
      invalidatesTags: ["Payments"],
    }),

    // Process renewal with immediate payment
    processRenewalPayment: builder.mutation({
      query: ({ orderId, itemId, extraDays, paymentMethod = "gateway" }) => ({
        url: "/renewal",
        method: "POST",
        body: { orderId, itemId, extraDays, paymentMethod },
      }),
      invalidatesTags: ["Payments"],
    }),

    // Process renewal with pay-later
    processRenewalPayLater: builder.mutation({
      query: ({ orderId, itemId, extraDays }) => ({
        url: "/renewal/pay-later",
        method: "POST",
        body: { orderId, itemId, extraDays },
      }),
      invalidatesTags: ["Payments"],
    }),

    // Settle pay-later bill
    settlePayLaterBill: builder.mutation({
      query: ({ amount, paymentMethod = "gateway" }) => ({
        url: "/pay-later/settle",
        method: "POST",
        body: { amount, paymentMethod },
      }),
      invalidatesTags: ["Payments"],
    }),

    // Get payment history
    getPaymentHistory: builder.query({
      query: () => "/history",
      providesTags: ["Payments"],
    }),

    // Admin: Get rental history
    getAdminRentalHistory: builder.query({
      query: (params = {}) => ({
        url: "/admin/rentals",
        params,
      }),
      providesTags: ["Payments"],
    }),

    // Admin: Get fine statistics
    getAdminFineStats: builder.query({
      query: () => "/admin/fines",
      providesTags: ["Payments"],
    }),
  }),
});

export const {
  usePayPendingFinesMutation,
  useProcessRenewalPaymentMutation,
  useProcessRenewalPayLaterMutation,
  useSettlePayLaterBillMutation,
  useGetPaymentHistoryQuery,
  useGetAdminRentalHistoryQuery,
  useGetAdminFineStatsQuery,
} = paymentsApi;

export default paymentsApi;
