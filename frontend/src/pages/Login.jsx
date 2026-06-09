import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { BrandMark } from "../components/Icons.jsx";

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

    // Simple validation: both fields are required.
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

  // Update the email field and clear its error message.
  const handleEmailChange = (e) => {
    setForm({ ...form, email: e.target.value });
    setErrors({ ...errors, email: "" });
  };

  // Update the password field and clear its error message.
  const handlePasswordChange = (e) => {
    setForm({ ...form, password: e.target.value });
    setErrors({ ...errors, password: "" });
  };

  return (
    <div className="auth-page">
      <div className="card">
        <div className="auth-brand">
          <BrandMark size={52} />
        </div>
        <span className="eyebrow">Account</span>
        <h1>Sign in</h1>
        <p className="muted mb-4">Welcome back to NexaMart</p>
        <form className="form" onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              className="input"
              type="email"
              value={form.email}
              onChange={handleEmailChange}
              aria-invalid={!!errors.email}
              autoComplete="email"
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              className="input"
              type="password"
              value={form.password}
              onChange={handlePasswordChange}
              aria-invalid={!!errors.password}
              autoComplete="current-password"
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>
          <p className="form-hint">
            <Link to="/forgot-password" className="text-link">Forgot password?</Link>
          </p>
          <button type="submit" className="btn btn-block" disabled={loading}>
            {loading ? <span className="loader" aria-hidden="true" /> : null}
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="muted text-center auth-footer">
          No account? <Link to="/register" className="text-link">Create one</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
