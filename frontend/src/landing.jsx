import React from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  FileText,
  Heart,
  PawPrint,
  Sparkles,
  Upload,
  UsersRound,
} from "lucide-react";
import communityPhoto from "./assets/dami-memory.png";
import "./landing.css";

const LOGIN_URL = "/app.html?mode=login";
const SIGNUP_URL = "/app.html?mode=signup";
const PET_IMAGES = {
  left: "https://polo-pecan-73837341.figma.site/_assets/v11/8d44b25186ef45a5789c74668fb781cea4e1ff49.png",
  center: "https://polo-pecan-73837341.figma.site/_assets/v11/96745c4e72ad5c5208e53a885df797fd82cd854a.png?h=1024",
  right: "https://polo-pecan-73837341.figma.site/_assets/v11/81bd2e7a66b58f3d8f3ad78fd1ebf01af8dfdee1.png",
};

function Brand() {
  return <a className="landing-brand" href="#top"><img alt="" aria-hidden="true" src="/pawrise-mark-v2.png" /><span>PawRise</span></a>;
}

function LandingHeader() {
  return (
    <header className="landing-header">
      <Brand />
      <nav aria-label="Landing navigation">
        <a href="#why">Why PawRise</a>
        <a href="#features">Features</a>
        <a href="#how">How it works</a>
      </nav>
      <div className="landing-header-actions">
        <a className="text-link" href={LOGIN_URL}>Log in</a>
        <a className="coral-button compact" href={SIGNUP_URL}>Get started</a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="landing-hero" id="top">
      <LandingHeader />

      <aside className="hero-note hero-note-left">
        <span>CARE PLANNER</span>
        <div className="mini-care-card">
          <CalendarDays aria-hidden="true" />
          <div><strong>Medication</strong><small>Due tomorrow</small></div>
          <b>1</b>
        </div>
        <p>Stay ahead of the care that keeps them well.</p>
      </aside>

      <div className="hero-copy">
        <span className="hero-eyebrow">LIFE CARE JOURNAL</span>
        <h1><span>Everything</span><span>Your Pet Needs</span></h1>
      </div>

      <aside className="hero-note hero-note-right">
        <span>MEDICAL RECORDS</span>
        <div className="mini-record-card">
          <div><FileText aria-hidden="true" /><strong>Vet instructions</strong></div>
          <ArrowRight aria-hidden="true" />
          <div><Check aria-hidden="true" /><strong>Clear reminder</strong></div>
        </div>
        <p>Turn important instructions into an organized plan.</p>
      </aside>

      <div className="pet-stage" aria-label="Three pets representing PawRise profiles, care, and medical records">
        <article className="pet-panel pet-panel-left">
          <img alt="A small dog peeking over the PawRise care panel" src={PET_IMAGES.left} />
          <div className="pet-panel-copy">
            <strong>Plan ahead</strong>
            <span>Keep every care date in view.</span>
          </div>
        </article>
        <article className="pet-panel pet-panel-center">
          <img alt="A golden retriever at the center of the PawRise journal" src={PET_IMAGES.center} />
          <div className="pet-panel-copy">
            <strong>One home for their whole story</strong>
            <a href={SIGNUP_URL}>Start your journal <ArrowRight aria-hidden="true" /></a>
          </div>
        </article>
        <article className="pet-panel pet-panel-right">
          <img alt="A cat peeking over the PawRise profile panel" src={PET_IMAGES.right} />
          <div className="pet-panel-copy">
            <strong>Know them better</strong>
            <span>Keep important profile details close.</span>
          </div>
        </article>
      </div>

      <a className="scroll-cue" href="#why"><span>Discover PawRise</span><ChevronDown aria-hidden="true" /></a>
    </section>
  );
}

function ProblemSection() {
  return (
    <section className="problem-section" id="why">
      <div className="section-kicker">WHY PAWRISE</div>
      <div className="problem-grid">
        <h2>Keep pet care together.</h2>
        <div className="problem-copy">
          <p>Appointment cards, medication labels, and phone notes are easy to lose track of. PawRise brings the important parts of your pet's care into one simple journal.</p>
          <a className="arrow-link" href="#features">See what stays together <ArrowRight aria-hidden="true" /></a>
        </div>
      </div>
      <div className="problem-flow" aria-label="From scattered information to one PawRise journal">
        <div><CalendarDays aria-hidden="true" /><span>Care dates</span></div>
        <div><FileText aria-hidden="true" /><span>Vet instructions</span></div>
        <div><PawPrint aria-hidden="true" /><span>Pet profiles</span></div>
        <ArrowRight className="flow-arrow" aria-hidden="true" />
        <div className="flow-result"><PawPrint aria-hidden="true" /><span>One PawRise journal</span></div>
      </div>
    </section>
  );
}

const features = [
  {
    icon: CalendarDays,
    eyebrow: "CARE PLANNER",
    title: "Know what needs care next.",
    body: "Plan vaccines, checkups, medication, and custom care dates. See what is upcoming or overdue without searching through notes.",
    preview: (
      <div className="feature-preview planner-preview">
        <div className="preview-heading"><span>Today</span><small>All care in one view</small></div>
        <div className="preview-row"><CalendarDays /><span><strong>Flea medication</strong><small>Tomorrow · Mochi</small></span><b>Due soon</b></div>
        <div className="preview-row"><Check /><span><strong>Annual checkup</strong><small>September 7 · Mochi</small></span><b>Upcoming</b></div>
      </div>
    ),
  },
  {
    icon: Sparkles,
    eyebrow: "MEDICAL RECORDS",
    title: "Turn vet instructions into a clear plan.",
    body: "Upload or paste veterinary instructions, review the extracted details, and confirm only what should become a reminder.",
    preview: (
      <div className="feature-preview record-preview">
        <div className="record-source"><Upload /><span><strong>Veterinary document</strong><small>Discharge instructions.pdf</small></span></div>
        <ArrowRight />
        <div className="record-result"><Sparkles /><span><strong>Ready to review</strong><small>Medication + follow-up</small></span></div>
      </div>
    ),
  },
  {
    icon: UsersRound,
    eyebrow: "COMMUNITY",
    title: "See other pets, share your own.",
    body: "Post a photo of your pet for everyone on PawRise, and scroll through what other owners are sharing today.",
    preview: (
      <div className="feature-preview community-preview">
        <div className="community-photo-card">
          <img alt="Mochi relaxing in the morning sun" src={communityPhoto} />
          <span className="community-pet-tag"><PawPrint aria-hidden="true" /> Mochi</span>
        </div>
        <div className="community-post-copy">
          <small>Shared by Elena R.</small>
          <strong>First sunny<br />window nap</strong>
          <span><Heart aria-hidden="true" /> 24 owners liked this</span>
        </div>
      </div>
    ),
  },
];

function FeaturesSection() {
  return (
    <section className="features-section" id="features">
      <div className="section-heading centered">
        <span className="section-kicker">WHAT STAYS TOGETHER</span>
        <h2>Built around real pet life.</h2>
        <p>Only the tools that help you care and organize.</p>
      </div>
      <div className="feature-list">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <article className={index % 2 ? "feature-row reverse" : "feature-row"} key={feature.title}>
              <div className="feature-text">
                <span className="feature-icon"><Icon aria-hidden="true" /></span>
                <small>{feature.eyebrow}</small>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </div>
              {feature.preview}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function HowSection() {
  return (
    <section className="how-section" id="how">
      <div className="section-heading centered">
        <span className="section-kicker">HOW IT WORKS</span>
        <h2>Start with what matters.</h2>
      </div>
      <div className="steps">
        <article><b>01</b><PawPrint /><h3>Add your pet</h3><p>Create a profile with the essentials you want close at hand.</p></article>
        <article><b>02</b><CalendarDays /><h3>Plan or upload</h3><p>Add a care date or organize the instructions from a vet visit.</p></article>
        <article><b>03</b><UsersRound /><h3>Share the good days</h3><p>Post a photo for the community and see how other pets are doing.</p></article>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="final-cta">
      <PawPrint aria-hidden="true" />
      <span>CARE TODAY. STAY ORGANIZED.</span>
      <h2>Give their care one clear place to live.</h2>
      <a className="coral-button" href={SIGNUP_URL}>Create your PawRise journal <ArrowRight aria-hidden="true" /></a>
    </section>
  );
}

function Footer() {
  return (
    <footer className="landing-footer">
      <Brand />
      <p>A simple life care journal for pets and the people who love them.</p>
      <a href={LOGIN_URL}>Log in</a>
    </footer>
  );
}

function LandingPage() {
  return <main><Hero /><ProblemSection /><FeaturesSection /><HowSection /><FinalCta /><Footer /></main>;
}

createRoot(document.getElementById("landing-root")).render(<React.StrictMode><LandingPage /></React.StrictMode>);
