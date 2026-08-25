import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, Eye, EyeOff, Flag, RefreshCw, Search, ShieldCheck, Trash2, Users, X } from "lucide-react";

import { api } from "./api.js";

function adminLogPresentation(log) {
  const presentations = {
    hide_post: { label: "Hidden", result: "Removed from the public Community feed" },
    restore_post: { label: "Restored", result: "Visible in the public Community feed" },
    delete_post: { label: "Deleted", result: "Permanently removed from Community" },
    resolve_report: { label: "Resolved", result: "Report review completed" },
    reopen_report: { label: "Reopened", result: "Returned to pending review" },
  };
  return presentations[log.action] || { label: log.action.replaceAll("_", " "), result: "Administrative action completed" };
}

function groupAdminLogs(logs) {
  const groups = new Map();
  logs.forEach((log) => {
    const postId = log.target_type === "community_post" ? log.target_id : log.details?.post_id;
    const key = postId ? `post-${postId}` : `${log.target_type}-${log.target_id}`;
    if (!groups.has(key)) {
      groups.set(key, {
        postId,
        title: log.target_label,
        owner: log.target_owner,
        entries: [],
      });
    }
    const group = groups.get(key);
    if (!group.owner && log.target_owner) group.owner = log.target_owner;
    group.entries.push(log);
  });
  return [...groups.values()];
}

function groupAdminPosts(posts) {
  const groups = new Map();
  posts.forEach((post) => {
    if (!groups.has(post.author.id)) {
      groups.set(post.author.id, { author: post.author, posts: [] });
    }
    groups.get(post.author.id).posts.push(post);
  });
  return [...groups.values()];
}

export default function AdminView({ setToast }) {
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedReports, setSelectedReports] = useState(null);
  const [view, setView] = useState("community");
  const [userSearch, setUserSearch] = useState("");
  const [communitySearch, setCommunitySearch] = useState("");
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

  async function loadLogs() {
    setLoading(true);
    setError("");
    try {
      setLogs(await api.admin.logs());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  function changeView(nextView) {
    setView(nextView);
    setSelectedUser(null);
    if (nextView === "users") loadUsers();
    else if (nextView === "logs") loadLogs();
    else loadPosts();
  }

  const visibleUsers = users.filter((user) => {
    const query = userSearch.trim().toLowerCase();
    return !query || user.full_name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
  });

  const visiblePosts = posts.filter((post) => {
    const query = communitySearch.trim().toLowerCase();
    return !query || [post.title, post.author.full_name, post.author.email, post.pet.name]
      .some((value) => value?.toLowerCase().includes(query));
  });

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
          <h1>{view === "community" ? "Community moderation" : view === "users" ? "User management" : "Admin activity logs"}</h1>
          <p>{view === "community" ? "Review every shared post, including hidden and reported content." : view === "users" ? "Open a user to review their account, pets, memories, records, and reminders." : "A chronological record of moderation actions taken by administrators."}</p>
        </div>
        <button className="secondary-button" type="button" onClick={view === "community" ? loadPosts : view === "users" ? loadUsers : loadLogs}>
          <RefreshCw aria-hidden="true" /> Refresh
        </button>
      </header>

      <div className="admin-management-toolbar">
        <nav className="admin-view-tabs" aria-label="Administrator sections">
          <button className={view === "community" ? "active" : ""} onClick={() => changeView("community")} type="button"><ShieldCheck aria-hidden="true" /> Community</button>
          <button className={view === "users" ? "active" : ""} onClick={() => changeView("users")} type="button"><Users aria-hidden="true" /> Users</button>
          <button className={view === "logs" ? "active" : ""} onClick={() => changeView("logs")} type="button"><Clock3 aria-hidden="true" /> Logs</button>
        </nav>
        {(view === "users" || view === "community") && (
          <label className="admin-user-search">
            <Search aria-hidden="true" />
            {view === "users" ? (
              <input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Search users by name or email" />
            ) : (
              <input value={communitySearch} onChange={(event) => setCommunitySearch(event.target.value)} placeholder="Search posts, users, emails, or pets" />
            )}
          </label>
        )}
      </div>

      {error && <p className="admin-error" role="alert">{error}</p>}
      {loading ? (
        <p className="admin-empty">Loading posts...</p>
      ) : view === "logs" ? (
        logs.length ? <div className="admin-log-list">{groupAdminLogs(logs).map((group) => (
          <article className="admin-log-group" key={group.postId || group.title}>
            <header>
              <div><small>Community post {group.postId ? `#${group.postId}` : ""}</small><h2>{group.title || "Deleted post"}</h2></div>
              {group.owner && <div className="admin-log-group-owner"><small>Post owner</small><strong>{group.owner.full_name}</strong><span>{group.owner.email} · User #{group.owner.id}</span></div>}
            </header>
            <div className="admin-log-timeline">
              {group.entries.map((log) => {
                const presentation = adminLogPresentation(log);
                return (
                  <div className="admin-log-entry" key={log.id}>
                    <span className={`admin-log-badge admin-log-${log.action}`}>{presentation.label}</span>
                    <div><strong>{presentation.result}</strong><small>By {log.admin.full_name} · {log.admin.email}</small></div>
                    <time dateTime={log.created_at}>{new Date(log.created_at).toLocaleString()}</time>
                  </div>
                );
              })}
            </div>
          </article>
        ))}</div> : <p className="admin-empty">No Admin actions recorded yet.</p>
      ) : view === "users" ? (
        <div className="admin-user-list">
          {visibleUsers.map((user) => (
            <button className="admin-user-row" key={user.id} onClick={() => openUser(user)} type="button">
              <span className="admin-user-avatar">{user.full_name?.[0]?.toUpperCase() || "U"}</span>
              <span><strong>{user.full_name}</strong><small>{user.email}</small></span>
              <span><strong>{user.pet_count}</strong><small>Pets</small></span>
              <span><strong>{user.community_post_count}</strong><small>Community posts</small></span>
              <span><small>Joined</small>{new Date(user.created_at).toLocaleDateString()}</span>
            </button>
          ))}
          {visibleUsers.length === 0 && <p className="admin-empty">No users match “{userSearch}”.</p>}
        </div>
      ) : visiblePosts.length === 0 ? (
        <p className="admin-empty">{posts.length ? `No Community posts match “${communitySearch}”.` : "No Community posts yet."}</p>
      ) : (
        <div className="admin-community-groups">
          {groupAdminPosts(visiblePosts).map((group) => (
            <section className="admin-post-user-group" key={group.author.id}>
              <header className="admin-post-user-header">
                <span className="admin-user-avatar">{group.author.full_name?.[0]?.toUpperCase() || "U"}</span>
                <div><small>Community member · User #{group.author.id}</small><h2>{group.author.full_name}</h2><span>{group.author.email}</span></div>
                <strong>{group.posts.length} {group.posts.length === 1 ? "post" : "posts"}</strong>
              </header>
              <div className="admin-post-list">
                {group.posts.map((post) => (
                  <article className="admin-post-row" key={post.id}>
              <div className="admin-post-preview">
                <img alt="" src={post.image_url} />
                <span>Post #{post.id}</span>
              </div>
              <div className="admin-post-content">
                <header className="admin-post-title">
                  <div><small>Community post</small><h2>{post.title}</h2></div>
                  <span className={`admin-status admin-status-${post.status}`}>{post.status}</span>
                </header>
                <div className="admin-post-information">
                  <section><small>Posted by</small><strong>{post.author.full_name}</strong><span>{post.author.email} · User #{post.author.id}</span></section>
                  <section><small>Pet</small><strong>{post.pet.name}</strong><span>{post.pet.species} · Pet #{post.pet.id}</span></section>
                </div>
                <div className="admin-post-metrics">
                  <span><strong>{post.like_count}</strong> Likes</span>
                  <span className={post.report_count ? "has-reports" : ""}><strong>{post.report_count}</strong> Reports</span>
                  <span className={post.pending_report_count ? "has-pending" : ""}><strong>{post.pending_report_count}</strong> Pending</span>
                </div>
                <footer className="admin-post-actions">
                  {post.report_count > 0 && <button type="button" onClick={() => setSelectedReports(post)}><Flag aria-hidden="true" /> Review reports</button>}
                  <button type="button" onClick={() => changeStatus(post)}>
                    {post.status === "hidden" ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                    {post.status === "hidden" ? "Restore post" : "Hide post"}
                  </button>
                  <button className="admin-delete-button" type="button" onClick={() => deletePost(post)}>
                    <Trash2 aria-hidden="true" /> Delete
                  </button>
                </footer>
              </div>
                  </article>
                ))}
              </div>
            </section>
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
