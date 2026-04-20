import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { clearCart } from "../../redux/features/cart/cartSlice";
import { useCreateOrderMutation } from "../../redux/features/orders/ordersApi";
import { useAuth } from "../../context/AuthContext";

const CheckoutPage = () => {
  const cartItems = useSelector((state) => state.cart.cartItems);
  const totalPrice = cartItems.reduce((acc, item) => acc + item.newPrice, 0).toFixed(2);
  const { currentUser } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [createOrder, { isLoading }] = useCreateOrderMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    if (cartItems.length === 0) {
      return;
    }

    const newOrder = {
      contactName: data.contactName,
      phone: data.phone,
      address: {
        street: data.street,
        city: data.city,
        country: data.country,
        state: data.state,
        zipcode: data.zipcode,
      },
      productIds: cartItems.map((item) => item._id),
      paymentMethod,
      demoCard:
        paymentMethod === "demo-card"
          ? {
              cardNumber: data.cardNumber,
              expiry: data.expiry,
              cvc: data.cvc,
            }
          : undefined,
    };

    try {
      await createOrder(newOrder).unwrap();
      dispatch(clearCart());
      await Swal.fire({
        title: "Order placed",
        text: "Your order was created successfully.",
        icon: "success",
        confirmButtonText: "Open My Orders",
      });
      navigate("/orders");
    } catch (error) {
      Swal.fire({
        title: "Checkout failed",
        text: error?.data?.message || "Unable to place your order.",
        icon: "error",
      });
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Your cart is empty</h1>
        <p className="mt-3 text-slate-600">Add a few books before checking out.</p>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-5xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
            Checkout
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Complete your order</h1>
          <p className="mt-2 text-sm text-slate-600">
            Logged in as <strong>{currentUser?.username}</strong>
          </p>
        </div>
        <div className="rounded-2xl bg-slate-900 px-5 py-4 text-white">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Total</p>
          <p className="mt-1 text-2xl font-bold">${totalPrice}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Contact Name</label>
              <input
                type="text"
                {...register("contactName", { required: true })}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-500"
              />
              {errors.contactName ? (
                <p className="mt-1 text-xs text-red-600">Contact name is required.</p>
              ) : null}
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Phone</label>
              <input
                type="text"
                {...register("phone", { required: true })}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Street Address</label>
              <input
                type="text"
                {...register("street", { required: true })}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">City</label>
              <input
                type="text"
                {...register("city", { required: true })}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">State</label>
              <input
                type="text"
                {...register("state", { required: true })}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Country</label>
              <input
                type="text"
                {...register("country", { required: true })}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Zipcode</label>
              <input
                type="text"
                {...register("zipcode", { required: true })}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        <div className="space-y-5 rounded-[1.75rem] bg-slate-50 p-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Payment method</h2>
            <p className="mt-2 text-sm text-slate-600">
              Razorpay is intentionally not active yet. Choose one of the supported local demo
              options.
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <input
                type="radio"
                checked={paymentMethod === "cash"}
                onChange={() => setPaymentMethod("cash")}
              />
              <span>
                <span className="block font-semibold text-slate-900">Cash on Delivery</span>
                <span className="block text-sm text-slate-600">
                  Order stays pending until it is delivered.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <input
                type="radio"
                checked={paymentMethod === "demo-card"}
                onChange={() => setPaymentMethod("demo-card")}
              />
              <span>
                <span className="block font-semibold text-slate-900">Demo Card Payment</span>
                <span className="block text-sm text-slate-600">
                  Simulates a successful payment locally.
                </span>
              </span>
            </label>
          </div>

          {paymentMethod === "demo-card" ? (
            <div className="space-y-4 rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Card Number</label>
                <input
                  type="text"
                  {...register("cardNumber", { required: paymentMethod === "demo-card" })}
                  className="w-full rounded-2xl border border-amber-200 px-4 py-3 outline-none focus:border-amber-500"
                  placeholder="4111 1111 1111 1111"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Expiry</label>
                  <input
                    type="text"
                    {...register("expiry", { required: paymentMethod === "demo-card" })}
                    className="w-full rounded-2xl border border-amber-200 px-4 py-3 outline-none focus:border-amber-500"
                    placeholder="12/30"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">CVC</label>
                  <input
                    type="text"
                    {...register("cvc", { required: paymentMethod === "demo-card" })}
                    className="w-full rounded-2xl border border-amber-200 px-4 py-3 outline-none focus:border-amber-500"
                    placeholder="123"
                  />
                </div>
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl bg-white p-4">
            <h3 className="font-semibold text-slate-900">Order summary</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              {cartItems.map((item) => (
                <div key={item._id} className="flex items-center justify-between gap-4">
                  <span>{item.title}</span>
                  <span className="font-semibold text-slate-900">${item.newPrice}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? "Placing order..." : "Place Order"}
          </button>
        </div>
      </form>
    </section>
  );
};

export default CheckoutPage;
