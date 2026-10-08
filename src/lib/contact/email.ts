import "server-only";

/** A contact form submission as it lands in the inbox. Written in Turkish: the reader is the site owner. */
export type ContactMail = {
  name: string;
  email: string;
  company: string;
  message: string;
  locale: "tr" | "en";
  /** Page the form was sent from (Referer), when the browser shares it. */
  page: string | null;
  sentAt: Date;
};

// Light theme tokens from globals.css; email clients need literal values and inline styles.
const C = {
  bg: "#f6f6f2",
  card: "#ffffff",
  soft: "#f0f0ea",
  line: "#e3e3dc",
  fg: "#0b0b0b",
  muted: "#54544e",
  subtle: "#8a8a83",
  accent: "#137a43",
  tint: "#e6f5ea",
  onAccent: "#f4fff7",
};
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const when = (d: Date) =>
  new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(d);

const pageLabel = (page: string | null) => {
  if (!page) return "Bilinmiyor";
  try {
    const u = new URL(page);
    return u.host + (u.pathname === "/" ? "" : u.pathname);
  } catch {
    return page;
  }
};

export function contactSubject(m: ContactMail) {
  return `Web sitesi formu · ${m.name}${m.company ? ` (${m.company})` : ""}`;
}

export function contactText(m: ContactMail) {
  return [
    "YENİ MESAJ — sametbrr.com iletişim formu",
    "",
    `Ad:      ${m.name}`,
    `E-posta: ${m.email}`,
    ...(m.company ? [`Şirket:  ${m.company}`] : []),
    `Dil:     ${m.locale.toUpperCase()}`,
    `Sayfa:   ${pageLabel(m.page)}`,
    `Tarih:   ${when(m.sentAt)}`,
    "",
    "Mesaj:",
    m.message,
    "",
    "—",
    "Bu e-postayı yanıtladığınızda yanıt doğrudan gönderene gider.",
  ].join("\n");
}

export function contactHtml(m: ContactMail) {
  const row = (label: string, value: string) => `
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid ${C.line};width:96px;vertical-align:top;font:500 11px/1.4 ${MONO};letter-spacing:.06em;text-transform:uppercase;color:${C.subtle};">${label}</td>
                <td style="padding:10px 0;border-bottom:1px solid ${C.line};vertical-align:top;font:14px/1.5 ${FONT};color:${C.fg};">${value}</td>
              </tr>`;
  const email = escape(m.email);
  const replyHref = `mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent("Re: sametbrr.com")}`;

  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escape(contactSubject(m))}</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};">
  <div style="display:none;max-height:0;overflow:hidden;">${escape(m.message.slice(0, 120))}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr>
            <td style="padding:0 4px 16px;font:600 15px/1 ${FONT};color:${C.fg};">
              sametbrr<span style="color:${C.accent};">.com</span>
              <span style="float:right;font:500 11px/15px ${MONO};letter-spacing:.06em;text-transform:uppercase;color:${C.subtle};">İletişim formu</span>
            </td>
          </tr>
          <tr>
            <td style="background:${C.card};border:1px solid ${C.line};border-radius:14px;padding:28px;">
              <span style="display:inline-block;padding:4px 10px;border-radius:999px;background:${C.tint};color:${C.accent};font:600 11px/1.4 ${MONO};letter-spacing:.06em;text-transform:uppercase;">● Web sitesinden yeni mesaj</span>
              <h1 style="margin:16px 0 4px;font:600 22px/1.3 ${FONT};color:${C.fg};">${escape(m.name)}</h1>
              <p style="margin:0 0 20px;font:14px/1.5 ${FONT};color:${C.muted};">${
                m.company ? `${escape(m.company)} · ` : ""
              }<a href="mailto:${email}" style="color:${C.accent};text-decoration:none;">${email}</a></p>

              <div style="background:${C.soft};border-left:3px solid ${C.accent};border-radius:8px;padding:16px 18px;font:15px/1.6 ${FONT};color:${C.fg};white-space:pre-wrap;">${escape(m.message)}</div>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border-top:1px solid ${C.line};">${row(
                "Kaynak",
                "Web sitesi · İletişim formu",
              )}${row("Sayfa", escape(pageLabel(m.page)))}${row("Dil", m.locale === "tr" ? "Türkçe" : "İngilizce")}${row(
                "Tarih",
                escape(when(m.sentAt)),
              )}
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr>
                  <td style="border-radius:999px;background:${C.accent};">
                    <a href="${replyHref}" style="display:inline-block;padding:11px 20px;font:600 14px/1 ${FONT};color:${C.onAccent};text-decoration:none;">Yanıtla →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 4px 0;font:12px/1.5 ${FONT};color:${C.subtle};">
              Bu mesaj <a href="https://sametbrr.com" style="color:${C.subtle};">sametbrr.com</a> iletişim formundan gönderildi. Bu e-postayı yanıtladığınızda yanıt doğrudan gönderene gider.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
