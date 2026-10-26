import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/authContext.jsx";
import { useToast } from "../context/toastContext.jsx";
import api from "../api/apiClient.js";
import AuthShell from "./authShell.jsx";
import { CodeInput } from "./authFields.jsx";

// Page where the user types the OTP code sent to their email to verify it.
const VerifyOtp = () => {
  const { verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [email, setEmail] = useState(() => {
    return (
      (location.state && location.state.email) ||
      sessionStorage.getItem("pending_verification_email") ||
      ""
    );
  });
  const [editingEmail, setEditingEmail] = useState(!email);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();

    const targetEmail = email.trim();
    if (!targetEmail) {
      toast.error("Please enter your email address.");
      setEditingEmail(true);
      return;
    }
    if (!code.trim()) {
      setError("OTP code is required");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await verifyOtp(targetEmail, code);
      sessionStorage.removeItem("pending_verification_email");
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
    const targetEmail = email.trim();
    if (!targetEmail) {
      toast.error("Please enter your email address to resend OTP.");
      setEditingEmail(true);
      return;
    }
    setResending(true);
    try {
      await api.post("/auth/resend-otp", { email: targetEmail, purpose: "verify" });
      sessionStorage.setItem("pending_verification_email", targetEmail);
      toast.success("OTP sent again to " + targetEmail);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setResending(false);
    }
  };

  // Only allow digits in the OTP boxes and clear any error.
  const handleCodeChange = (next) => {
    setCode(next);
    setError("");
  };

  return (
    <AuthShell
      heading="Verify your email"
      subheading="Enter the 6-digit code we just emailed you to activate your NexaMart account."
      illustration="otp"
      steps={["Your details", "Verify email"]}
      activeStep={1}
      footer={
        <Link to="/login" className="hover:underline">
          Back to Login
        </Link>
      }
    >
      <div className="mb-6 rounded-sm bg-accent-50 px-4 py-3 text-sm text-ink-600 flex items-center justify-between">
        <div>
          Code sent to{" "}
          <strong className="font-semibold text-ink-900">{email || "your email"}</strong>
        </div>
        <button
          type="button"
          onClick={() => setEditingEmail((prev) => !prev)}
          className="text-xs text-accent-600 hover:underline font-medium ml-2"
        >
          {editingEmail ? "Done" : "Change"}
        </button>
      </div>

      {editingEmail && (
        <div className="mb-5 space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-ink-500">
            Account Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              sessionStorage.setItem("pending_verification_email", e.target.value.trim());
            }}
            placeholder="e.g. name@example.com"
            className="w-full rounded border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
          />
        </div>
      )}

      <form className="space-y-6" onSubmit={submit} noValidate>
        <div>
          <p className="label">Enter the 6-digit code</p>
          <CodeInput value={code} onChange={handleCodeChange} error={error} autoFocus />
        </div>

        <button type="submit" className="btn btn-buy w-full py-3" disabled={loading}>
          {loading ? "Verifying..." : "Verify"}
        </button>

        <p className="text-center text-sm text-ink-500">
          Didn&apos;t get it?{" "}
          <button
            type="button"
            className="font-semibold text-accent-500 hover:underline disabled:pointer-events-none disabled:opacity-60"
            onClick={resend}
            disabled={resending}
          >
            {resending ? "Sending..." : "Resend OTP"}
          </button>
        </p>
      </form>
    </AuthShell>
  );
};

export default VerifyOtp;
