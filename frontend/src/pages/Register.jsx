import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import AuthShell from "../components/AuthShell.jsx";
import { AuthField, PasswordField } from "../components/AuthFields.jsx";

// Register page where a new user creates an account.
const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const submit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!form.name.trim()) {
      newErrors.name = "Name is required";
    }
    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    }
    // These rules must match the server's password check, otherwise the form
    // looks happy and the server rejects the account anyway.
    if (!form.password) {
      newErrors.password = "Password is required";
    } else if (form.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setLoading(true);
    try {
      const data = await register(form.name, form.email, form.password);
      sessionStorage.setItem("pending_verification_email", (data?.email || form.email).trim());
      toast.success(data?.message || "Check your email for the verification code");
      navigate("/verify-otp", { state: { email: (data?.email || form.email).trim() } });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (e) => {
    setForm({ ...form, name: e.target.value });
    setErrors({ ...errors, name: "" });
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
    "Faster checkout & saved addresses",
    "Track every order in one place",
    "Wishlist and exclusive deals",
  ];

  return (
    <AuthShell
      heading="Looks like you’re new here!"
      subheading="Sign up to get the full NexaMart experience."
      bullets={perks}
      illustration="bag"
      steps={["Your details", "Verify email"]}
      activeStep={0}
      footer={
        <Link to="/login" className="hover:underline">
          Existing User? Log in
        </Link>
      }
    >
      <form className="space-y-5" onSubmit={submit} noValidate>
        <AuthField
          id="name"
          label="Full name"
          value={form.name}
          onChange={handleNameChange}
          error={errors.name}
          autoComplete="name"
        />

        <AuthField
          id="email"
          label="Email address"
          type="email"
          value={form.email}
          onChange={handleEmailChange}
          error={errors.email}
          autoComplete="email"
        />

        <PasswordField
          id="password"
          label="Create password"
          value={form.password}
          onChange={handlePasswordChange}
          error={errors.password}
          autoComplete="new-password"
          strength
        />

        <button type="submit" className="btn btn-buy w-full py-3" disabled={loading}>
          {loading ? "Creating..." : "Continue"}
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

export default Register;
