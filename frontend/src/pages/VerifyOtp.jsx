import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import api from "../api/client.js";
import { BrandMark } from "../components/Icons.jsx";

// Page where the user types the OTP code sent to their email to verify it.
const VerifyOtp = () => {
  const { verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  // The email is passed from the register page through navigation state.
  let email = "";
  if (location.state && location.state.email) {
    email = location.state.email;
  }

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error("Email missing. Please register again.");
      return;
    }
    if (!code.trim()) {
      setError("OTP code is required");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await verifyOtp(email, code);
      toast.success("Email verified!");
      navigate("/");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Ask the server to send the OTP again.
  const resend = async () => {
    if (!email) {
      return;
    }
    setResending(true);
    try {
      await api.post("/auth/resend-otp", { email, purpose: "verify" });
      toast.success("OTP sent again");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setResending(false);
    }
  };

  // Only allow digits in the OTP input and clear any error.
  const handleCodeChange = (e) => {
    const onlyDigits = e.target.value.replace(/\D/g, "");
    setCode(onlyDigits);
    setError("");
  };

  return (
    <div className="auth-page">
      <div className="card">
        <div className="auth-brand">
          <BrandMark size={52} />
        </div>
        <span className="eyebrow">Verification</span>
        <h1>Verify your email</h1>
        <p className="muted mb-4">
          We sent a 6-digit code to <strong>{email || "your email"}</strong>
        </p>
        <form className="form" onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="code">OTP code</label>
            <input
              id="code"
              className="input"
              maxLength={6}
              value={code}
              onChange={handleCodeChange}
              placeholder="000000"
              aria-invalid={!!error}
              inputMode="numeric"
            />
            {error && <span className="field-error">{error}</span>}
          </div>
          <button type="submit" className="btn btn-block" disabled={loading}>
            {loading ? "Verifying..." : "Verify email"}
          </button>
        </form>
        <p className="muted text-center auth-footer">
          Didn't get it?{" "}
          <button type="button" className="text-link" onClick={resend} disabled={resending}>
            {resending ? "Sending..." : "Resend OTP"}
          </button>
        </p>
        <p className="muted text-center auth-footer">
          <Link to="/login" className="text-link">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default VerifyOtp;
