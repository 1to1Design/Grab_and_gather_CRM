"use client";

import type { ReactNode } from "react";

/** Shared surfaces and controls, sized for one-handed use during an attack. */

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`print-plain rounded-2xl border border-line bg-surface p-4 ${className}`}
    >
      {children}
    </section>
  );
}

export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-lg font-semibold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <header className="mb-5">
      <h1 className="text-3xl font-bold tracking-tight">{children}</h1>
      {sub ? <p className="mt-1 text-muted">{sub}</p> : null}
    </header>
  );
}

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "md" | "lg";
  disabled?: boolean;
  className?: string;
};

export function Button({
  children,
  onClick,
  type = "button",
  variant = "secondary",
  size = "md",
  disabled,
  className = "",
}: ButtonProps) {
  const variants = {
    primary: "bg-accent text-accent-ink font-semibold hover:brightness-110",
    secondary: "bg-surface-2 text-text border border-line hover:border-muted",
    danger: "bg-[#7d2f2b] text-[#ffe9e6] font-semibold hover:brightness-110",
    ghost: "text-muted hover:text-text",
  };
  const sizes = {
    // 3rem minimum height keeps every tap target comfortably above the 44px
    // accessibility floor, which matters a lot for shaky hands.
    md: "min-h-12 px-4 text-base",
    lg: "min-h-16 px-5 text-lg w-full",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      // Disabled buttons are restyled rather than faded: a translucent label
      // over a dark background is genuinely hard to read mid-attack.
      className={`inline-flex items-center justify-center gap-2 rounded-xl transition disabled:cursor-not-allowed disabled:border disabled:border-line disabled:bg-surface-2 disabled:text-muted disabled:brightness-100 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

const inputClass =
  "w-full min-h-12 rounded-xl border border-line bg-surface-2 px-3 text-base text-text placeholder:text-muted/60 focus:border-accent focus:outline-none";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${inputClass} min-h-24 resize-y py-2 ${props.className ?? ""}`}
    />
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-muted">
      {children}
    </p>
  );
}

/** Shows a number with its label above, used across the environment tiles. */
export function Stat({
  label,
  value,
  detail,
  emphasis = false,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`print-plain rounded-xl border p-3 ${
        emphasis ? "border-accent/60 bg-accent/10" : "border-line bg-surface-2"
      }`}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {detail ? <div className="mt-0.5 text-xs text-muted">{detail}</div> : null}
    </div>
  );
}
