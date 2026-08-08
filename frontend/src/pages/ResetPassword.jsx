import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useToast } from "../context/ToastContext.jsx";
import api from "../api/client.js";
import AuthShell from "../components/AuthShell.jsx";
import { AuthField, CodeInput, PasswordField } from "../components/AuthFields.jsx";

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
    setErrors({ ...errors, email: "" });
  };

  // Update the reset code, which the boxes already keep digits-only.
  const handleCodeChange = (next) => {
    setForm({ ...form, code: next });
    setErrors({ ...errors, code: "" });
  };

  // Update the new password field.
  const handlePasswordChange = (e) => {
    setForm({ ...form, password: e.target.value });
    setErrors({ ...errors, password: "" });
  };

  // Update the confirm password field.
  const handleConfirmChange = (e) => {
    setForm({ ...form, confirm: e.target.value });
    setErrors({ ...errors, confirm: "" });
  };

  // Both passwords typed and matching — worth confirming right away rather
  // than waiting for the submit to complain.
  const matches =
    form.confirm.length > 0 && form.password.length > 0 && form.password === form.confirm;

  return (
    <AuthShell
      heading="Reset your password"
      subheading="Enter the code we emailed you and pick a new password for your account."
      illustration="lock"
      steps={["Email", "New password"]}
      activeStep={1}
      footer={
        <Link to="/login" className="hover:underline">
          Back to Login
        </Link>
      }
    >
      {emailFromState ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-sm bg-accent-50 px-4 py-3 text-sm text-ink-600">
          <span>
            Code sent to{" "}
            <strong className="font-semibold text-ink-900">{emailFromState}</strong>
          </span>
          <Link
            to="/forgot-password"
            className="text-xs font-semibold text-accent-500 hover:underline"
          >
            Change
          </Link>
        </div>
      ) : null}

      <form className="space-y-5" onSubmit={submit} noValidate>
        {!emailFromState && (
          <AuthField
            id="email"
            label="Email address"
            type="email"
            value={form.email}
            onChange={handleEmailChange}
            error={errors.email}
            autoComplete="email"
          />
        )}

        <div>
          <p className="label">Reset code</p>
          <CodeInput
            value={form.code}
            onChange={handleCodeChange}
            error={errors.code}
            autoFocus={!!emailFromState}
          />
        </div>

        <PasswordField
          id="password"
          label="New password"
          value={form.password}
          onChange={handlePasswordChange}
          error={errors.password}
          autoComplete="new-password"
          strength
        />

        <div>
          <PasswordField
            id="confirm"
            label="Confirm new password"
            value={form.confirm}
            onChange={handleConfirmChange}
            error={errors.confirm}
            autoComplete="new-password"
          />
          {matches && !errors.confirm && (
            <p className="mt-1 text-xs font-medium text-success">Passwords match</p>
          )}
        </div>

        <button type="submit" className="btn btn-buy w-full py-3" disabled={loading}>
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </form>
    </AuthShell>
  );
};

export default ResetPassword;
