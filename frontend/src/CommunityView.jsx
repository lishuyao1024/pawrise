import { useEffect, useMemo, useRef, useState } from "react";
import {
  Ban,
  Camera,
  Cat,
  Dog,
  Flag,
  Globe2,
  Heart,
  PawPrint,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { api } from "./api.js";


const emptyDraft = {
  petId: "",
  title: "",
  thought: "",
  image: "",
  photoName: "",
};

function initials(name = "PawRise") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function relativeTime(value) {
  const timestamp = new Date(value).getTime();
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

function localDateIso() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function PostCard({ post, onBlock, onDelete, onHide, onLike, onReport, user }) {
  const canModerate = user.role === "admin";
  return (
    <article className="community-post-card">
      <header className="community-post-author">
        {post.author.avatar_url
          ? <img alt="" src={post.author.avatar_url} />
          : <span className="community-author-fallback">{initials(post.author.full_name)}</span>}
        <div>
          <strong>{post.author.full_name}</strong>
          <span>{post.pet.name}{post.pet.breed ? ` · ${post.pet.breed}` : ""}</span>
        </div>
        <time dateTime={post.created_at}>{relativeTime(post.created_at)}</time>
      </header>

      <div className="community-post-image">
        <img alt={`${post.pet.name} — ${post.title}`} src={post.image_url} />
        <span><PawPrint aria-hidden="true" />{post.pet.name}</span>
      </div>

      <div className="community-post-copy">
        <h2>{post.title}</h2>
        {post.body && <p>{post.body}</p>}
        <footer>
          <button
            aria-pressed={post.viewer_has_liked}
            className={post.viewer_has_liked ? "community-liked" : ""}
            onClick={() => onLike(post)}
            type="button"
          >
            <Heart aria-hidden="true" fill={post.viewer_has_liked ? "currentColor" : "none"} />
            {post.like_count}
          </button>
          <div className="community-post-controls">
            {canModerate && !post.viewer_owns && (
              <button aria-label={`Hide ${post.title}`} onClick={() => onHide(post)} type="button">
                <ShieldCheck aria-hidden="true" /> Hide
              </button>
            )}
            {post.viewer_owns || canModerate ? (
              <button aria-label={`Delete ${post.title}`} onClick={() => onDelete(post)} type="button">
                <Trash2 aria-hidden="true" /> Delete
              </button>
            ) : (
              <>
                <button aria-label={`Report ${post.title}`} onClick={() => onReport(post)} type="button">
                  <Flag aria-hidden="true" /> Report
                </button>
                <button aria-label={`Block ${post.author.full_name}`} onClick={() => onBlock(post)} type="button">
                  <Ban aria-hidden="true" /> Block
                </button>
              </>
            )}
          </div>
        </footer>
      </div>
    </article>
  );
}

function CommunityComposer({ onClose, onSaved, pets, setToast }) {
  const [draft, setDraft] = useState({ ...emptyDraft, petId: pets[0]?.id || "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef(null);
  const selectedPet = pets.find((pet) => pet.id === draft.petId) || pets[0];

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => event.key === "Escape" && onClose();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  async function choosePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await api.uploadImage(file);
      setDraft((current) => ({ ...current, image: uploaded.url, photoName: file.name }));
    } catch (error) {
      setToast(error.message);
    } finally {
      setUploading(false);
    }
  }

  async function save(event) {
    event.preventDefault();
    if (!draft.petId || !draft.title.trim() || !draft.thought.trim() || !draft.image) {
      setToast("Pet, photo, title, and your thought are required.");
      return;
    }
    setSaving(true);
    try {
      const memory = await api.memories.create({
        pet_id: Number(draft.petId),
        title: draft.title.trim(),
        memory_date: localDateIso(),
        category: "daily_moment",
        scene: null,
        description: draft.thought.trim(),
        image_url: draft.image,
      });
      await api.community.create({ memory_id: memory.id });
      await onSaved();
      setToast("Your moment is now visible in Community.");
      onClose();
    } catch (error) {
      const detail = error.details ? Object.values(error.details)[0] : null;
      setToast(detail || error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="community-composer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section aria-labelledby="community-composer-title" aria-modal="true" className="community-composer" role="dialog">
        <header>
          <div><span className="eyebrow">A new little story</span><h2 id="community-composer-title">Share a moment</h2></div>
          <button aria-label="Close composer" onClick={onClose} type="button"><X aria-hidden="true" /></button>
        </header>
        <div className="community-composer-grid">
          <div className="community-composer-preview">
            {draft.image || selectedPet?.image
              ? <img alt="Selected post preview" src={draft.image || selectedPet.image} />
              : <PawPrint aria-hidden="true" />}
            <button disabled={uploading} onClick={() => fileInput.current?.click()} type="button">
              <Camera aria-hidden="true" /> {uploading ? "Uploading..." : draft.image ? "Change photo" : "Choose photo"}
            </button>
            <input accept="image/jpeg,image/png,image/gif,image/webp" onChange={choosePhoto} ref={fileInput} type="file" />
          </div>
          <form onSubmit={save}>
            <label>Pet<select required value={draft.petId} onChange={(event) => setDraft((current) => ({ ...current, petId: event.target.value }))}>{pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name}</option>)}</select></label>
            <label>Title<input maxLength="150" required value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="What made this moment special?" /></label>
            <label>Your thought<textarea maxLength="500" required rows="5" value={draft.thought} onChange={(event) => setDraft((current) => ({ ...current, thought: event.target.value }))} placeholder="Write a few words about this moment…" /><small>{draft.thought.length}/500</small></label>
            <p className="community-visibility-note"><Globe2 aria-hidden="true" />This moment will be visible to PawRise members.</p>
            <button className="primary-button community-publish-button" disabled={saving || uploading} type="submit">{saving ? "Saving..." : "Share with Community"}</button>
          </form>
        </div>
      </section>
    </div>
  );
}

export default function CommunityView({ openPage, pets, refreshData, setToast, user }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("feed");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);

  async function loadPosts() {
    setLoading(true);
    try {
      setPosts(await api.community.list());
    } catch (error) {
      setToast(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadPosts(); }, []);

  const visiblePosts = useMemo(() => posts.filter((post) => {
    if (view === "mine" && !post.viewer_owns) return false;
    if (filter !== "all" && post.pet.species.toLowerCase() !== filter) return false;
    const query = search.trim().toLowerCase();
    return !query || [post.author.full_name, post.pet.name, post.pet.breed, post.title, post.body]
      .filter(Boolean).some((value) => value.toLowerCase().includes(query));
  }), [filter, posts, search, view]);

  async function toggleLike(post) {
    try {
      const updated = post.viewer_has_liked
        ? await api.community.unlike(post.id)
        : await api.community.like(post.id);
      setPosts((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (error) { setToast(error.message); }
  }

  async function deletePost(post) {
    if (!window.confirm(`Remove “${post.title}” from Community?`)) return;
    try {
      await api.community.remove(post.id);
      setPosts((current) => current.filter((item) => item.id !== post.id));
      setToast("Community post removed.");
    } catch (error) { setToast(error.message); }
  }

  async function hidePost(post) {
    if (!window.confirm(`Hide “${post.title}” from Community?`)) return;
    try {
      await api.community.moderate(post.id, "hidden");
      setPosts((current) => current.filter((item) => item.id !== post.id));
      setToast("Community post hidden.");
    } catch (error) { setToast(error.message); }
  }

  async function reportPost(post) {
    const reason = window.prompt("Why should PawRise review this post?");
    if (!reason?.trim()) return;
    try {
      await api.community.report(post.id, reason.trim());
      setToast("Report submitted for review.");
    } catch (error) { setToast(error.message); }
  }

  async function blockAuthor(post) {
    if (!window.confirm(`Block ${post.author.full_name}? Their posts will disappear from your Community feed.`)) return;
    try {
      await api.community.block(post.author.id);
      setPosts((current) => current.filter((item) => item.author.id !== post.author.id));
      setToast(`${post.author.full_name} blocked.`);
    } catch (error) { setToast(error.message); }
  }

  async function afterPublish() {
    await Promise.all([loadPosts(), refreshData()]);
  }

  return (
    <>
      <header className="topbar community-topbar">
        <div><span className="eyebrow">PawRise Community</span><h1>Stories from every paw.</h1><p>A warm corner for the everyday moments that make life with pets so good.</p></div>
        <button className="primary-button" disabled={!pets.length} onClick={() => setComposerOpen(true)} type="button"><Plus aria-hidden="true" /> Share a moment</button>
      </header>

      <section className="community-page">
        <div className="community-toolbar">
          <div className="community-view-tabs">
            <button className={view === "feed" ? "active" : ""} onClick={() => setView("feed")} type="button"><Users aria-hidden="true" /> Community feed</button>
            <button className={view === "mine" ? "active" : ""} onClick={() => setView("mine")} type="button"><ShieldCheck aria-hidden="true" /> My shares</button>
          </div>
          <label className="community-search"><Search aria-hidden="true" /><input aria-label="Search Community" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search stories or pets" /></label>
          <div className="community-filters" aria-label="Filter posts">
            <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")} type="button"><PawPrint aria-hidden="true" /> All</button>
            <button className={filter === "cat" ? "active" : ""} onClick={() => setFilter("cat")} type="button"><Cat aria-hidden="true" /> Cats</button>
            <button className={filter === "dog" ? "active" : ""} onClick={() => setFilter("dog")} type="button"><Dog aria-hidden="true" /> Dogs</button>
          </div>
        </div>

        {loading ? <div className="community-empty"><PawPrint aria-hidden="true" /><h2>Loading Community…</h2></div> : visiblePosts.length ? (
          <div className="community-post-grid">{visiblePosts.map((post) => <PostCard key={post.id} post={post} onBlock={blockAuthor} onDelete={deletePost} onHide={hidePost} onLike={toggleLike} onReport={reportPost} user={user} />)}</div>
        ) : (
          <div className="community-empty"><PawPrint aria-hidden="true" /><h2>{view === "mine" ? "No shared moments yet" : posts.length ? "No stories match this view" : "Community is ready for its first story"}</h2><p>Share pet moments with other PawRise members.</p><button className="primary-button" onClick={() => pets.length ? setComposerOpen(true) : openPage("My Pets")} type="button">{pets.length ? "Share a moment" : "Add a pet first"}</button></div>
        )}
      </section>
      {composerOpen && <CommunityComposer onClose={() => setComposerOpen(false)} onSaved={afterPublish} pets={pets} setToast={setToast} />}
    </>
  );
}
