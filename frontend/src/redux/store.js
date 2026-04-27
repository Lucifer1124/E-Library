import { configureStore } from '@reduxjs/toolkit'
import cartReducer from './features/cart/cartSlice'
import booksApi from './features/books/booksApi'
import bookReducer from './features/books/bookSlice'
import ordersApi from './features/orders/ordersApi'
import adminReducer from './features/admin/adminSlice'

export const store = configureStore({
  reducer: {
    cart: cartReducer,
    admin: adminReducer,
    bookState: bookReducer,
    [booksApi.reducerPath]: booksApi.reducer,
    [ordersApi.reducerPath]: ordersApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(booksApi.middleware, ordersApi.middleware),
})
