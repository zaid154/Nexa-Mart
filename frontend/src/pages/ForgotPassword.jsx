import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext.jsx";
import api from "../api/client.js";
import { BrandMark } from "../components/Icons.jsx";

// Page where the user enters their email to receive a password reset code.
const ForgotPassword = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      toast.success("If that email exists, a reset code was sent");
      navigate("/reset-password", { state: { email } });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update the email field and clear any error message.
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setError("");
  };

  return (
    <div className="auth-page">
      <div className="card">
        <div className="auth-brand">
          <BrandMark size={52} />
        </div>
        <span className="eyebrow">Account</span>
        <h1>Forgot password</h1>
        <p className="muted mb-4">Enter your email and we'll send a reset code.</p>
        <form className="form" onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              className="input"
              type="email"
              value={email}
              onChange={handleEmailChange}
              aria-invalid={!!error}
              autoComplete="email"
            />
            {error && <span className="field-error">{error}</span>}
          </div>
          <button type="submit" className="btn btn-block" disabled={loading}>
            {loading ? "Sending..." : "Send reset code"}
          </button>
        </form>
        <p className="muted text-center auth-footer">
          <Link to="/login" className="text-link">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
