import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import AuthShell from "../components/AuthShell.jsx";
import { AuthField, PasswordField } from "../components/AuthFields.jsx";

// Login page where an existing user signs in with email and password.
const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // After login, send the user back to the page they came from (or home).
  let from = "/";
  if (location.state && location.state.from && location.state.from.pathname) {
    from = location.state.from.pathname;
  }

  const submit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    }
    if (!form.password) {
      newErrors.password = "Password is required";
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success("Welcome back!");
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (e) => {
    setForm({ ...form, email: e.target.value });
    setErrors({ ...errors, email: "" });
  };

  const handlePasswordChange = (e) => {
    setForm({ ...form, password: e.target.value });
    setErrors({ ...errors, password: "" });
  };

  const perks = [
    "Track every order in one place",
    "Faster checkout with saved addresses",
    "Your wishlist, on every device",
  ];

  return (
    <AuthShell
      heading="Login"
      subheading="Get access to your Orders, Wishlist and Recommendations."
      bullets={perks}
      illustration="user"
      footer={
        <Link to="/register" className="hover:underline">
          New to NexaMart? Create an account
        </Link>
      }
    >
      <form className="space-y-5" onSubmit={submit} noValidate>
        <AuthField
          id="email"
          label="Email address"
          type="email"
          value={form.email}
          onChange={handleEmailChange}
          error={errors.email}
          autoComplete="email"
        />

        <div>
          <PasswordField
            id="password"
            label="Password"
            value={form.password}
            onChange={handlePasswordChange}
            error={errors.password}
            autoComplete="current-password"
          />
          <p className="mt-2 text-right">
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-accent-500 hover:underline"
            >
              Forgot password?
            </Link>
          </p>
        </div>

        <button type="submit" className="btn btn-buy w-full py-3" disabled={loading}>
          {loading ? "Signing in..." : "Login"}
        </button>

        <p className="text-center text-xs leading-relaxed text-ink-400">
          By continuing, you agree to NexaMart&apos;s{" "}
          <Link to="/page/terms" className="text-accent-500 hover:underline">
            Terms of Use
          </Link>{" "}
          and{" "}
          <Link to="/page/privacy" className="text-accent-500 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    </AuthShell>
  );
};

export default Login;
