"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import { useTheme } from "@/components/ui/theme";
import { day, fresh, journey, minute, planned, reminderOffsets, stateSchema, transition, type Action, type FocusState, type Settings } from "@/lib/patates/state";
import { settleDisconnect } from "@/lib/patates/recovery";
import { playSound, scheduleSound } from "@/lib/sound";
import styles from "./patates.module.css";

const KEY = "patates-cuvali-v1", ROOM = "patates-cuvali-room", DEVICE = "patates-cuvali-device";
const PENDING = "patates-pending-cancellations", INTRO = "patates-intro";
type Packet = { state: FocusState; revision: number; now: number; pushReady: boolean; publicKey?: string; token?: string };
type PipAPI = { requestWindow: (options: { width: number; height: number }) => Promise<Window> };
/** True the first time a key is recorded with this value; used for once-only lines. */
function firstTime(store: string, key: string, value = "1") {
  try {
    const all = JSON.parse(localStorage.getItem(store) || "{}");
    if (all[key] === value) return false;
    all[key] = value; localStorage.setItem(store, JSON.stringify(all)); return true;
  } catch { return false; }
}
function localState() { try { return stateSchema.parse(JSON.parse(localStorage.getItem(KEY) || "null")); } catch { return fresh(); } }
function Icon({ name }: { name: "window" | "back" }) {
  const paths = { window: "M3 4h18v16H3zM12 12h7v6h-7z", back: "m12 5-7 7 7 7M5 12h15" };
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={paths[name]} /></svg>;
}
export function Companion({ english, others }: { english: boolean; others?: ReactNode }) {
  const theme = useTheme();
  const introRef = useRef<HTMLDialogElement>(null);
  const [openRow, setOpenRow] = useState("");
  const t = useCallback((tr: string, en: string) => english ? en : tr, [english]);
  const [state, setState] = useState<FocusState>(() => fresh());
  const [now, setNow] = useState(0), [ready, setReady] = useState(false);
    const [message, setMessage] = useState("");
  const [paired, setPaired] = useState(false), [connection, setConnection] = useState("local");
  const [busy, setBusy] = useState(false), [pairUrl, setPairUrl] = useState(""), [qr, setQr] = useState("");
  const [push, setPush] = useState(false), [pushReady, setPushReady] = useState(false), [enabled, setEnabled] = useState(false);
  const [pip, setPip] = useState<Window | null>(null), [pipSupported, setPipSupported] = useState(false);
  const [move, setMove] = useState("");
  const [intro, setIntro] = useState(false), [ask, setAsk] = useState(false), [confirmReset, setConfirmReset] = useState(false);
  const ref = useRef(state), room = useRef(""), revision = useRef(0), offset = useRef(0), generation = useRef(0);
  const sending = useRef(false), handled = useRef(""), lastTap = useRef<number[]>([]);
  const storageAvailable = useRef(true), moveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const stageRef = useRef<HTMLDivElement>(null);
  const say = (text: string) => setMessage(text);
  const save = useCallback((s: FocusState) => {
    ref.current = s; setState(s);
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { storageAvailable.current = false; setMessage(t("Depolama kullanılamıyor. Bu sayfayı açık tut.", "Storage is unavailable. Keep this page open.")); }
  }, [t]);
  const accept = useCallback((p: Packet) => {
    if (!stateSchema.safeParse(p.state).success) throw new Error("state");
    revision.current = p.revision; offset.current = p.now - Date.now(); setPushReady(p.pushReady); setEnabled(true); save(p.state); setConnection("connected");
  }, [save]);
  const request = useCallback(async (body?: unknown) => {
    const response = await fetch("/api/patates", { method: body ? "POST" : "GET", cache: "no-store", headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(room.current ? { Authorization: `Bearer ${room.current}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await response.json();
    if (!response.ok) { const error = new Error(String(response.status)); Object.assign(error, { data }); throw error; }
    return data;
  }, []);
  const act = useCallback(async (action: Action): Promise<FocusState | null> => {
    if (sending.current) return null;
    sending.current = true; setBusy(true);
    try {
      if (room.current) {
        const gen = generation.current;
        // Timestamps travel in server time while paired.
        if (action.type === "break" && action.at) action = { ...action, at: action.at + offset.current };
        try { const p = await request({ op: "action", action, revision: revision.current }); if (gen === generation.current) { accept(p); return p.state as FocusState; } }
        catch (error) {
          if (gen !== generation.current) return null;
          if (error instanceof Error && error.message === "409") { const p = await request(); accept(p); setMessage(t("Diğer cihazdaki değişikliği aldım. İşlemini tekrar seç.", "Updated from your other device. Please try the action again.")); }
          else { setConnection("offline"); setMessage(t("Bağlantı kurulamadı. Tekrar dene veya eşleşmeyi keserek bu cihazda devam et.", "Connection failed. Retry or disconnect to continue on this device.")); }
        }
      } else {
        let next: FocusState | null = null;
        const update = async () => { next = transition(storageAvailable.current ? localState() : ref.current, action, Date.now()); save(next); };
        if (navigator.locks) await navigator.locks.request(KEY, update); else await update();
        return next;
      }
      return null;
    } finally { sending.current = false; setBusy(false); }
  }, [request, accept, save, t]);
  const bump = useCallback((name: string, ms = 650) => { setMove(name); clearTimeout(moveTimer.current); moveTimer.current = setTimeout(() => setMove(""), ms); }, []);
  /** Run an action, then let the potato react to what actually changed. */
  const go = useCallback(async (action: Action) => {
    const prev = ref.current; setMessage(""); setAsk(false);
    const next = await act(action);
    if (!next || (next.phase === prev.phase && next.start === prev.start)) return next;
    bump("hop");
    const time = new Date(), hour = time.getHours(), weekday = time.getDay(), today = day(time.getTime());
    if (next.phase === "focus" && prev.phase === "idle") {
      const egg = hour < 5 ? "night" : weekday === 5 && hour >= 14 ? "friday" : weekday === 1 && hour < 11 ? "monday" : "";
      if (egg && firstTime("patates-eggs", egg, today)) setMessage(egg === "night" ? t("Bu saatte mi? Peki, ama molaları atlamak yok.", "At this hour? Fine, but no skipping breaks.") : egg === "friday" ? t("Cuma öğleden sonrası. Son düzlük, hadi.", "Friday afternoon. Home stretch, let's go.") : t("Pazartesi sabahı. Yavaş yavaş ısınalım.", "Monday morning. Let's ease into it."));
      else if (next.stats.sessions === 0 && hour < 12) setMessage(t("Günaydın. Günün ilk oturumu, taptaze.", "Good morning. First session of the day."));
      else if (hour >= 19) setMessage(t("Akşam mesaisi. Kısa tutalım, olur mu?", "Evening shift. Let's keep it short."));
    } else if (next.phase === "break") {
      const counted = next.round > prev.round, long = next.end - next.start > next.settings.rest * minute(next) + 1;
      const milestone = !counted ? "" : next.total === 10 && firstTime("patates-milestones", "s10") ? t("10 oturum oldu. Çuval dolmaya başladı!", "Ten sessions. The sack is filling up!")
        : next.total === 50 && firstTime("patates-milestones", "s50") ? t("50 oturum! Artık sıkı bir ekibiz.", "Fifty sessions! We make a solid team.")
        : next.total === 100 && firstTime("patates-milestones", "s100") ? t("100 oturum. Bu patates seninle gurur duyuyor.", "One hundred sessions. This potato is proud of you.")
        : next.streak >= 7 && firstTime("patates-milestones", "streak7") ? t("7 gündür her gün kalkıyorsun. Filiz verecek vakit bulamadım!", "Seven days in a row. I haven't had time to sprout!") : "";
      if (milestone) setMessage(milestone);
      else if (next.autoBreak) setMessage(t("Uzaklaştığını fark ettim, molanı başlattım.", "I noticed you stepped away, so I started your break."));
      else if (!counted) setMessage(t("Erken kalktık. Bu oturum sayılmadı ama yürümek yine iyi gelir.", "We got up early. This one doesn't count as a session, but the walk still helps."));
      else if (long) setMessage(t(`${next.settings.longRest} dakikalık uzun mola. Bunu hak ettik.`, `A long ${next.settings.longRest}-minute break. We earned it.`));
    } else if (next.phase === "focus" && prev.phase === "break") {
      const left = Math.max(1, Math.ceil(next.settings.goal - next.progress - 1e-6));
      setMessage(left === 1 ? t("Son oturum. Tarla göründü!", "Last session. I can see the field!") : t(`Geri döndük. ${left} oturum kaldı.`, `We're back. ${left} sessions to go.`));
    } else if (next.phase === "done" && firstTime("patates-milestones", "home")) setMessage(t("İlk kez tarlaya vardık. Bunu unutmam!", "Our first trip home. I won't forget this!"));
    return next;
  }, [act, bump, t]);
  const goRef = useRef(go);
  useEffect(() => { goRef.current = go; }, [go]);
  // Uses the site's sounds and its on/off switch in the top bar.
  const chime = useCallback(() => { playSound("ting"); scheduleSound("ting", .22, 1.25); }, []);
  // Hydrate browser-only storage after the server-rendered first frame.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    save(localState()); setNow(Date.now()); setReady(true);
    setPipSupported("documentPictureInPicture" in window);
    if (matchMedia("(min-width: 901px)").matches) setOpenRow("session");
    try { setPush(localStorage.getItem("patates-push") === "on"); } catch {}
    let token = "";
    try { token = localStorage.getItem(ROOM) || ""; } catch {}
    const incoming = new URLSearchParams(location.hash.slice(1)).get("pair");
    if (incoming && /^[a-f0-9]{48}$/.test(incoming)) { token = incoming; history.replaceState(null, "", location.pathname + location.search); try { localStorage.setItem(INTRO, "1"); } catch {} }
    try { if (!localStorage.getItem(INTRO) && !token && localState().total === 0) setIntro(true); } catch {}
    if (/^[a-f0-9]{48}$/.test(token)) { room.current = token; localStorage.setItem(ROOM, token); setPaired(true); setConnection("connecting"); }
    request().then((p) => { if (p.state) accept(p); else { setEnabled(p.enabled); setPushReady(p.pushReady); } }).catch(() => setConnection("offline"));
    const timer = setInterval(() => setNow(Date.now() + offset.current), 500);
    const storage = (event: StorageEvent) => { if (event.key === KEY && !room.current) save(localState()); if (event.key === ROOM) location.reload(); };
    addEventListener("storage", storage);
    return () => { clearInterval(timer); removeEventListener("storage", storage); };
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [save, request, accept]);
  useEffect(() => {
    if (!paired) return;
    const poll = async () => {
      if (sending.current) return;
      const gen = generation.current;
      try { const p = await request(); if (gen !== generation.current) return; if (p.revision > revision.current || !revision.current) accept(p); else setConnection("connected"); }
      catch { if (gen === generation.current) setConnection("offline"); }
    };
    // Live updates arrive over one streamed response; polling stays as a slow safety net.
    const abort = new AbortController();
    let attempt = 0, retry: ReturnType<typeof setTimeout> | undefined;
    const listen = async () => {
      const gen = generation.current;
      try {
        const response = await fetch("/api/patates?stream=1", { cache: "no-store", headers: { Authorization: `Bearer ${room.current}` }, signal: abort.signal });
        if (!response.ok || !response.body) throw new Error(String(response.status));
        attempt = 0;
        const reader = response.body.getReader(), decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          for (let cut = buffer.indexOf("\n\n"); cut >= 0; cut = buffer.indexOf("\n\n")) {
            const line = buffer.slice(0, cut); buffer = buffer.slice(cut + 2);
            if (!line.startsWith("data: ") || gen !== generation.current || sending.current) continue;
            try { const p = JSON.parse(line.slice(6)) as Packet; if (p.revision > revision.current || !revision.current) accept(p); else setConnection("connected"); } catch {}
          }
        }
      } catch { if (abort.signal.aborted) return; if (gen === generation.current) setConnection("offline"); }
      if (!abort.signal.aborted) retry = setTimeout(listen, Math.min(30000, 1000 * 2 ** attempt++));
    };
    void listen();
    const timer = setInterval(poll, 30000); addEventListener("focus", poll);
    return () => { abort.abort(); clearTimeout(retry); clearInterval(timer); removeEventListener("focus", poll); };
  }, [paired, request, accept]);
  useEffect(() => {
    if (!ready || !now || (state.phase !== "focus" && state.phase !== "break")) return;
    const stage = state.phase === "focus" ? reminderOffsets.filter((m) => now >= state.end + m * minute(state)).length - 1 : now >= state.end ? 0 : -1;
    if (stage < 0) return;
    const event = `${state.phase}:${state.end}:${stage}`;
    if (handled.current !== event) {
      handled.current = event;
      const once = async () => {
        try { if (localStorage.getItem("patates-last-reminder") === event) return; localStorage.setItem("patates-last-reminder", event); } catch {}
        chime();
      };
      if (navigator.locks) void navigator.locks.request("patates-reminder", once); else void once();
      const early = state.phase === "focus" && stage === 0, finishing = state.phase === "break" && (state.settings.auto || journey(state, now) >= state.settings.goal - 1e-6);
      if (!early && matchMedia("(pointer: coarse)").matches && document.visibilityState === "visible") { try { navigator.vibrate?.([70, 50, 70]); } catch {} }
      // These react to the clock reaching a deadline, not to a render.
      /* eslint-disable react-hooks/set-state-in-effect */
      if (!early) bump("hop");
      if (state.phase === "break" && !finishing) {
        setMessage(t("Mola bitti. Hazır olduğunda devam edelim.", "Break's over. Continue when you're ready."));
        // Ask for notifications in context, once, after the first finished break.
        try { if (!localStorage.getItem("patates-asked") && "Notification" in window && Notification.permission === "default" && state.quietUntil <= now) { localStorage.setItem("patates-asked", "1"); setAsk(true); } } catch {}
      }
      /* eslint-enable react-hooks/set-state-in-effect */
      if (!early && state.quietUntil <= now && !push && "Notification" in window && Notification.permission === "granted" && document.visibilityState !== "visible") {
        const body = state.phase === "break" ? t("Mola bitti, oturum sırada.", "Break's over, next session is up.") : stage > 1 ? t("Oturum uzadı, mola sırada.", "The session ran long. Time for a break.") : t("Oturum bitti, mola sırada.", "Session's done. Time for a break.");
        navigator.serviceWorker?.getRegistration("/patates-cuvali/").then((reg) => reg ? reg.showNotification("Pato", { body, tag: "patates-local" }) : void new Notification("Pato", { body, tag: "patates-local", icon: "/patates-cuvali/icon-192.png" })).catch(() => {});
      }
    }
    // A finished break waits for the user unless auto continue is on or the journey is complete.
    if (state.phase === "break" && now >= state.end && !busy && (!paired || connection !== "offline") && (state.settings.auto || journey(state, now) >= state.settings.goal - 1e-6)) void goRef.current({ type: "resume" });
  }, [now, state, ready, busy, connection, paired, bump, chime, push, t]);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setAsk(false); setConfirmReset(false); }
      if (event.code === "Space" && !event.repeat && !intro && !(event.target as HTMLElement)?.closest("button,input,select,textarea,a")) {
        event.preventDefault(); void goRef.current({ type: ref.current.phase === "focus" ? "break" : ref.current.phase === "idle" ? "start" : ref.current.phase === "done" ? "reset" : "resume" });
      }
    };
    addEventListener("keydown", keyboard); pip?.document.addEventListener("keydown", keyboard);
    return () => { removeEventListener("keydown", keyboard); pip?.document.removeEventListener("keydown", keyboard); };
  }, [intro, pip]);
  useEffect(() => () => { clearTimeout(moveTimer.current); }, []);
  useEffect(() => {
    const dialog = introRef.current;
    if (!dialog) return;
    if (intro && !dialog.open) dialog.showModal();
    if (!intro && dialog.open) dialog.close();
  }, [intro]);
  useEffect(() => {
    const retry = async () => {
      let pending: { token: string; device: string }[];
      try { pending = JSON.parse(localStorage.getItem(PENDING) || "[]"); if (!Array.isArray(pending)) return; } catch { return; }
      for (const item of pending) {
        if (!item || typeof item.token !== "string" || typeof item.device !== "string" || !/^[a-f0-9]{48}$/.test(item.token) || !/^[a-f0-9-]{20,40}$/.test(item.device)) continue;
        try {
          const response = await fetch("/api/patates", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${item.token}` }, body: JSON.stringify({ op: "unsubscribe", device: item.device }) });
          if (!response.ok && response.status !== 404) continue;
          const current = JSON.parse(localStorage.getItem(PENDING) || "[]") as typeof pending;
          localStorage.setItem(PENDING, JSON.stringify(current.filter((entry) => entry.token !== item.token || entry.device !== item.device)));
        } catch {}
      }
    };
    void retry(); addEventListener("online", retry);
    const timer = setInterval(retry, 30000);
    return () => { removeEventListener("online", retry); clearInterval(timer); };
  }, []);
  useEffect(() => {
    if (!pip || !theme) return;
    pip.document.documentElement.setAttribute("data-theme", theme);
  }, [pip, theme]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 10000);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    if (!ready || state.phase === "idle" || state.phase === "done" || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | undefined, disposed = false;
    const acquire = async () => { if (document.visibilityState !== "visible") return; try { const value = await navigator.wakeLock.request("screen"); if (disposed) await value.release(); else lock = value; } catch {} };
    void acquire(); document.addEventListener("visibilitychange", acquire);
    return () => { disposed = true; void lock?.release(); document.removeEventListener("visibilitychange", acquire); };
  }, [ready, state.phase]);
  async function ensureRoom() {
    if (room.current) return request() as Promise<Packet>;
    const packet = await request({ op: "create", state: ref.current, now: Date.now() });
    room.current = packet.token; localStorage.setItem(ROOM, packet.token); generation.current++; setPaired(true); accept(packet);
    return packet as Packet;
  }
  async function pair() {
    setBusy(true);
    try { await ensureRoom(); const url = `${location.origin}${english ? "/en" : ""}/pato#pair=${room.current}`; setPairUrl(url); setQr(await QRCode.toDataURL(url, { width: 220, margin: 2, color: { dark: "#263f30", light: "#ffffff" } })); }
    catch { say(t("Telefon bağlantısı henüz hazır değil. Bu cihazda kullanmaya devam edebilirsin.", "Phone pairing isn't available yet. You can keep using this device.")); }
    finally { setBusy(false); }
  }
  async function registration() {
    const reg = await navigator.serviceWorker.register("/patates-cuvali/sw.js", { scope: "/patates-cuvali/" });
    const worker = reg.installing || reg.waiting;
    if (!reg.active && worker) await new Promise<void>((resolve, reject) => {
      worker.addEventListener("statechange", () => { if (worker.state === "activated") resolve(); if (worker.state === "redundant") reject(new Error("worker")); });
    });
    return reg;
  }
  async function notifications() {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (ios && !matchMedia("(display-mode: standalone)").matches) { say(t("iPhone: Paylaş → Ana Ekrana Ekle. Ardından simgeden açıp bildirimleri etkinleştir.", "iPhone: Share → Add to Home Screen. Open from that icon, then enable notifications.")); return; }
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) { say(t("Bu tarayıcı Web Push desteklemiyor. Sayfa açıkken sesli hatırlatmayı kullanabilirsin.", "This browser doesn't support Web Push. Use sound while the page is open.")); return; }
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { say(t("İzin verilmedi. Tarayıcının site ayarlarından bildirimleri açabilirsin.", "Permission wasn't granted. You can enable notifications in browser site settings.")); return; }
      const packet = await ensureRoom();
      if (!packet.pushReady || !packet.publicKey) { say(t("Arka plan bildirimleri için sunucu yapılandırması gerekiyor. Henüz etkin değil.", "Background notifications require server configuration. They aren't enabled yet.")); return; }
      const reg = await registration();
      const key = Uint8Array.from(atob(packet.publicKey.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - packet.publicKey.length % 4) % 4)), (c) => c.charCodeAt(0));
      const sub = await reg.pushManager.getSubscription() || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      let device = localStorage.getItem(DEVICE); if (!device) { device = crypto.randomUUID(); localStorage.setItem(DEVICE, device); }
      await request({ op: "subscribe", device, subscription: sub.toJSON() });
      setPush(true); localStorage.setItem("patates-push", "on"); say(t("Bildirim aboneliği kaydedildi. Süre sonunda sunucu haber verecek.", "Notifications are subscribed. The server will send your timer reminder."));
      await reg.showNotification("Pato", { body: t("Bu cihazın bildirimleri hazır.", "Notifications on this device are ready."), tag: "patates-test" });
    } catch { say(t("Bildirim açılamadı. Bağlantını ve tarayıcı izinlerini kontrol edip tekrar dene.", "Couldn't enable notifications. Check your connection and browser permissions.")); }
    finally { setBusy(false); }
  }
  async function disconnect() {
    setBusy(true);
    try {
      const device = localStorage.getItem(DEVICE);
      const result = await settleDisconnect(
        async () => { if (device && room.current) await request({ op: "unsubscribe", device }); },
        async () => { const reg = await navigator.serviceWorker?.getRegistration("/patates-cuvali/"); await (await reg?.pushManager.getSubscription())?.unsubscribe(); },
      );
      if (result.remotePending && device) {
        let pending: { token: string; device: string }[] = [];
        try { pending = JSON.parse(localStorage.getItem(PENDING) || "[]"); if (!Array.isArray(pending)) pending = []; } catch {}
        localStorage.setItem(PENDING, JSON.stringify([...pending, { token: room.current, device }]));
      }
      // Keep remaining time when returning from the server clock to this device clock.
      const s = { ...ref.current, start: Math.max(0, ref.current.start - offset.current), end: Math.max(0, ref.current.end - offset.current), quietUntil: Math.max(0, ref.current.quietUntil - offset.current) };
      generation.current++; room.current = ""; revision.current = 0; offset.current = 0; localStorage.removeItem(ROOM); localStorage.removeItem("patates-push"); save(s); setPaired(false); setPush(false); setPairUrl(""); setQr(""); setConnection("local");
      void request().then((p) => { setEnabled(p.enabled); setPushReady(p.pushReady); }).catch(() => {});
      if (result.remotePending || result.localPending) say(t("Bu cihazda devam edebilirsin. Eski bildirimler henüz tamamen kapatılamadı; sunucu iptali bağlantı gelince tekrar denenecek. Gerekirse tarayıcı site ayarlarından bildirimleri kapat.", "You can continue locally. Old reminders couldn't be fully disabled; server cancellation will retry when connected. You can also disable notifications in browser site settings."));
    } catch { say(t("Yerel depolama kullanılamadı. Tarayıcı site ayarlarından bildirimleri kapatıp sayfayı yeniden aç.", "Local storage is unavailable. Disable notifications in browser site settings and reopen this page.")); }
    finally { setBusy(false); }
  }
  async function compact() {
    try {
      const api = (window as Window & { documentPictureInPicture?: PipAPI }).documentPictureInPicture;
      if (!api) return;
      if (pip) { pip.focus(); return; }
      const win = await api.requestWindow({ width: 360, height: 540 });
      document.querySelectorAll('link[rel="stylesheet"],style').forEach((node) => win.document.head.appendChild(node.cloneNode(true)));
      win.document.title = "Pato";
      win.document.documentElement.dataset.theme = document.documentElement.dataset.theme;
      win.document.documentElement.className = document.documentElement.className;
      win.document.body.style.margin = "0";
      win.document.body.style.background = "var(--color-void)";
      setPip(win);
      win.addEventListener("pagehide", () => setPip(null), { once: true });
    } catch { say(t("Köşe penceresi açılamadı. Bu sekmede devam edebilirsin.", "The compact window couldn't open. Keep using this tab.")); }
  }
  async function share() {
    const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1350;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = "#eef2e8"; ctx.fillRect(0, 0, 1080, 1350); ctx.fillStyle = "#263f30"; ctx.textAlign = "center";
    ctx.font = "bold 74px sans-serif"; ctx.fillText("Pato", 540, 180);
    ctx.font = "40px sans-serif"; ctx.fillText(t("Bugün tarlaya vardık.", "We made it to the field."), 540, 260);
    const image = new window.Image(); image.src = "/patates-cuvali/character.png";
    await image.decode(); ctx.drawImage(image, image.width / 2, image.height / 2, image.width / 2, image.height / 2, 190, 320, 700, 520);
    ctx.font = "bold 48px sans-serif"; ctx.fillText(`${state.round} ${t("oturum", "sessions")} · ${Math.round(state.sessionFocus)} ${t("dk odak", "min focus")}`, 540, 960);
    ctx.font = "36px sans-serif"; ctx.fillText(`${Math.round(state.sessionWalk)} ${t("dk yürüyüş", "min walking")} · ${state.streak} ${t("gün seri", "day streak")}`, 540, 1040);
    ctx.font = "30px sans-serif"; ctx.fillText("sametbrr.com/pato", 540, 1240);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve)); if (!blob) return;
    const file = new File([blob], "pato.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file] }); } catch {} }
    else { const url = URL.createObjectURL(file), a = document.createElement("a"); a.href = url; a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  }
  function tap() {
    const time = Date.now(); lastTap.current = [...lastTap.current.filter((x) => time - x < 2200), time];
    if (lastTap.current.length >= 5) { lastTap.current = []; bump("flip", 1150); say(t("Tamam tamam, püre olacağım!", "Easy there, I'll turn into mash!")); return; }
    bump("wiggle");
    if (lastTap.current.length === 1) say(t("Çuval gibi oturmayalım, olur mu?", "Let's not sit here like a sack of potatoes."));
  }
  const remaining = Math.max(0, state.end - now), overdue = state.phase === "focus" && now >= state.end;
  const elapsed = overdue ? Math.max(0, now - state.end) : 0;
  const seconds = Math.max(0, Math.ceil((state.phase === "idle" ? state.settings.focus * minute(state) : overdue ? elapsed : remaining) / minute(state) * 60));
  const clock = `${overdue ? "+" : ""}${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const ticking = ready && (state.phase === "focus" || state.phase === "break");
  useEffect(() => {
    if (!ticking) return;
    const original = document.title;
    return () => { document.title = original; };
  }, [ticking]);
  useEffect(() => { if (ticking) document.title = `${clock} · Pato`; }, [ticking, clock]);
  const restFraction = state.phase === "break" ? Math.min(1, Math.max(0, (now - state.start) / (state.end - state.start))) : 0;
  const travelled = state.phase === "done" ? state.settings.goal : journey(state, now), progress = Math.min(1, travelled / state.settings.goal);
  const breakOver = state.phase === "break" && now >= state.end, late = elapsed / minute(state);
  const locked = (state.phase !== "idle" || state.round > 0 || state.progress > 0) && state.phase !== "done";
  const span = (minutes: number) => { const m = Math.round(minutes), h = Math.floor(m / 60), r = m % 60; return h ? `${h} ${t("sa", "h")}${r ? ` ${r} ${t("dk", "min")}` : ""}` : `${r} ${t("dk", "min")}`; };
  const estimate = `${state.settings.goal} ${t("oturum, yaklaşık", "sessions, about")} ${span(planned(state.settings))}`;
  const pose = state.phase === "done" ? "home" : state.phase === "break" ? breakOver ? "sit" : state.seated ? "stretch" : "walk" : late > 5 ? "sprout" : "sit";
  // The potato dries out gradually while it waits, before the rooted and stone looks take over.
  const drying = overdue && late < 35 ? { filter: `saturate(${(1 - .45 * late / 35).toFixed(3)})` } : undefined;
  const movement = (state.seated ? [t("Omuzlarını yavaşça çevir. Üç derin nefes.", "Gently roll your shoulders. Take three deep breaths."), t("Parmaklarını açıp kapat, bileklerini yavaşça çevir.", "Open and close your hands, then gently turn your wrists."), t("Bakışını ekrandan uzaklaştır. Rahat bir nefes al.", "Look away from the screen. Take a comfortable breath.")] : [t("Bir bardak su al. Birkaç adım da benim için.", "Get a glass of water. Take a few steps for me."), t("Pencereye kadar yürü. Biraz uzağa bak.", "Walk over to a window and look into the distance."), t("Koridorun sonuna kadar gidip gelelim mi?", "How about a walk to the end of the hall and back?")])[Math.min(2, Math.floor(restFraction * 3))];
  const speech = message || (state.phase === "done" ? t("Tarlaya vardık. Sen de iyi geldin!", "Home at last. Thanks for the company!") : state.phase === "break" ? t("Mola bitti. Hazır olduğunda devam edelim.", "Break's over. Continue when you're ready.") : elapsed >= 35 * minute(state) ? t("Filizlendim. Beni bu sandalyeden kurtar!", "I've sprouted. Rescue me from this chair!") : overdue ? t("Süre doldu. Kök salmadan kalkalım mı?", "Time's up. Shall we move before I grow roots?") : state.phase === "focus" ? t("Sen işine bak. Ben buradayım.", "Focus on your work. I'm right here.") : t("Bir iş seç. Gerisini birlikte hallederiz.", "Pick one task. We'll take it from here."));
  const stage = <div ref={stageRef} className={`${styles.stage} ${pip ? styles.compact : ""}`} data-phase={state.phase} data-late={elapsed >= 95 * minute(state) ? "stone" : elapsed >= 35 * minute(state) ? "rooted" : ""}>
    <p className={styles.clock}>{ready && now ? <time dateTime={new Date(now).toISOString()}>{new Date(now).toLocaleDateString(english ? "en-GB" : "tr-TR", { day: "numeric", month: "long", weekday: "long" })} · {new Date(now).toLocaleTimeString(english ? "en-GB" : "tr-TR", { hour: "2-digit", minute: "2-digit" })}</time> : "\u00a0"}</p>
    <p className={styles.phase}>{state.phase === "done" ? t("Çuval doldu, gün güzelleşti.", "A sack full of good work.") : state.phase === "break" ? breakOver ? t("Mola bitti", "Break finished") : state.end - state.start > state.settings.rest * minute(state) + 1 ? t("Uzun mola", "Long break") : state.seated ? t("Mola · masada esneme", "Break · desk stretches") : t("Mola · biraz hareket", "Break · a little movement") : state.phase === "focus" ? `${t("Odak", "Focus")} · ${Math.min(state.settings.goal, state.round + 1)}/${state.settings.goal}` : t("Bugün kendine biraz alan aç.", "Make a little room for yourself today.")}</p>
    <p className={styles.speech} aria-live="polite">{state.phase === "break" && !breakOver && !message ? movement : speech}</p>
    <button className={`${styles.character} ${styles[pose]} ${move ? styles[move] : ""}`} aria-label={t("Patatese dokun", "Say hello to the potato")} onClick={tap}><span style={drying} /></button>
    {state.phase !== "done" && <p id="pato-clock" className={`${styles.timer} ${overdue ? styles.overdue : ""}`} role="timer" aria-label={t("Kalan süre", "Time remaining")}>{ready ? clock : "25:00"}</p>}
    {state.phase === "done" ? <div className={styles.summary}><h2>{t("Bugün tarlaya vardık.", "We made it to the field.")}</h2><p>{Math.round(state.sessionFocus)} {t("dk odak", "min focus")} · {Math.round(state.sessionWalk)} {t("dk yürüyüş", "min walking")} · {state.streak} {t("gün seri", "day streak")}</p><button onClick={() => share().catch(() => say(t("Görsel hazırlanamadı. Tekrar dene.", "Couldn't create the image. Please retry.")))}>{t("Özeti paylaş", "Share summary")}</button></div> : null}
    <div className={styles.actions}><button className={`${styles.primary} ${state.phase === "break" && !breakOver ? styles.calm : ""}`} disabled={!ready || busy} onClick={() => { void go({ type: state.phase === "focus" ? "break" : state.phase === "break" ? "resume" : state.phase === "done" ? "reset" : "start" }); }}>{state.phase === "focus" ? t("Kalk, biraz yürü", "Get up and walk") : state.phase === "break" ? breakOver ? t("Devam et", "Continue") : t("Molayı bitir, devam et", "End break and continue") : state.phase === "done" ? t("Yeni bir çuval", "Start a new sack") : state.round || state.progress ? t("Devam et", "Continue") : t("Odaklanmaya başla", "Start focusing")}</button>
    {state.phase === "idle" && !state.round && !state.progress && <p className={styles.estimate}>{estimate}</p>}
    {state.phase === "focus" && <button className={styles.textButton} disabled={busy} onClick={() => { void go({ type: "break", seated: true }); }}>{t("Masada esneyeceğim", "I'll stretch at my desk")}</button>}
    {state.phase === "break" && !breakOver && <button className={styles.textButton} disabled={busy} aria-pressed={state.seated} onClick={() => { setMessage(""); void act({ type: "seated" }); }}>{state.seated ? t("Kalkıp yürüyeceğim", "I'll get up and walk") : t("Bu molada masadayım", "I'm staying at my desk")}</button>}
    {overdue && !state.postponed && <button className={styles.textButton} disabled={busy} onClick={() => { void act({ type: "postpone" }).then((next) => { if (next?.postponed) setMessage(t("Beş dakika daha. Sonra kalkıyoruz, söz mü?", "Five more minutes. Then we get up, deal?")); }); }}>{t("Bir kez 5 dk ertele", "Snooze 5 min, once")}</button>}
    {ask && <div className={styles.ask} role="group" aria-label={t("Bildirim izni", "Notification permission")}><p>{t("Bir dahaki molada haber vereyim mi? Sekme arkadayken de duyarsın.", "Want a heads-up at the next break? You'll get it even when this tab is in the background.")}</p><div><button onClick={() => { setAsk(false); if (pushReady && matchMedia("(pointer: coarse)").matches) { void notifications(); return; } Notification.requestPermission().then((result) => say(result === "granted" ? t("Tamam. Molada haber veririm.", "Done. I'll let you know at break time.") : t("İzin verilmedi. Sesle haber veririm.", "Permission wasn't granted. I'll use sound instead."))).catch(() => {}); }}>{t("Evet", "Yes")}</button><button onClick={() => { setAsk(false); say(t("Peki. Ayarlardan her zaman açabilirsin.", "Okay. You can enable it in settings anytime.")); }}>{t("Şimdi değil", "Not now")}</button></div></div>}</div>
    <div className={styles.journey}><div className={styles.track}><span style={{ width: `${progress * 100}%` }} /></div><div className={styles.stops}>{Array.from({ length: state.settings.goal + 1 }, (_, i) => <span key={i} className={i <= travelled + 1e-6 ? styles.reached : ""} aria-label={`${i}/${state.settings.goal}`}>{i === state.settings.goal ? <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 17V7l7-4 7 4v10H3Zm4 0v-6h6v6M10 3V0" /></svg> : <i />}</span>)}</div><p>{state.phase === "done" ? t("Tarladayız", "Home in the field") : `${Math.max(0, Math.ceil(state.settings.goal - travelled - 1e-6))} ${t("oturum kaldı · tarlaya doğru", "sessions to go · on our way home")}`}</p></div>
    {pip && <button className={styles.textButton} onClick={() => pip.close()}>{t("Ana pencereye dön", "Back to main window")}</button>}
  </div>;
  const today = state.stats.date === day(now) ? state.stats : { sessions: 0, focus: 0, walk: 0 };
  const change = (key: keyof Settings, value: number | boolean) => { void act({ type: "settings", settings: { ...state.settings, [key]: value } }); };
  // One settings table; each row opens in place and shows its current value while closed.
  const rows = [
    { key: "session", title: t("Seans", "Session"), value: `${state.settings.goal} × ${state.settings.focus}/${state.settings.rest} ${t("dk", "min")}`, body: <>
      <fieldset disabled={busy || !ready || locked}><legend className={styles.sr}>{t("Süre ayarları", "Timer settings")}</legend>{([
        ["goal", t("Oturum", "Sessions"), 1, 12, 1], ["focus", t("Odak", "Focus"), 5, 90, 5], ["rest", t("Mola", "Break"), 1, 20, 1], ["longRest", t("Uzun mola", "Long break"), 5, 30, 5],
      ] as const).map(([key, label, min, max, step]) => <div className={styles.settingRow} key={key}><span id={`setting-${key}`}>{label}</span><div className={styles.stepper}><button aria-label={`${label} ${t("azalt", "decrease")}`} disabled={state.settings[key] <= min} onClick={() => change(key, Math.max(min, state.settings[key] - step))}>−</button><output aria-labelledby={`setting-${key}`}>{state.settings[key]}{key === "goal" ? "" : t(" dk", " min")}</output><button aria-label={`${label} ${t("artır", "increase")}`} disabled={state.settings[key] >= max} onClick={() => change(key, Math.min(max, state.settings[key] + step))}>+</button></div></div>)}
      <label className={styles.check}><input type="checkbox" checked={state.settings.auto} onChange={(e) => change("auto", e.target.checked)} />{t("Mola bitince otomatik devam", "Continue automatically after breaks")}</label>
      <label className={styles.check}><input type="checkbox" checked={state.settings.demo} onChange={(e) => change("demo", e.target.checked)} />{t("Hızlı deneme (1 dakika = 1 saniye)", "Quick demo (1 minute = 1 second)")}</label></fieldset>
      <p className={styles.hint}>{estimate}. {t("Her dört oturumda uzun mola.", "A longer break every four sessions.")}{locked ? ` ${t("Süreleri değiştirmek için seansı bitir veya sıfırla.", "Finish or reset the session to change durations.")}` : ""}</p>
      {confirmReset ? <div className={styles.confirm} role="group" aria-label={t("Seansı sıfırla", "Reset session")}>
        <p>{t("Bu seansı sıfırlayalım mı? Bugünkü toplamların korunur.", "Reset this session? Today's totals will be kept.")}</p>
        <div><button className={`${styles.secondary} ${styles.danger}`} disabled={busy || !ready} onClick={() => { setConfirmReset(false); setMessage(""); void act({ type: "reset" }); }}>{t("Evet, sıfırla", "Yes, reset")}</button><button className={styles.secondary} autoFocus onClick={() => setConfirmReset(false)}>{t("Vazgeç", "Cancel")}</button></div>
      </div> : <button className={`${styles.secondary} ${styles.danger}`} disabled={busy || !ready} onClick={() => setConfirmReset(true)}>{t("Seansı sıfırla", "Reset session")}</button>}
    </> },
    { key: "phone", title: t("Telefon ve bildirim", "Phone & notifications"), value: paired ? t("Eşleşti", "Paired") : t("Bu cihaz", "This device"), body: <div className={styles.notification}>
      <p>{t("iPhone'da Paylaş → Ana Ekrana Ekle; sonra simgeden aç. Android'de tarayıcı menüsünden yükleyebilirsin.", "On iPhone: Share → Add to Home Screen, then open the icon. On Android, install from the browser menu.")}</p>
      <p>{pushReady ? t("Ekran kapalıyken de Web Push. Teslim zamanı bağlantına ve cihaz ayarlarına bağlıdır.", "Web Push works with your screen locked. Delivery depends on connectivity and device settings.") : t("Telefon bildirimleri henüz kurulmadı. Şimdilik sayaç, sayfa açıkken sesle haber verir.", "Phone notifications aren't set up yet. For now the timer alerts you with sound while the page is open.")}</p>
      <button className={styles.secondary} onClick={notifications} disabled={busy || !ready || !pushReady}>{push ? t("Bildirim aboneliğini yenile", "Refresh notifications") : t("Bildirimleri aç", "Enable notifications")}</button>
      <button className={styles.secondary} onClick={pair} disabled={busy || (!enabled && !paired)}>{t("Telefonla eşleştir", "Pair your phone")}</button>
      {pairUrl && <div className={styles.pair}>{qr && <Image src={qr} width={220} height={220} unoptimized alt={t("Telefon eşleştirme QR kodu", "Phone pairing QR code")} />}<p>{t("Bu kodu yalnızca kendi cihazında aç. Bağlantı, seansını yönetme yetkisi verir.", "Open this only on your own device. The link grants control of this session.")}</p><button className={styles.secondary} onClick={() => navigator.clipboard.writeText(pairUrl).then(() => say(t("Eşleştirme bağlantısı kopyalandı.", "Pairing link copied."))).catch(() => say(t("Kopyalanamadı. QR kodu kullan.", "Couldn't copy. Use the QR code.")))}>{t("Bağlantıyı kopyala", "Copy link")}</button></div>}
      {paired && <button className={`${styles.secondary} ${styles.danger}`} disabled={busy} onClick={disconnect}>{t("Bu cihazın eşleşmesini ve bildirimlerini kapat", "Disconnect this device and its reminders")}</button>}
    </div> },
  ];
  const settings = <section className={styles.panel} aria-labelledby="pato-settings-title">
    <p id="pato-settings-title" className="text-label text-fg-muted">{t("Ayarlar", "Settings")}</p>
    <div className={styles.acc}>{rows.map((row) => <div key={row.key} className={styles.accRow}>
      <h2><button id={`pato-acc-${row.key}`} className={styles.accHead} aria-expanded={openRow === row.key} aria-controls={`pato-panel-${row.key}`} onClick={() => setOpenRow(openRow === row.key ? "" : row.key)}><span>{row.title}</span><span>{row.value}<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg></span></button></h2>
      <div id={`pato-panel-${row.key}`} role="region" aria-labelledby={`pato-acc-${row.key}`} className={styles.accBody} hidden={openRow !== row.key}>{row.body}</div>
    </div>)}</div>
    <dl className={styles.today} aria-label={t("Bugün çuvalda", "In the sack today")}>
      <div><dt>{t("Bugün oturum", "Sessions today")}</dt><dd>{today.sessions}</dd></div>
      <div><dt>{t("Odak", "Focus")}</dt><dd>{Math.round(today.focus)} <small>{t("dk", "min")}</small></dd></div>
      <div><dt>{t("Yürüyüş", "Walking")}</dt><dd>{Math.round(today.walk)} <small>{t("dk", "min")}</small></dd></div>
      <div><dt>{t("Toplam", "All time")}</dt><dd>{state.total}{state.streak > 0 ? <small> · {state.streak} {t("gün seri", "day streak")}</small> : null}</dd></div>
    </dl>
  </section>;
  return <main id="main" className={`${styles.app} pt-28 pb-24 md:pt-32`}>
    <div className="container-site flex flex-col gap-8">
      <Link href={english ? "/en/arcade" : "/arcade"} className="group inline-flex w-fit items-center gap-2 font-mono text-xs text-fg-muted hover:text-fg"><span className={styles.backArrow}><Icon name="back" /></span>{t("Tüm oyunlar", "All games")}</Link>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-4">
          <p className="text-label flex items-center gap-3 text-fg-muted"><span className="text-ghost">▶</span><span aria-hidden className="text-fg-subtle">/</span><span>{t("Odak arkadaşı", "Focus companion")}</span></p>
          <h1 className="text-h2">Pato</h1>
          <p className="max-w-xl text-fg-muted">{t("Biraz odaklan. Biraz yürü. Kök salma.", "Focus a little. Walk a little. Don't grow roots.")}</p>
        </div>
        <div className={styles.tools}>
          <span className={styles.connection}>{connection === "connected" ? t("Cihazlar eşleşti", "Devices connected") : connection === "offline" ? t("Bağlantı bekleniyor", "Waiting for connection") : connection === "connecting" ? t("Bağlanıyor…", "Connecting…") : t("Bu cihazda saklanır", "Saved on this device")}</span>
          {pipSupported && <button aria-label={t("Köşe penceresinde aç", "Open compact window")} onClick={compact}><Icon name="window" /></button>}
        </div>
      </header>
      {state.settings.demo && <p className={styles.demo}>{t("Hızlı deneme açık: 1 dakika = 1 saniye. Bildirim gönderilmez.", "Demo mode: 1 minute = 1 second. No push reminders.")}</p>}
      <div className={styles.focusLayout}>
        <section className={styles.card} aria-label={t("Sayaç", "Timer")}>{pip ? <div className={styles.away}><p>{t("Patates köşe penceresinde.", "Your potato is in the compact window.")}</p><button onClick={() => pip.close()}>{t("Buraya geri al", "Bring it back")}</button></div> : stage}</section>
        {pip && createPortal(stage, pip.document.body)}
        {settings}
      </div>
      <p className={styles.status} role="status">{message}</p>
      <div className="grid gap-8 border-t border-line pt-8 md:grid-cols-[1fr_1fr]">
        <div className="flex flex-col gap-3">
          <p className="text-label text-fg-muted">{t("Pato kim?", "Who is Pato?")}</p>
          <p className="text-fg-muted">{t("Bu küçük patates masana yuvarlandı. Sen çalışırken yanında bekliyor, ama çok oturursa filizleniyor. Her molada birlikte birkaç adım atıyor, tarlasına biraz daha yaklaşıyorsunuz. Son molayla eve varıyor; sen de biraz nefes almış oluyorsun.", "A little potato rolled onto your desk. It keeps you company while you work, but sprouts when it sits for too long. Each break takes you both a little closer to its field. Finish the last break and it's home, and you've had room to breathe.")}</p>
          <p className="text-label mt-5 text-fg-muted">{t("Nasıl çalışır", "How it works")}</p>
          <ul className="flex flex-col gap-1.5 font-mono text-sm">{[
            t("Boşluk: başlat, kalk, devam et", "Space: start, get up, continue"),
            t("Süre dolunca mola kendiliğinden başlamaz; kalkman gerekir", "Breaks don't start by themselves; you have to get up"),
            t("Sürenin %60'ı dolmadan kalkarsan oturum sayılmaz", "Getting up before 60% of the time doesn't count as a session"),
            t("Moladan erken dönersen yol o kadar ilerler", "Come back early and the journey advances that much"),
            t("Bir kez 5 dakika erteleyebilirsin", "You can snooze once, for 5 minutes"),
          ].map((line) => <li key={line} className="flex gap-2"><span className="text-ghost">›</span>{line}</li>)}</ul>
          <p className="text-sm text-fg-muted">{t("Pofi'nin mola arkadaşlığı fikrinden ilhamla; özgün patates karakteri ve bağımsız uygulama.", "Inspired by Pofi's break companion idea, with an original potato character and independent implementation.")} <a className="underline underline-offset-4" href="https://barisozcan.com/pofi/" target="_blank" rel="noreferrer">Pofi ↗</a></p>
        </div>
        {others}
      </div>
    </div>
    <dialog ref={introRef} className={`${styles.settings} ${styles.intro}`} aria-labelledby="pato-intro-title" onClose={() => { setIntro(false); try { localStorage.setItem(INTRO, "1"); } catch {} }}>
      <span className={styles.introArt} aria-hidden />
      <h2 id="pato-intro-title">{t("Bu Pato. Masana yuvarlandı.", "This is Pato. It rolled onto your desk.")}</h2>
      <p>{t("Sen çalışırken yanında bekler. Süre dolunca birlikte kalkarsınız; her mola onu tarlasına biraz daha yaklaştırır. Çok oturursan filizlenir.", "It waits beside you while you work. When time's up you get up together; every break brings it closer to its field. Sit too long and it sprouts.")}</p>
      <div className={styles.settingRow}><span id="pato-intro-goal">{t("Bugün kaç oturum?", "How many sessions today?")}</span><div className={styles.stepper}><button aria-label={t("Oturum azalt", "Fewer sessions")} disabled={busy || locked || state.settings.goal <= 1} onClick={() => change("goal", state.settings.goal - 1)}>−</button><output aria-labelledby="pato-intro-goal">{state.settings.goal}</output><button aria-label={t("Oturum artır", "More sessions")} disabled={busy || locked || state.settings.goal >= 12} onClick={() => change("goal", state.settings.goal + 1)}>+</button></div></div>
      <p className={styles.hint} aria-live="polite">{estimate}</p>
      <button className={styles.primary} disabled={busy || !ready} onClick={() => { introRef.current?.close(); if (ref.current.phase === "idle") { void go({ type: "start" }); } }}>{state.phase === "idle" ? t("Başla", "Start") : t("Tamam", "Got it")}</button>
      {state.phase === "idle" && <button className={styles.textButton} onClick={() => introRef.current?.close()}>{t("Önce bir göz atayım", "Let me look around first")}</button>}
    </dialog>
  </main>;
}
