import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../context/AuthContext";

const AdminLogin = () => {
  const [message, setMessage] = useState("");
  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      username: "ADMIN",
      password: "admin@12345",
    },
  });

  const onSubmit = async (data) => {
    setMessage("");

    try {
      const user = await loginUser(data.username, data.password);

      if (user.role !== "admin") {
        setMessage("This account does not have admin access.");
        return;
      }

      navigate("/dashboard", { replace: true });
    } catch (error) {
      setMessage(error.message || "Admin login failed.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 text-white shadow-2xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">
          Admin Panel
        </p>
        <h1 className="mb-2 text-3xl font-bold">Local administrator sign in</h1>
        <p className="mb-6 text-sm text-slate-300">
          Default credentials are prefilled for the seeded local admin account.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-100" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              {...register("username", { required: true })}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-amber-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-100" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              {...register("password", { required: true })}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-amber-400"
            />
          </div>

          {message ? <p className="text-sm text-rose-400">{message}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-amber-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Signing in..." : "Enter Admin Dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
