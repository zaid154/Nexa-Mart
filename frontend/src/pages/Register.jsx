import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { BrandMark } from "../components/Icons.jsx";

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

    // Check each field and collect any error messages.
    const newErrors = {};
    if (!form.name.trim()) {
      newErrors.name = "Name is required";
    }
    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    }
    if (!form.password) {
      newErrors.password = "Password is required";
    } else if (form.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setLoading(true);
    try {
      const data = await register(form.name, form.email, form.password);
      toast.success("Check your email for the verification code");
      navigate("/verify-otp", { state: { email: data.email } });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update the name field and clear its error.
  const handleNameChange = (e) => {
    setForm({ ...form, name: e.target.value });
    setErrors({ ...errors, name: "" });
  };

  // Update the email field and clear its error.
  const handleEmailChange = (e) => {
    setForm({ ...form, email: e.target.value });
    setErrors({ ...errors, email: "" });
  };

  // Update the password field and clear its error.
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
        <span className="eyebrow">Join us</span>
        <h1>Create account</h1>
        <p className="muted mb-4">Start shopping premium electronics today</p>
        <form className="form" onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              className="input"
              value={form.name}
              onChange={handleNameChange}
              aria-invalid={!!errors.name}
              autoComplete="name"
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>
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
              autoComplete="new-password"
            />
            <p className="form-hint">Min 8 chars, uppercase, lowercase, and a number</p>
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>
          <button type="submit" className="btn btn-block" disabled={loading}>
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>
        <p className="muted text-center auth-footer">
          Already have an account? <Link to="/login" className="text-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
