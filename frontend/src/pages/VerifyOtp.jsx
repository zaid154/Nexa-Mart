import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import api from "../api/client.js";
import AuthShell from "../components/AuthShell.jsx";
import { CodeInput } from "../components/AuthFields.jsx";

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
      <div className="mb-6 rounded-sm bg-accent-50 px-4 py-3 text-sm text-ink-600">
        Code sent to{" "}
        <strong className="font-semibold text-ink-900">{email || "your email"}</strong>
      </div>

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
