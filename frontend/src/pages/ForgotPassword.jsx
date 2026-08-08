import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext.jsx";
import api from "../api/client.js";
import AuthShell from "../components/AuthShell.jsx";
import { AuthField } from "../components/AuthFields.jsx";

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
    <AuthShell
      heading="Forgot password?"
      subheading="Enter your registered email and we’ll send you a code to reset it."
      illustration="lock"
      steps={["Email", "New password"]}
      activeStep={0}
      footer={
        <Link to="/login" className="hover:underline">
          Back to Login
        </Link>
      }
    >
      <form className="space-y-6" onSubmit={submit} noValidate>
        <AuthField
          id="email"
          label="Email address"
          type="email"
          value={email}
          onChange={handleEmailChange}
          error={error}
          autoComplete="email"
          hint="We’ll email you a 6-digit code. It expires in 10 minutes."
        />

        <button type="submit" className="btn btn-buy w-full py-3" disabled={loading}>
          {loading ? "Sending..." : "Send Reset Code"}
        </button>

        <p className="text-center text-sm text-ink-500">
          Remembered it?{" "}
          <Link to="/login" className="font-semibold text-accent-500 hover:underline">
            Sign in instead
          </Link>
        </p>
      </form>
    </AuthShell>
  );
};

export default ForgotPassword;
