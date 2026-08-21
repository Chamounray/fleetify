import { type FormEvent, type ReactNode } from "react";
import { BrandLockup, BrandMark } from "../../components/BrandMark";
import { Button, ErrorBanner } from "../../components/ui";
import { ThemeToggle } from "../../theme/ThemeToggle";

export function AuthFrame({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-[100dvh] bg-canvas lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,1fr)]">
      <section className="relative hidden overflow-hidden lg:block">
        <img
          src="/login-hero.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1220] via-[#0b1220]/55 to-[#0b1220]/15" />
        <div className="relative flex min-h-[100dvh] flex-col justify-between p-10">
          <BrandLockup inverted />
          <div className="max-w-md">
            <h1 className="text-[2.5rem] font-semibold leading-[1.1] tracking-tight text-white">{title}</h1>
            <p className="mt-4 max-w-[40ch] text-sm leading-relaxed text-white/75">{body}</p>
          </div>
        </div>
      </section>
      <section className="relative flex items-center justify-center px-4 py-10 md:px-8">
        <ThemeToggle className="absolute right-4 top-4 hover:bg-surface" />
        <div className="w-full max-w-[400px]">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <BrandMark size={40} />
            <p className="text-lg font-semibold tracking-tight">Fleetify</p>
          </div>
          {children}
        </div>
      </section>
    </div>
  );
}

export function AuthFormFields({
  error,
  loading,
  submitLabel,
  onSubmit,
  extra,
}: {
  error: string;
  loading: boolean;
  submitLabel: string;
  onSubmit: (event: FormEvent) => void;
  extra?: ReactNode;
}) {
  return (
    <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
      {error ? <ErrorBanner message={error} /> : null}
      {extra}
      <Button type="submit" disabled={loading} className="mt-1 h-11 w-full">
        {loading ? "Working..." : submitLabel}
      </Button>
    </form>
  );
}
