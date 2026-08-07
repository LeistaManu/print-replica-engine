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
  private authorized = false;
  private authorizationInFlight = false;
  private lastAuthorization: DerivResponse | null = null;
  private authorizationWaiters = new Set<{
    resolve: (v: DerivResponse) => void;
    reject: (e: Error) => void;
  }>();
  private retries = 0;
  private hasConnectedOnce = false;
  private closedByUs = false;
  private statusListeners = new Set<(s: "open" | "closed" | "connecting") => void>();
  private reauthListeners = new Set<() => void>();
  private authErrorListeners = new Set<(e: DerivApiError) => void>();
  private keepAlive: ReturnType<typeof setInterval> | null = null;

  onStatus(fn: (s: "open" | "closed" | "connecting") => void) {
    this.statusListeners.add(fn);
    return () => {
      this.statusListeners.delete(fn);
    };
  }

  /** Fired every time the socket (re)connects AND re-authorizes successfully. */
  onReauthorize(fn: () => void) {
    this.reauthListeners.add(fn);
    return () => {
      this.reauthListeners.delete(fn);
    };
  }

  /** Fired when re-authorization fails (expired / invalid token). */
  onAuthError(fn: (e: DerivApiError) => void) {
    this.authErrorListeners.add(fn);
    return () => {
      this.authErrorListeners.delete(fn);
    };
  }

  private emitStatus(s: "open" | "closed" | "connecting") {
    this.statusListeners.forEach((fn) => fn(s));
  }

  setToken(token: string | null) {
    if (this.token !== token) {
      this.authorized = false;
      this.lastAuthorization = null;
    }
    this.token = token;
  }

  /**
   * Authorize exactly once for the current connection. Authenticated requests
   * remain queued until Deriv confirms the authorize request.
   */
  authorize(token: string): Promise<DerivResponse> {
    this.setToken(token);

    if (
      this.authorized &&
      this.lastAuthorization &&
      this.ws?.readyState === WebSocket.OPEN
    ) {
      return Promise.resolve(this.lastAuthorization);
    }

    const result = new Promise<DerivResponse>((resolve, reject) => {
      this.authorizationWaiters.add({ resolve, reject });
    });

    if (this.ws?.readyState === WebSocket.OPEN) this.authorizeCurrentConnection();
    else this.connect();

    return result;
  }

  private authorizeCurrentConnection() {
    const token = this.token;
    if (!token || this.authorized || this.authorizationInFlight) return;
    this.authorizationInFlight = true;

    this.send({ authorize: token })
      .then((response) => {
        this.authorizationInFlight = false;
        this.authorized = true;
        this.lastAuthorization = response;
        this.authorizationWaiters.forEach((waiter) => waiter.resolve(response));
        this.authorizationWaiters.clear();

        const queued = this.queue.splice(0);
        queued.forEach((message) => this.ws?.send(message));
        this.reauthListeners.forEach((fn) => fn());
      })
      .catch((error) => {
        this.authorizationInFlight = false;
        const authError =
          error instanceof DerivApiError
            ? error
            : new DerivApiError("authorize_failed", String(error));
        this.authorized = false;
        this.lastAuthorization = null;
        this.authorizationWaiters.forEach((waiter) => waiter.reject(authError));
        this.authorizationWaiters.clear();
        this.authErrorListeners.forEach((fn) => fn(authError));
      });
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
      this.hasConnectedOnce = true;
      this.retries = 0;
      this.emitStatus("open");
      this.authorized = false;
      this.lastAuthorization = null;
      // Do not flush authenticated calls until Deriv confirms authorization.
      if (this.token) {
        this.authorizeCurrentConnection();
      } else {
        const queued = this.queue.splice(0);
        queued.forEach((message) => ws.send(message));
      }
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
      this.authorized = false;
      this.authorizationInFlight = false;
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

      const isAuthorizeRequest = Object.prototype.hasOwnProperty.call(request, "authorize");
      if (
        this.ws?.readyState === WebSocket.OPEN &&
        (isAuthorizeRequest || !this.token || this.authorized)
      ) {
        this.ws.send(payload);
      }
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
    this.authorized = false;
    this.authorizationInFlight = false;
    this.lastAuthorization = null;
    const disconnected = new DerivApiError("disconnected", "Connection closed.");
    this.authorizationWaiters.forEach((waiter) => waiter.reject(disconnected));
    this.authorizationWaiters.clear();
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
