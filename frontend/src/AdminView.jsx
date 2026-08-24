import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Eye, EyeOff, Flag, RefreshCw, ShieldCheck, Trash2, Users, X } from "lucide-react";

import { api } from "./api.js";

export default function AdminView({ setToast }) {
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedReports, setSelectedReports] = useState(null);
  const [view, setView] = useState("community");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setPosts(await api.admin.posts());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      setUsers(await api.admin.users());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function openUser(user) {
    try {
      setSelectedUser(await api.admin.user(user.id));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function changeView(nextView) {
    setView(nextView);
    setSelectedUser(null);
    if (nextView === "users") loadUsers();
    else loadPosts();
  }

  async function changeStatus(post) {
    const status = post.status === "hidden" ? "published" : "hidden";
    try {
      await api.community.moderate(post.id, status);
      setToast(status === "hidden" ? "Post hidden." : "Post restored.");
      await loadPosts();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function deletePost(post) {
    if (!window.confirm(`Delete “${post.title}”?`)) return;
    try {
      await api.community.remove(post.id);
      setToast("Post deleted.");
      await loadPosts();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function resolveReport(report) {
    try {
      await api.admin.updateReport(report.id, "resolved");
      setToast("Report marked as resolved.");
      const refreshed = await api.admin.posts();
      setPosts(refreshed);
      setSelectedReports(refreshed.find((post) => post.id === selectedReports.id) || null);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <div>
          <span><ShieldCheck aria-hidden="true" /> Administrator</span>
          <h1>{view === "community" ? "Community moderation" : "User management"}</h1>
          <p>{view === "community" ? "Review every shared post, including hidden and reported content." : "Open a user to review their account, pets, memories, records, and reminders."}</p>
        </div>
        <button className="secondary-button" type="button" onClick={view === "community" ? loadPosts : loadUsers}>
          <RefreshCw aria-hidden="true" /> Refresh
        </button>
      </header>

      <nav className="admin-view-tabs" aria-label="Administrator sections">
        <button className={view === "community" ? "active" : ""} onClick={() => changeView("community")} type="button"><ShieldCheck aria-hidden="true" /> Community</button>
        <button className={view === "users" ? "active" : ""} onClick={() => changeView("users")} type="button"><Users aria-hidden="true" /> Users</button>
      </nav>

      {error && <p className="admin-error" role="alert">{error}</p>}
      {loading ? (
        <p className="admin-empty">Loading posts...</p>
      ) : view === "users" ? (
        <div className="admin-user-list">
          {users.map((user) => (
            <button className="admin-user-row" key={user.id} onClick={() => openUser(user)} type="button">
              <span className="admin-user-avatar">{user.full_name?.[0]?.toUpperCase() || "U"}</span>
              <span><strong>{user.full_name}</strong><small>{user.email}</small></span>
              <span><strong>{user.pet_count}</strong><small>Pets</small></span>
              <span><strong>{user.community_post_count}</strong><small>Community posts</small></span>
              <span><small>Joined</small>{new Date(user.created_at).toLocaleDateString()}</span>
            </button>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <p className="admin-empty">No Community posts yet.</p>
      ) : (
        <div className="admin-post-list">
          {posts.map((post) => (
            <article className="admin-post-row" key={post.id}>
              <img alt="" src={post.image_url} />
              <div className="admin-post-main">
                <div className="admin-post-title">
                  <h2>{post.title}</h2>
                  <span className={`admin-status admin-status-${post.status}`}>{post.status}</span>
                </div>
                <p>{post.author.full_name} · {post.author.email} · {post.pet.name}</p>
                <small>{post.like_count} likes · {post.report_count} reports · {post.pending_report_count} pending</small>
              </div>
              <div className="admin-post-actions">
                {post.report_count > 0 && <button type="button" onClick={() => setSelectedReports(post)}><Flag aria-hidden="true" /> Reports ({post.report_count})</button>}
                <button type="button" onClick={() => changeStatus(post)}>
                  {post.status === "hidden" ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                  {post.status === "hidden" ? "Restore" : "Hide"}
                </button>
                <button className="admin-delete-button" type="button" onClick={() => deletePost(post)}>
                  <Trash2 aria-hidden="true" /> Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedUser && (
        <div className="admin-user-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSelectedUser(null)}>
          <section className="admin-user-detail" role="dialog" aria-modal="true" aria-label="User details">
            <header><div><h2>{selectedUser.full_name}</h2><p>{selectedUser.email} · User ID {selectedUser.id} · {selectedUser.role}</p></div><button onClick={() => setSelectedUser(null)} type="button" aria-label="Close"><X /></button></header>
            <div className="admin-user-summary"><span>Joined: {new Date(selectedUser.created_at).toLocaleString()}</span><span>{selectedUser.pets.length} pets</span><span>{selectedUser.community_posts.length} Community posts</span></div>
            <h3>Pets and their information</h3>
            {selectedUser.pets.length ? selectedUser.pets.map((pet) => (
              <article className="admin-pet-detail" key={pet.id}>
                <div>{pet.image_url && <img alt="" src={pet.image_url} />}<span><strong>{pet.name}</strong><small>{pet.species}{pet.breed ? ` · ${pet.breed}` : ""}{pet.sex ? ` · ${pet.sex}` : ""}</small></span></div>
                <dl>
                  <div><dt>Birthday / age</dt><dd>{pet.birthday || (pet.estimated_age_value ? `Approx. ${pet.estimated_age_value} ${pet.estimated_age_unit}` : "Not provided")}</dd></div>
                  <div><dt>Came home</dt><dd>{pet.adoption_date || "Not provided"}</dd></div>
                  <div><dt>Weight</dt><dd>{pet.weight_lb ? `${pet.weight_lb} lb` : "Not provided"}</dd></div>
                  <div><dt>Activity</dt><dd>{pet.memories.length} memories · {pet.medical_records.length} medical records · {pet.reminders.length} reminders</dd></div>
                  <div><dt>Notes</dt><dd>{pet.notes || "No notes"}</dd></div>
                </dl>
              </article>
            )) : <p className="admin-empty">This user has no pets.</p>}
          </section>
        </div>
      )}

      {selectedReports && (
        <div className="admin-user-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSelectedReports(null)}>
          <section className="admin-user-detail admin-report-detail" role="dialog" aria-modal="true" aria-label="Post reports">
            <header><div><h2>Reports for “{selectedReports.title}”</h2><p>{selectedReports.pending_report_count} pending · {selectedReports.report_count} total</p></div><button onClick={() => setSelectedReports(null)} type="button" aria-label="Close"><X /></button></header>
            <div className="admin-report-list">
              {selectedReports.reports.map((report) => (
                <article key={report.id} className={`admin-report-item admin-report-${report.status}`}>
                  <div><strong>{report.reason}</strong><span>Reported by {report.reporter.full_name} · {report.reporter.email}</span><small>{new Date(report.created_at).toLocaleString()}</small></div>
                  {report.status === "pending" ? <button onClick={() => resolveReport(report)} type="button"><CheckCircle2 /> Mark resolved</button> : <span className="admin-resolved-label"><CheckCircle2 /> Resolved</span>}
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
