import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useToast } from "../context/ToastContext.jsx";
import api from "../api/client.js";
import { BrandMark } from "../components/Icons.jsx";

// Page where the user enters the reset code and a new password.
const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  // The email may come from the forgot-password page.
  let emailFromState = "";
  if (location.state && location.state.email) {
    emailFromState = location.state.email;
  }

  const [form, setForm] = useState({
    email: emailFromState,
    code: "",
    password: "",
    confirm: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const submit = async (e) => {
    e.preventDefault();

    // Validate all fields and collect error messages.
    const newErrors = {};
    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    }
    if (!form.code.trim()) {
      newErrors.code = "Reset code is required";
    }
    if (!form.password) {
      newErrors.password = "Password is required";
    }
    if (form.password !== form.confirm) {
      newErrors.confirm = "Passwords do not match";
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        email: form.email,
        code: form.code,
        password: form.password,
      });
      toast.success("Password reset! You can sign in now.");
      navigate("/login");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update the email field.
  const handleEmailChange = (e) => {
    setForm({ ...form, email: e.target.value });
  };

  // Update the reset code field, allowing only digits.
  const handleCodeChange = (e) => {
    const onlyDigits = e.target.value.replace(/\D/g, "");
    setForm({ ...form, code: onlyDigits });
  };

  // Update the new password field.
  const handlePasswordChange = (e) => {
    setForm({ ...form, password: e.target.value });
  };

  // Update the confirm password field.
  const handleConfirmChange = (e) => {
    setForm({ ...form, confirm: e.target.value });
  };

  return (
    <div className="auth-page">
      <div className="card">
        <div className="auth-brand">
          <BrandMark size={52} />
        </div>
        <span className="eyebrow">Account</span>
        <h1>Reset password</h1>
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
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>
          <div className="field">
            <label htmlFor="code">Reset code</label>
            <input
              id="code"
              className="input"
              maxLength={6}
              value={form.code}
              onChange={handleCodeChange}
              aria-invalid={!!errors.code}
            />
            {errors.code && <span className="field-error">{errors.code}</span>}
          </div>
          <div className="field">
            <label htmlFor="password">New password</label>
            <input
              id="password"
              className="input"
              type="password"
              value={form.password}
              onChange={handlePasswordChange}
              aria-invalid={!!errors.password}
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>
          <div className="field">
            <label htmlFor="confirm">Confirm password</label>
            <input
              id="confirm"
              className="input"
              type="password"
              value={form.confirm}
              onChange={handleConfirmChange}
              aria-invalid={!!errors.confirm}
            />
            {errors.confirm && <span className="field-error">{errors.confirm}</span>}
          </div>
          <button type="submit" className="btn btn-block" disabled={loading}>
            {loading ? "Resetting..." : "Reset password"}
          </button>
        </form>
        <p className="muted text-center auth-footer">
          <Link to="/login" className="text-link">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
