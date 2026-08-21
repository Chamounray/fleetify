import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { PencilSimple, Trash, UserPlus } from "@phosphor-icons/react";
import { api, ApiClientError } from "../../api/client";
import { useApi } from "../../api/useApi";
import { useAuth } from "../../auth/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import {
  Button,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  PageHeader,
  Panel,
  StatusBadge,
} from "../../components/ui";

type AdminRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt?: string;
};

const emptyForm = {
  name: "",
  email: "",
  password: "",
};

export function UsersPage() {
  const { admin } = useAuth();
  const isMobile = useIsMobile();
  const { data, error, reload } = useApi<{ admins: AdminRow[] }>("/api/admins");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<AdminRow | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", password: "" });
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  if (admin?.role !== "SuperAdmin") {
    return <Navigate to="/" replace />;
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setFormError("");
    setBusy(true);
    try {
      await api("/api/admins", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: "Admin",
        }),
      });
      setForm(emptyForm);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : "Could not create user");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(row: AdminRow) {
    setEditing(row);
    setEditForm({ name: row.name, email: row.email, password: "" });
    setFormError("");
  }

  async function onSaveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setFormError("");
    setBusy(true);
    try {
      await api(`/api/admins/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          ...(editForm.password ? { password: editForm.password } : {}),
        }),
      });
      setEditing(null);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : "Could not update user");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(row: AdminRow) {
    if (row.role === "SuperAdmin") {
      setFormError("The super admin cannot be deleted");
      return;
    }
    if (!confirm(`Remove ${row.name} (${row.email})? They will lose access immediately.`)) return;
    setFormError("");
    setBusy(true);
    try {
      await api(`/api/admins/${row.id}`, { method: "DELETE" });
      if (editing?.id === row.id) setEditing(null);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : "Could not delete user");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="User management">
        Create admins who can run the fleet. Only you (super admin) can open this page.
      </PageHeader>
      {error ? <ErrorBanner message={error} /> : null}
      {formError ? <ErrorBanner message={formError} /> : null}

      <Panel className={`mb-4 ${isMobile ? "!p-4" : ""}`}>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <UserPlus size={16} weight="bold" />
          Add admin
        </h2>
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={onCreate}>
          <Field label="Full name" id="u-name">
            <Input
              id="u-name"
              className="h-11"
              value={form.name}
              onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
              required
              minLength={2}
            />
          </Field>
          <Field label="Email" id="u-email">
            <Input
              id="u-email"
              type="email"
              className="h-11"
              value={form.email}
              onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
              required
            />
          </Field>
          <Field label="Password" id="u-pass">
            <Input
              id="u-pass"
              type="password"
              className="h-11"
              value={form.password}
              onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))}
              required
              minLength={10}
              autoComplete="new-password"
            />
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={busy} className="h-11 w-full">
              Create admin
            </Button>
          </div>
        </form>
        <p className="mt-2 text-xs text-slate-ink">
          New accounts are Admins. They can use every feature except this user management page.
        </p>
      </Panel>

      {editing ? (
        <Panel className={`mb-4 ${isMobile ? "!p-4" : ""}`}>
          <h2 className="mb-3 text-sm font-semibold">Edit {editing.name}</h2>
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={onSaveEdit}>
            <Field label="Full name" id="e-name">
              <Input
                id="e-name"
                className="h-11"
                value={editForm.name}
                onChange={(e) => setEditForm((c) => ({ ...c, name: e.target.value }))}
                required
              />
            </Field>
            <Field label="Email" id="e-email">
              <Input
                id="e-email"
                type="email"
                className="h-11"
                value={editForm.email}
                onChange={(e) => setEditForm((c) => ({ ...c, email: e.target.value }))}
                required
              />
            </Field>
            <Field label="New password (optional)" id="e-pass">
              <Input
                id="e-pass"
                type="password"
                className="h-11"
                value={editForm.password}
                onChange={(e) => setEditForm((c) => ({ ...c, password: e.target.value }))}
                minLength={10}
                autoComplete="new-password"
                placeholder="Leave blank to keep"
              />
            </Field>
            <div className="flex items-end gap-2">
              <Button type="submit" disabled={busy} className="h-11 flex-1">Save</Button>
              <Button type="button" variant="secondary" className="h-11" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}

      <Panel className={isMobile ? "!p-4" : ""}>
        {!data?.admins.length ? (
          <EmptyState title="No users" body="Create the first additional admin above." />
        ) : isMobile ? (
          <ul className="space-y-2">
            {data.admins.map((row) => (
              <li key={row.id} className="rounded-2xl bg-canvas p-4 ring-1 ring-line">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{row.name}</p>
                    <p className="text-sm text-slate-ink">{row.email}</p>
                  </div>
                  <StatusBadge value={row.role} />
                </div>
                {row.role !== "SuperAdmin" ? (
                  <div className="mt-3 flex gap-2">
                    <Button type="button" variant="secondary" className="h-11 flex-1" onClick={() => startEdit(row)}>
                      <PencilSimple size={16} /> Edit
                    </Button>
                    <Button type="button" variant="danger" className="h-11 flex-1" disabled={busy} onClick={() => void onDelete(row)}>
                      <Trash size={16} /> Remove
                    </Button>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-ink">This is the super admin account.</p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-slate-500">
                <th className="py-2">Name</th>
                <th>Email</th>
                <th>Role</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.admins.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="py-3 font-medium">{row.name}</td>
                  <td>{row.email}</td>
                  <td><StatusBadge value={row.role} /></td>
                  <td className="text-right">
                    {row.role === "SuperAdmin" ? (
                      <span className="text-xs text-slate-ink">Protected</span>
                    ) : (
                      <span className="inline-flex gap-3">
                        <button type="button" className="cursor-pointer text-action" onClick={() => startEdit(row)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="cursor-pointer text-drain"
                          disabled={busy}
                          onClick={() => void onDelete(row)}
                        >
                          Remove
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
