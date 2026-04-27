import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import getBaseUrl from "../../../utils/baseURL";
import booksApi from "../books/booksApi";
import { fetchAdminOverview, fetchAdminUsers } from "../admin/adminSlice";
import { getStoredUser } from "../../../context/authStorage";

const baseQuery = fetchBaseQuery({
  baseUrl: `${getBaseUrl()}/api/orders`,
  credentials: "include",
});

const refreshSharedState = async (dispatch, queryFulfilled, { refreshBooks = false } = {}) => {
  try {
    await queryFulfilled;
    if (refreshBooks) {
      dispatch(booksApi.util.invalidateTags(["Books"]));
    }

    const currentUser = getStoredUser();

    if (currentUser?.role === "admin") {
      dispatch(fetchAdminOverview());
      dispatch(fetchAdminUsers());
    }
  } catch (_error) {
    // RTK Query keeps the mutation error in its own state.
  }
};

const ordersApi = createApi({
  reducerPath: "ordersApi",
  baseQuery,
  tagTypes: ["Orders"],
  endpoints: (builder) => ({
    createOrder: builder.mutation({
      query: (newOrder) => ({
        url: "/",
        method: "POST",
        body: newOrder,
      }),
      invalidatesTags: ["Orders"],
      onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
        await refreshSharedState(dispatch, queryFulfilled, { refreshBooks: true });
      },
    }),
    getMyOrders: builder.query({
      query: () => "/mine",
      providesTags: ["Orders"],
    }),
    renewRentalItem: builder.mutation({
      query: ({ orderId, itemId, extraDays }) => ({
        url: `/${orderId}/items/${itemId}/renew`,
        method: "PATCH",
        body: { extraDays },
      }),
      invalidatesTags: ["Orders"],
      onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
        await refreshSharedState(dispatch, queryFulfilled);
      },
    }),
    returnRentalItem: builder.mutation({
      query: ({ orderId, itemId }) => ({
        url: `/${orderId}/items/${itemId}/return`,
        method: "PATCH",
      }),
      invalidatesTags: ["Orders"],
      onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
        await refreshSharedState(dispatch, queryFulfilled, { refreshBooks: true });
      },
    }),
  }),
});

export const {
  useCreateOrderMutation,
  useGetMyOrdersQuery,
  useRenewRentalItemMutation,
  useReturnRentalItemMutation,
} = ordersApi;

export default ordersApi;
