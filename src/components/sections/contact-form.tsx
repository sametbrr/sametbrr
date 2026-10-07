"use client";

import { m } from "motion/react";
import { useActionState, useEffect } from "react";
import { playSound } from "@/lib/sound";
import { sendContact, type ContactState } from "@/lib/contact/action";
import type { Dictionary } from "@/i18n/dictionaries";
import { track } from "@/lib/analytics";

type FormDict = Dictionary["contact"]["form"];

const field =
  "w-full rounded-md border border-line-strong bg-surface-2 px-4 py-3 text-fg placeholder:text-fg-subtle transition-[border-color,box-shadow] duration-200 outline-none focus:border-primary focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-primary)_16%,transparent)] aria-[invalid=true]:border-danger/70";

/** Contact form (C3): server action + Resend, idle → spinner → drawn check. */
export function ContactForm({ dict, locale }: { dict: FormDict; locale: string }) {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContact, { status: "idle" });
  useEffect(() => {
    if (state.status !== "success") return;
    playSound("success");
    track("contact-submit");
  }, [state.status]);
  const bad = (name: string) => (state.status === "invalid" && state.fields?.includes(name)) || undefined;

  if (state.status === "success") {
    return (
      <div
        role="status"
        className="flex min-h-80 flex-col items-start justify-center gap-5 rounded-lg border border-line bg-surface-1 p-8"
      >
        <svg viewBox="0 0 48 48" className="size-12" aria-hidden>
          <circle cx="24" cy="24" r="22" fill="none" stroke="var(--color-forest)" strokeWidth="1.5" />
          <m.path
            d="M15 24.5 21.5 31 33 18"
            fill="none"
            stroke="var(--color-ghost)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>
        <p className="text-h3 max-w-sm">{dict.success}</p>
      </div>
    );
  }

  return (
    <form action={action} className="relative grid gap-4 rounded-lg border border-line bg-surface-1 p-6 md:p-8">
      <input type="hidden" name="locale" value={locale} />
      <div aria-hidden className="absolute -left-[9999px]">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm text-fg-muted">
          {dict.name}
          <input
            name="name"
            defaultValue={state.values?.name}
            required
            minLength={2}
            autoComplete="name"
            className={field}
            aria-invalid={bad("name")}
          />
        </label>
        <label className="grid gap-2 text-sm text-fg-muted">
          <span>
            {dict.email} <span className="text-fg-subtle">({locale === "tr" ? "zorunlu" : "required"})</span>
          </span>
          <input
            name="email"
            defaultValue={state.values?.email}
            type="email"
            required
            autoComplete="email"
            className={field}
            aria-invalid={bad("email")}
          />
        </label>
      </div>
      <label className="grid gap-2 text-sm text-fg-muted">
        {dict.company}
        <input name="company" defaultValue={state.values?.company} autoComplete="organization" className={field} />
      </label>
      <label className="grid gap-2 text-sm text-fg-muted">
        {dict.message}
        <textarea
          name="message"
          defaultValue={state.values?.message}
          required
          minLength={10}
          rows={5}
          className={`${field} resize-y`}
          aria-invalid={bad("message")}
        />
      </label>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <p role="alert" className="text-sm text-danger">
          {state.status === "invalid" ? dict.invalid : state.status === "error" ? dict.error : ""}
        </p>
        <button
          type="submit"
          data-sound="tap"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-on-primary transition-colors duration-200 hover:bg-primary-hover disabled:opacity-70"
        >
          {pending && (
            <svg viewBox="0 0 16 16" className="size-4 animate-spin" aria-hidden>
              <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
              <path d="M14 8a6 6 0 0 0-6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
          {pending ? dict.sending : dict.submit}
        </button>
      </div>
    </form>
  );
}
