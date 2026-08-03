// Reusable Deriv API WebSocket service.
// - single shared connection
// - request/response correlation via req_id
// - subscription fan-out
// - automatic reconnect with exponential backoff + re-authorize

import { DERIV_WS_URL } from "./deriv-config";

export type DerivResponse<T = Record<string, unknown>> = T & {
  req_id?: number;
  msg_type?: string;
  error?: { code: string; message: string };
  echo_req?: Record<string, unknown>;
};

type Listener = (data: DerivResponse) => void;

interface Pending {
  resolve: (v: DerivResponse) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class DerivApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

class DerivSocket {
  private ws: WebSocket | null = null;
  private reqId = 1;
  private pending = new Map<number, Pending>();
  private subscribers = new Map<string, Set<Listener>>(); // msg_type -> listeners
  private queue: string[] = [];
  private token: string | null = null;
  private retries = 0;
  private closedByUs = false;
  private statusListeners = new Set<(s: "open" | "closed" | "connecting") => void>();
  private keepAlive: ReturnType<typeof setInterval> | null = null;

  onStatus(fn: (s: "open" | "closed" | "connecting") => void) {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  private emitStatus(s: "open" | "closed" | "connecting") {
    this.statusListeners.forEach((fn) => fn(s));
  }

  setToken(token: string | null) {
    this.token = token;
  }

  connect() {
    if (typeof window === "undefined") return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING))
      return;

    this.closedByUs = false;
    this.emitStatus("connecting");
    const ws = new WebSocket(DERIV_WS_URL);
    this.ws = ws;

    ws.onopen = () => {
      this.retries = 0;
      this.emitStatus("open");
      // Re-authorize first so queued authenticated calls succeed.
      if (this.token) {
        ws.send(JSON.stringify({ authorize: this.token, req_id: this.nextId() }));
      }
      const queued = this.queue.splice(0);
      queued.forEach((msg) => ws.send(msg));
      this.keepAlive = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ ping: 1 }));
      }, 25_000);
    };

    ws.onmessage = (event) => {
      let data: DerivResponse;
      try {
        data = JSON.parse(event.data as string) as DerivResponse;
      } catch {
        return;
      }

      if (data.req_id && this.pending.has(data.req_id)) {
        const p = this.pending.get(data.req_id)!;
        clearTimeout(p.timer);
        this.pending.delete(data.req_id);
        if (data.error) p.reject(new DerivApiError(data.error.code, data.error.message));
        else p.resolve(data);
      }

      if (data.msg_type) {
        this.subscribers.get(data.msg_type)?.forEach((fn) => fn(data));
      }
    };

    ws.onclose = () => {
      if (this.keepAlive) clearInterval(this.keepAlive);
      this.keepAlive = null;
      this.ws = null;
      this.emitStatus("closed");
      if (!this.closedByUs) this.scheduleReconnect();
    };

    ws.onerror = () => {
      // onclose follows; reconnect handled there.
    };
  }

  private scheduleReconnect() {
    this.retries = Math.min(this.retries + 1, 6);
    const delay = Math.min(1000 * 2 ** (this.retries - 1), 30_000);
    setTimeout(() => this.connect(), delay);
  }

  private nextId() {
    return this.reqId++;
  }

  /** Send a request and await its matching response. */
  send<T = Record<string, unknown>>(
    request: Record<string, unknown>,
    timeoutMs = 20_000,
  ): Promise<DerivResponse<T>> {
    if (typeof window === "undefined") {
      return Promise.reject(new DerivApiError("no_browser", "WebSocket is browser-only."));
    }
    const req_id = this.nextId();
    const payload = JSON.stringify({ ...request, req_id });

    return new Promise<DerivResponse<T>>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(req_id);
        reject(new DerivApiError("timeout", "Deriv did not respond in time."));
      }, timeoutMs);

      this.pending.set(req_id, {
        resolve: resolve as (v: DerivResponse) => void,
        reject,
        timer,
      });

      if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(payload);
      else {
        this.queue.push(payload);
        this.connect();
      }
    });
  }

  /** Subscribe to a stream by msg_type. Returns an unsubscribe function. */
  subscribe(msgType: string, listener: Listener) {
    if (!this.subscribers.has(msgType)) this.subscribers.set(msgType, new Set());
    this.subscribers.get(msgType)!.add(listener);
    return () => {
      this.subscribers.get(msgType)?.delete(listener);
    };
  }

  disconnect() {
    this.closedByUs = true;
    this.token = null;
    this.pending.forEach((p) => {
      clearTimeout(p.timer);
      p.reject(new DerivApiError("disconnected", "Connection closed."));
    });
    this.pending.clear();
    this.queue = [];
    try {
      this.ws?.close();
    } catch {
      /* noop */
    }
    this.ws = null;
  }
}

export const derivSocket = new DerivSocket();
