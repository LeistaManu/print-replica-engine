// src/components/DerivBalanceSwitcher.tsx

import {
  ChevronDown,
  Loader2,
  RefreshCw,
  Wallet,
} from "lucide-react";

import {
  useDeriv,
} from "@/context/DerivProvider";

import {
  formatMoney,
} from "@/lib/deriv-api";

import {
  useState,
} from "react";

export default function DerivBalanceSwitcher() {
  const {
    isAuthenticated,
    isLoading,

    accounts,

    demoBalance,
    realBalance,

    activeAccount,
    balance,
    currency,
    isDemo,

    error,

    switchAccount,
    resetDemoBalance,
    refresh,
  } = useDeriv();

  const [open, setOpen] =
    useState(false);

  const [resetting, setResetting] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  if (!isAuthenticated) {
    return null;
  }

  const activeType =
    isDemo
      ? "DEMO"
      : "REAL";

  const activeCurrency =
    activeAccount?.currency ??
    currency ??
    "USD";

  const activeBalance =
    Number.isFinite(balance)
      ? balance
      : 0;

  const handleAccountSwitch =
    async (
      loginid: string,
    ) => {
      setOpen(false);
      setMessage(null);

      try {
        await switchAccount(
          loginid,
        );
      } catch {
        // Provider already stores the error.
      }
    };

  const handleResetDemo =
    async () => {
      setResetting(true);
      setMessage(null);

      try {
        await resetDemoBalance();

        setMessage(
          "Demo balance reset to $10,000.",
        );
      } catch (e) {
        setMessage(
          e instanceof Error
            ? e.message
            : "Unable to reset demo balance.",
        );
      } finally {
        setResetting(false);
      }
    };

  return (
    <div className="relative">
      {/* ------------------------------------------------------------------ */}
      {/* Main Balance Button                                                */}
      {/* ------------------------------------------------------------------ */}

      <button
        type="button"
        onClick={() =>
          setOpen(
            (value) => !value,
          )
        }
        className="
          flex items-center gap-2
          rounded-xl
          border border-white/10
          bg-[#171b29]
          px-3 py-2
          text-sm
          text-white
          shadow-sm
          transition
          hover:bg-[#202536]
        "
      >
        <Wallet
          className="h-4 w-4 text-cyan-400"
        />

        <span
          className="
            rounded-md
            bg-emerald-400
            px-2 py-0.5
            text-[10px]
            font-bold
            text-slate-950
          "
        >
          {activeType}
        </span>

        <span className="text-white/70">
          {activeCurrency}
        </span>

        <span className="font-semibold">
          {formatMoney(
            activeBalance,
            activeCurrency,
          )}
        </span>

        <ChevronDown
          className={`
            h-4 w-4
            text-white/50
            transition-transform
            ${open ? "rotate-180" : ""}
          `}
        />
      </button>

      {/* ------------------------------------------------------------------ */}
      {/* Dropdown                                                            */}
      {/* ------------------------------------------------------------------ */}

      {open && (
        <div
          className="
            absolute
            right-0
            z-50
            mt-2
            w-[340px]
            overflow-hidden
            rounded-2xl
            border border-white/10
            bg-[#111522]
            shadow-2xl
          "
        >
          {/* Header */}
          <div
            className="
              border-b
              border-white/10
              px-4 py-3
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
              "
            >
              <div>
                <p
                  className="
                    text-sm
                    font-semibold
                    text-white
                  "
                >
                  Trading Accounts
                </p>

                <p
                  className="
                    mt-0.5
                    text-xs
                    text-white/45
                  "
                >
                  Select your active account
                </p>
              </div>

              <button
                type="button"
                disabled={isLoading}
                onClick={() =>
                  void refresh()
                }
                className="
                  rounded-lg
                  p-2
                  text-white/50
                  hover:bg-white/5
                  hover:text-white
                  disabled:opacity-40
                "
                title="Refresh balances"
              >
                <RefreshCw
                  className={`
                    h-4 w-4
                    ${
                      isLoading
                        ? "animate-spin"
                        : ""
                    }
                  `}
                />
              </button>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* REAL ACCOUNT                                                     */}
          {/* ---------------------------------------------------------------- */}

          {realBalance && (
            <button
              type="button"
              onClick={() =>
                void handleAccountSwitch(
                  realBalance.loginid,
                )
              }
              className={`
                w-full
                border-b
                border-white/5
                px-4 py-4
                text-left
                transition
                hover:bg-white/5
                ${
                  !isDemo
                    ? "bg-emerald-400/5"
                    : ""
                }
              `}
            >
              <div
                className="
                  flex
                  items-center
                  justify-between
                "
              >
                <div>
                  <div
                    className="
                      flex
                      items-center
                      gap-2
                    "
                  >
                    <span
                      className="
                        rounded-md
                        bg-emerald-400
                        px-2 py-0.5
                        text-[10px]
                        font-bold
                        text-slate-950
                      "
                    >
                      REAL
                    </span>

                    {!isDemo && (
                      <span
                        className="
                          text-[10px]
                          text-emerald-400
                        "
                      >
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <p
                    className="
                      mt-2
                      font-mono
                      text-xs
                      text-white/45
                    "
                  >
                    {realBalance.loginid}
                  </p>
                </div>

                <div
                  className="
                    text-right
                  "
                >
                  <p
                    className="
                      font-semibold
                      text-white
                    "
                  >
                    {formatMoney(
                      realBalance.balance,
                      realBalance.currency,
                    )}
                  </p>

                  <p
                    className="
                      mt-1
                      text-xs
                      text-white/40
                    "
                  >
                    {realBalance.currency}
                  </p>
                </div>
              </div>
            </button>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* DEMO ACCOUNT                                                     */}
          {/* ---------------------------------------------------------------- */}

          {demoBalance && (
            <div
              className={`
                border-b
                border-white/5
                ${
                  isDemo
                    ? "bg-cyan-400/5"
                    : ""
                }
              `}
            >
              <button
                type="button"
                onClick={() =>
                  void handleAccountSwitch(
                    demoBalance.loginid,
                  )
                }
                className="
                  w-full
                  px-4 py-4
                  text-left
                  transition
                  hover:bg-white/5
                "
              >
                <div
                  className="
                    flex
                    items-center
                    justify-between
                  "
                >
                  <div>
                    <div
                      className="
                        flex
                        items-center
                        gap-2
                      "
                    >
                      <span
                        className="
                          rounded-md
                          bg-cyan-400
                          px-2 py-0.5
                          text-[10px]
                          font-bold
                          text-slate-950
                        "
                      >
                        DEMO
                      </span>

                      {isDemo && (
                        <span
                          className="
                            text-[10px]
                            text-cyan-400
                          "
                        >
                          ACTIVE
                        </span>
                      )}
                    </div>

                    <p
                      className="
                        mt-2
                        font-mono
                        text-xs
                        text-white/45
                      "
                    >
                      {demoBalance.loginid}
                    </p>
                  </div>

                  <div
                    className="
                      text-right
                    "
                  >
                    <p
                      className="
                        font-semibold
                        text-white
                      "
                    >
                      {formatMoney(
                        demoBalance.balance,
                        demoBalance.currency,
                      )}
                    </p>

                    <p
                      className="
                        mt-1
                        text-xs
                        text-white/40
                      "
                    >
                      Virtual funds
                    </p>
                  </div>
                </div>
              </button>

              {/* Reset Demo */}
              <div
                className="
                  px-4 pb-4
                "
              >
                <button
                  type="button"
                  disabled={
                    resetting ||
                    isLoading
                  }
                  onClick={() =>
                    void handleResetDemo()
                  }
                  className="
                    flex
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-lg
                    border
                    border-cyan-400/20
                    bg-cyan-400/10
                    px-3 py-2
                    text-xs
                    font-semibold
                    text-cyan-300
                    transition
                    hover:bg-cyan-400/15
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  {resetting ? (
                    <>
                      <Loader2
                        className="
                          h-3.5 w-3.5
                          animate-spin
                        "
                      />

                      Resetting...
                    </>
                  ) : (
                    <>
                      Reset Demo Balance
                      <span
                        className="
                          text-white/40
                        "
                      >
                        → $10,000
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Accounts returned by API                                        */}
          {/* ---------------------------------------------------------------- */}

          {accounts.length > 0 && (
            <div
              className="
                px-4 py-3
              "
            >
              <p
                className="
                  mb-2
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-wider
                  text-white/30
                "
              >
                Accounts
              </p>

              <div
                className="
                  space-y-1
                "
              >
                {accounts.map(
                  (account) => (
                    <button
                      key={
                        account.loginid
                      }
                      type="button"
                      onClick={() =>
                        void handleAccountSwitch(
                          account.loginid,
                        )
                      }
                      className="
                        flex
                        w-full
                        items-center
                        justify-between
                        rounded-lg
                        px-2 py-2
                        text-left
                        hover:bg-white/5
                      "
                    >
                      <span
                        className="
                          font-mono
                          text-xs
                          text-white/50
                        "
                      >
                        {account.loginid}
                      </span>

                      <span
                        className="
                          text-xs
                          text-white/60
                        "
                      >
                        {account.is_virtual
                          ? "DEMO"
                          : "REAL"}
                      </span>
                    </button>
                  ),
                )}
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Error                                                            */}
          {/* ---------------------------------------------------------------- */}

          {(error || message) && (
            <div
              className="
                border-t
                border-white/10
                px-4 py-3
              "
            >
              <p
                className="
                  text-xs
                  text-red-300
                "
              >
                {message || error}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
