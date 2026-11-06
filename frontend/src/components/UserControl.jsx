import { useState } from "react";
import { LogOut, Trash2, UserRound } from "lucide-react";
import { USERNAME_PATTERN, useUser } from "../lib/UserContext.jsx";
import ConfirmDialog from "./ConfirmDialog.jsx";
import { Spinner } from "./States.jsx";

function suggestName() {
  const words = ["guest", "student", "visitor", "demo"];
  return `${words[Math.floor(Math.random() * words.length)]}_${Math.floor(1000 + Math.random() * 9000)}`;
}

/** Pseudonymous identity + "Remember my profile" consent + delete my data. Lives in the sidebar. */
export default function UserControl() {
  const { userId, user, loading, error, setUserId, setConsent, deleteData, consent } = useUser();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const valid = USERNAME_PATTERN.test(draft.trim());

  if (!userId) {
    return (
      <form
        className="rounded-2xl bg-white/[0.05] ring-1 ring-white/10 backdrop-blur p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) setUserId(draft.trim());
        }}
      >
        <label htmlFor="username" className="flex items-center gap-1.5 text-xs font-semibold text-white">
          <UserRound className="h-3.5 w-3.5" aria-hidden /> Pick a username
        </label>
        <p className="mt-1 text-[11px] leading-snug text-navy-200">
          Any nickname works, e.g. <span className="font-mono">ayesha_demo</span>. No real name needed. Used to save
          schemes and remember you.
        </p>
        <div className="mt-2 flex gap-1.5">
          <input
            id="username"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="ayesha_demo"
            maxLength={32}
            autoComplete="off"
            className="min-w-0 flex-1 rounded-lg border border-navy-600 bg-navy-900 px-2 py-1.5 text-sm text-white placeholder:text-navy-400 focus:border-emerald-400 focus:outline-none"
          />
          <button type="submit" disabled={!valid} className="btn-primary !px-3 !py-1.5 text-xs">
            Use
          </button>
        </div>
        {draft && !valid && (
          <p className="mt-1 text-[11px] text-amber-300">3-32 characters: letters, numbers, _ . -</p>
        )}
        <button type="button" className="mt-2 text-[11px] text-emerald-300 hover:underline" onClick={() => setDraft(suggestName())}>
          Suggest one for me
        </button>
      </form>
    );
  }

  const toggleConsent = async () => {
    setBusy(true);
    setActionError("");
    try {
      await setConsent(!consent);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setBusy(true);
    setActionError("");
    try {
      await deleteData();
      setConfirmOpen(false);
    } catch (err) {
      setActionError(err.message);
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white/[0.05] ring-1 ring-white/10 backdrop-blur p-3 text-white">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-sm font-bold uppercase text-emerald-300">
          {userId.slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{userId}</p>
          <p className="text-[11px] text-navy-300">
            {loading ? "Loading..." : user ? `${user.saved?.length || 0} saved scheme(s)` : error ? "Offline" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setUserId(null)}
          className="rounded-lg p-1.5 text-navy-300 hover:bg-navy-700 hover:text-white"
          title="Switch user"
          aria-label="Switch user"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span id="consent-label" className="text-xs font-medium">
          Remember my profile
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={consent}
          aria-labelledby="consent-label"
          disabled={busy || !user}
          onClick={toggleConsent}
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
            consent ? "bg-emerald-500" : "bg-navy-600"
          }`}
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${consent ? "translate-x-4" : "translate-x-0.5"}`} />
        </button>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-navy-300">
        {consent
          ? "Your eligibility facts are saved to your account so the assistant remembers them next time."
          : "Off: your profile only lives in the current session and is not stored."}
      </p>
      {busy && !confirmOpen && <Spinner className="mt-1 h-3 w-3 text-navy-300" />}
      {actionError && <p className="mt-1 text-[11px] text-rose-300">{actionError}</p>}

      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-rose-300 hover:text-rose-200 hover:underline"
      >
        <Trash2 className="h-3 w-3" aria-hidden /> Delete my data
      </button>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete all your data?"
        confirmLabel="Delete everything"
        danger
        busy={busy}
        onConfirm={doDelete}
        onCancel={() => setConfirmOpen(false)}
      >
        This permanently removes the saved profile, saved schemes and conversation history stored for{" "}
        <strong>{userId}</strong>. This cannot be undone.
      </ConfirmDialog>
    </div>
  );
}
