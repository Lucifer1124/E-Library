import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../context/AuthContext";

const accent = "#8672FF";

const Register = () => {
  const [message, setMessage] = useState("");
  const { registerUser } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async ({ username, password, confirmPassword }) => {
    setMessage("");

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    try {
      await registerUser(username, password);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setMessage(error.message || "Unable to create account.");
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-160px)] items-center justify-center">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: accent }}>
          Seller Ready
        </p>
        <h1 className="mb-2 text-3xl font-bold text-slate-900">Create your account</h1>
        <p className="mb-6 text-sm text-slate-600">
          Every registered user can browse, buy, and sell books from the same account.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              {...register("username", { required: true, minLength: 3 })}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition"
              placeholder="Choose a username"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register("password", { required: true, minLength: 8 })}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition"
              placeholder="Minimum 8 characters"
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-semibold text-slate-700"
              htmlFor="confirmPassword"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register("confirmPassword", {
                required: true,
                validate: (value) => value === watch("password"),
              })}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition"
              placeholder="Re-enter password"
            />
          </div>

          {message ? <p className="text-sm text-red-600">{message}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl px-4 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-70"
            style={{ backgroundColor: accent }}
          >
            {isSubmitting ? "Creating..." : "Register"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold" style={{ color: accent }}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
