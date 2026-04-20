import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../context/AuthContext";

const accent = "#8672FF";

const Login = () => {
  const [message, setMessage] = useState("");
  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data) => {
    setMessage("");

    try {
      const user = await loginUser(data.username, data.password);
      const redirectPath =
        location.state?.from?.pathname || (user.role === "admin" ? "/dashboard" : "/");

      navigate(redirectPath, { replace: true });
    } catch (error) {
      setMessage(error.message || "Invalid username or password.");
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-160px)] items-center justify-center">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: accent }}>
          Local Access
        </p>
        <h1 className="mb-2 text-3xl font-bold text-slate-900">Sign in with username</h1>
        <p className="mb-6 text-sm text-slate-600">
          Admin account pass is with the Admin hadler <strong>ADMIN</strong>.
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
              {...register("username", { required: true })}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition"
              style={{ boxShadow: "none" }}
              placeholder="Enter your username"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register("password", { required: true })}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition"
              placeholder="Enter your password"
            />
          </div>

          {message ? <p className="text-sm text-red-600">{message}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl px-4 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-70"
            style={{ backgroundColor: accent }}
          >
            {isSubmitting ? "Signing in..." : "Login"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          Need an account?{" "}
          <Link to="/register" className="font-semibold" style={{ color: accent }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
