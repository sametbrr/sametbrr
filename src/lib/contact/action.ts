"use server";

import { headers } from "next/headers";
import { Resend } from "resend";
import { z } from "zod";
import { contactHtml, contactSubject, contactText, type ContactMail } from "./email";

export type ContactState = {
  status: "idle" | "success" | "invalid" | "error";
  fields?: string[];
  /** Echoed back so React's post-action form reset doesn't wipe what the user typed. */
  values?: Record<string, string>;
};

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().max(200),
  company: z.string().trim().max(160).optional().default(""),
  message: z.string().trim().min(10).max(5000),
  locale: z.enum(["tr", "en"]),
});

// Best-effort per-IP limit: 5 messages / 10 minutes per instance.
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 5;
const hits = new Map<string, number[]>();

function limited(ip: string) {
  const now = Date.now();
  if (hits.size > 5000) hits.clear();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > LIMIT;
}

export async function sendContact(_prev: ContactState, form: FormData): Promise<ContactState> {
  // Honeypot: bots fill the hidden field; pretend success.
  if (form.get("website")) return { status: "success" };

  const raw = Object.fromEntries(form);
  const values = Object.fromEntries(
    ["name", "email", "company", "message"].map((k) => [k, typeof raw[k] === "string" ? raw[k] : ""]),
  );
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { status: "invalid", fields: parsed.error.issues.map((i) => String(i.path[0])), values };
  }

  const h = await headers();
  const ip = h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (limited(ip)) return { status: "error", values };

  const { RESEND_API_KEY, CONTACT_TO, CONTACT_FROM } = process.env;
  if (!RESEND_API_KEY || !CONTACT_TO || !CONTACT_FROM) {
    console.error("[contact] RESEND_API_KEY, CONTACT_TO and CONTACT_FROM must be set");
    return { status: "error", values };
  }

  const mail: ContactMail = { ...parsed.data, page: h.get("referer"), sentAt: new Date() };
  const resend = new Resend(RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: CONTACT_FROM,
    to: CONTACT_TO,
    replyTo: mail.email,
    subject: contactSubject(mail),
    text: contactText(mail),
    html: contactHtml(mail),
    tags: [{ name: "source", value: "contact-form" }],
  });

  if (error) {
    console.error("[contact] resend failed", error.name);
    return { status: "error", values };
  }
  return { status: "success" };
}
