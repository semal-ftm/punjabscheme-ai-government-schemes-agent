import { useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, MessagesSquare, Trash2, UserRound } from "lucide-react";
import { CategoryBadge, LevelBadge } from "../components/Badges.jsx";
import { CardSkeleton, EmptyState, ErrorState, PageHeader } from "../components/States.jsx";
import { formatDateTime, timeAgo } from "../lib/format.js";
import { useUser } from "../lib/UserContext.jsx";

export default function Saved() {
  const { userId, user, loading, error, refresh, toggleSaved } = useUser();
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);

  if (!userId) {
    return (
      <>
        <PageHeader icon={Bookmark} title="Saved Schemes" />
        <EmptyState icon={UserRound} title="Pick a username first">
          Saved schemes and past conversations are linked to a simple username (no real name needed). Choose one in the
          menu.
        </EmptyState>
      </>
    );
  }

  const remove = async (id) => {
    setBusyId(id);
    setActionError(null);
    try {
      await toggleSaved(id);
    } catch (err) {
      setActionError(err);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader icon={Bookmark} title="Saved Schemes" subtitle={`Bookmarks and conversations for ${userId}.`} />
      {error && <ErrorState error={error} onRetry={refresh} />}
      {actionError && <ErrorState error={actionError} compact />}
      {loading && !user && <CardSkeleton />}

      {user && (
        <>
          <section aria-labelledby="saved-h">
            <h2 id="saved-h" className="section-title mb-3">
              Saved schemes ({user.saved?.length || 0})
            </h2>
            {user.saved?.length ? (
              <ul className="grid gap-3 md:grid-cols-2">
                {user.saved.map((s) => (
                  <li key={s.scheme_id} className="card flex items-start gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <Link to={`/schemes/${encodeURIComponent(s.scheme_id)}`} className="font-semibold text-navy-900 hover:underline">
                        {s.name || s.scheme_id}
                      </Link>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <CategoryBadge category={s.category} />
                        <LevelBadge level={s.level} />
                      </div>
                      {!s.name && <p className="mt-1 text-xs text-amber-700">This scheme is no longer in the database.</p>}
                      {s.note && <p className="mt-1 text-sm text-slate-600">{s.note}</p>}
                      <p className="mt-1 text-xs text-slate-400">Saved {timeAgo(s.saved_at)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(s.scheme_id)}
                      disabled={busyId === s.scheme_id}
                      className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      aria-label={`Remove ${s.name || s.scheme_id}`}
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Bookmark} title="Nothing saved yet" action={<Link to="/schemes" className="btn-primary">Explore schemes</Link>}>
                Use the bookmark icon on any scheme to keep it here.
              </EmptyState>
            )}
          </section>

          <section aria-labelledby="sessions-h">
            <h2 id="sessions-h" className="section-title mb-3">
              Past conversations
            </h2>
            {user.sessions?.length ? (
              <ul className="space-y-2">
                {user.sessions.map((c) => (
                  <li key={c.session_id} className="card flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-navy-900" dir="auto">
                        {c.summary || "Conversation (no summary)"}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Started {formatDateTime(c.started_at)} · last message {timeAgo(c.last_message_at)}
                      </p>
                    </div>
                    <Link to={`/chat?session=${encodeURIComponent(c.session_id)}`} className="btn-secondary shrink-0 !py-1.5">
                      <MessagesSquare className="h-4 w-4" aria-hidden /> Open
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={MessagesSquare} title="No conversations yet" action={<Link to="/chat" className="btn-primary">Start a chat</Link>}>
                Chats you have while signed in as {userId} will appear here with a short summary.
              </EmptyState>
            )}
          </section>
        </>
      )}
    </div>
  );
}
