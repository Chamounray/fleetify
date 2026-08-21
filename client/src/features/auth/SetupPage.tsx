import { FormEvent, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { ApiClientError } from "../../api/client";
import { Field, Input, Panel } from "../../components/ui";
import { AuthFrame, AuthFormFields } from "./AuthFrame";

export function SetupPage() {
  const { setup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await setup({ name, email, password });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Setup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame
      title="Create the only admin this yard needs."
      body="This route refuses a second account. Keep the password on this machine."
    >
      <Panel>
        <h2 className="text-2xl font-semibold tracking-tight">Create admin</h2>
        <p className="mt-1 text-sm text-slate-ink">Name, email, and a password of at least 10 characters.</p>
        <AuthFormFields
          error={error}
          loading={loading}
          submitLabel="Create admin"
          onSubmit={onSubmit}
          extra={(
            <>
              <Field label="Name" id="name">
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="h-11" />
              </Field>
              <Field label="Email" id="email">
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
              </Field>
              <Field label="Password" id="password">
                <Input
                  id="password"
                  type="password"
                  minLength={10}
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
