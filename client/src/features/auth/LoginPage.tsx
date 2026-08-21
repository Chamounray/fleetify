import { FormEvent, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { ApiClientError } from "../../api/client";
import { Field, Input, Panel } from "../../components/ui";
import { AuthFrame, AuthFormFields } from "./AuthFrame";

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame
      title="Run the yard from one screen."
      body="Bookings, returns, maintenance, and profit sit in the same shift view."
    >
      <Panel>
        <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
        <p className="mt-1 text-sm text-slate-ink">Use the local admin account. Setup closes after the first user.</p>
        <AuthFormFields
          error={error}
          loading={loading}
          submitLabel="Sign in"
          onSubmit={onSubmit}
          extra={(
            <>
              <Field label="Email" id="email">
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </Field>
              <Field label="Password" id="password">
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11"
                />
              </Field>
            </>
          )}
        />
      </Panel>
    </AuthFrame>
  );
}
