import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import BrandMark from "../components/common/BrandMark";
import {
  Activity,
  ArrowRight,
  Building2,
  Clock3,
  Droplets,
  Eye,
  FileInput,
  Leaf,
  LineChart,
  LogOut,
  MapPin,
  PanelsTopLeft,
  Play,
  Route,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { CITIES } from "../data/cityData";
import { NAVIGATION_ITEMS } from "../components/layout/Sidebar";

const capabilities = [
  {
    title: "Digital City Twin",
    description: "Explore a connected view of city systems and key urban indicators.",
    icon: Building2,
    color: "#38bdf8",
  },
  {
    title: "Future Forecasts",
    description: "Review data-driven outlooks for population, energy, and city health.",
    icon: Activity,
    color: "#818cf8",
  },
  {
    title: "What-if Scenarios",
    description: "Compare planning choices and see how different decisions may affect the city.",
    icon: Sparkles,
    color: "#2dd4bf",
  },
  {
    title: "Mobility & Traffic",
    description: "Understand transportation patterns and identify opportunities to improve movement.",
    icon: Route,
    color: "#22d3ee",
  },
  {
    title: "Environment & Climate",
    description: "Track environmental indicators, pollution, and climate-related risks.",
    icon: Leaf,
    color: "#34d399",
  },
  {
    title: "City Resources",
    description: "Monitor energy and water systems as part of a more sustainable city plan.",
    icon: Droplets,
    color: "#60a5fa",
  },
];

const roadmapSteps = [
  {
    step: "01",
    title: "Choose a city",
    description: "Start by selecting the urban context and the data snapshot the simulation should explore.",
    icon: MapPin,
    color: "#60a5fa",
  },
  {
    step: "02",
    title: "Review city dashboard",
    description: "Scan the current state of population, traffic, pollution, water, energy, and health signals.",
    icon: Building2,
    color: "#38bdf8",
  },
  {
    step: "03",
    title: "Explore the twin",
    description: "Open the connected digital twin to understand how systems interact across the city.",
    icon: Eye,
    color: "#22d3ee",
  },
  {
    step: "04",
    title: "Forecast & assess risk",
    description: "Review future conditions and identify the risks, pressures, and opportunities ahead.",
    icon: Activity,
    color: "#67e8f9",
  },
  {
    step: "05",
    title: "Run what-if simulation",
    description: "Test policy and design scenarios to compare how decisions reshape urban outcomes.",
    icon: Sparkles,
    color: "#818cf8",
  },
  {
    step: "06",
    title: "Get AI recommendations",
    description: "Use guided insights to refine the best strategy and turn it into practical next steps.",
    icon: Route,
    color: "#a78bfa",
  },
];

const MAX_FEATURED_IMAGES = 30;
const FEATURED_CITIES = [
  { id: "shenzhen", name: "Shenzhen", country: "China", article: "Shenzhen" },
  { id: "cyberjaya", name: "Cyberjaya", country: "Malaysia", article: "Cyberjaya" },
  { id: "songdo", name: "Songdo", country: "South Korea", article: "Songdo" },
  { id: "lusail", name: "Lusail", country: "Qatar", article: "Lusail" },
  { id: "smart-city", name: "Smart mobility", country: "Urban systems", article: "Smart city" },
  { id: "xiong-an", name: "Xiong'an", country: "China", article: "Xiong'an" },
  { id: "forest-city", name: "Forest City", country: "Malaysia", article: "Forest City, Johor" },
  { id: "dubai", name: "Dubai", country: "United Arab Emirates", article: "Dubai" },
  { id: "abu-dhabi", name: "Abu Dhabi", country: "United Arab Emirates", article: "Abu Dhabi" },
  { id: "seoul", name: "Seoul", country: "South Korea", article: "Seoul" },
  { id: "beijing", name: "Beijing", country: "China", article: "Beijing" },
  { id: "shanghai", name: "Shanghai", country: "China", article: "Shanghai" },
  { id: "guangzhou", name: "Guangzhou", country: "China", article: "Guangzhou" },
  { id: "hong-kong", name: "Hong Kong", country: "Hong Kong", article: "Hong Kong Island" },
  { id: "taipei", name: "Taipei", country: "Taiwan", article: "Taipei" },
  { id: "kuala-lumpur", name: "Kuala Lumpur", country: "Malaysia", article: "Kuala Lumpur" },
  { id: "jakarta", name: "Jakarta", country: "Indonesia", article: "Jakarta" },
  { id: "manila", name: "Manila", country: "Philippines", article: "Manila" },
  { id: "hanoi", name: "Hanoi", country: "Vietnam", article: "Hanoi" },
  { id: "bangkok", name: "Bangkok", country: "Thailand", article: "Bangkok" },
  { id: "doha", name: "Doha", country: "Qatar", article: "Doha" },
  { id: "riyadh", name: "Riyadh", country: "Saudi Arabia", article: "Riyadh" },
  { id: "london", name: "London", country: "United Kingdom", article: "London" },
  { id: "rotterdam", name: "Rotterdam", country: "Netherlands", article: "Rotterdam" },
  { id: "copenhagen", name: "Copenhagen", country: "Denmark", article: "Copenhagen" },
  { id: "toronto", name: "Toronto", country: "Canada", article: "Toronto" },
  { id: "vancouver", name: "Vancouver", country: "Canada", article: "Vancouver" },
  { id: "new-york", name: "New York City", country: "United States", article: "New_York_City" },
  { id: "curitiba", name: "Curitiba", country: "Brazil", article: "Curitiba" },
  { id: "medellin", name: "Medellin", country: "Colombia", article: "Medellín" },
].slice(0, MAX_FEATURED_IMAGES);

const VISIT_COUNT_KEY = "city-simulator-browser-visits";
const VISIT_SESSION_KEY = "city-simulator-visit-session";
const ACTIVE_VISITS_CHANNEL = "city-simulator-active-visits";

function recordBrowserVisit() {
  try {
    const previousVisits = Number(window.localStorage.getItem(VISIT_COUNT_KEY)) || 0;
    if (window.sessionStorage.getItem(VISIT_SESSION_KEY)) return previousVisits;

    const nextVisits = previousVisits + 1;
    window.localStorage.setItem(VISIT_COUNT_KEY, String(nextVisits));
    window.sessionStorage.setItem(VISIT_SESSION_KEY, "active");
    return nextVisits;
  } catch {
    return 1;
  }
}

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}m ${seconds}s`;
}

export default function LandingPage() {
  const { isLoggedIn, logout } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const [browserVisitCount, setBrowserVisitCount] = useState(0);
  const [pageSeconds, setPageSeconds] = useState(0);
  const [activeVisitCount, setActiveVisitCount] = useState(1);
  const [heroSlides, setHeroSlides] = useState([]);
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);

  useEffect(() => {
    const revealElements = document.querySelectorAll(".lp-reveal");
    if (prefersReducedMotion || typeof IntersectionObserver === "undefined") {
      revealElements.forEach((element) => element.classList.add("is-visible"));
      return undefined;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px 96px 0px" });

    const revealApproachingSections = () => {
      revealElements.forEach((element) => {
        if (element.getBoundingClientRect().top > window.innerHeight + 120) return;
        element.classList.add("is-visible");
        observer.unobserve(element);
      });
    };

    revealElements.forEach((element) => observer.observe(element));
    window.addEventListener("scroll", revealApproachingSections, { passive: true });
    revealApproachingSections();
    return () => {
      window.removeEventListener("scroll", revealApproachingSections);
      observer.disconnect();
    };
  }, [prefersReducedMotion]);

  useEffect(() => {
    setBrowserVisitCount(recordBrowserVisit());

    const startedAt = Date.now();
    const durationTimer = window.setInterval(() => {
      setPageSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    const handleVisitCountChange = (event) => {
      if (event.key === VISIT_COUNT_KEY) {
        setBrowserVisitCount(Number(event.newValue) || 0);
      }
    };
    window.addEventListener("storage", handleVisitCountChange);

    if (typeof BroadcastChannel === "undefined") {
      return () => {
        window.clearInterval(durationTimer);
        window.removeEventListener("storage", handleVisitCountChange);
      };
    }

    const channel = new BroadcastChannel(ACTIVE_VISITS_CHANNEL);
    const visitId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const activeVisits = new Map([[visitId, Date.now()]]);
    const handlePresenceMessage = (event) => {
      const message = event.data;
      if (!message?.id || message.id === visitId) return;

      if (message.type === "leave") {
        activeVisits.delete(message.id);
      } else if (message.type === "heartbeat") {
        activeVisits.set(message.id, Date.now());
      }
      setActiveVisitCount(activeVisits.size);
    };
    channel.addEventListener("message", handlePresenceMessage);

    const sendHeartbeat = () => {
      const now = Date.now();
      for (const [id, lastSeen] of activeVisits) {
        if (now - lastSeen > 10000) activeVisits.delete(id);
      }
      activeVisits.set(visitId, now);
      channel.postMessage({ type: "heartbeat", id: visitId });
      setActiveVisitCount(activeVisits.size);
    };
    sendHeartbeat();
    const presenceTimer = window.setInterval(sendHeartbeat, 3000);
    const leavePage = () => channel.postMessage({ type: "leave", id: visitId });
    window.addEventListener("pagehide", leavePage);

    return () => {
      window.clearInterval(durationTimer);
      window.clearInterval(presenceTimer);
      window.removeEventListener("storage", handleVisitCountChange);
      window.removeEventListener("pagehide", leavePage);
      leavePage();
      channel.close();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      prop: "pageimages",
      piprop: "thumbnail",
      pithumbsize: "1800",
      origin: "*",
      redirects: "1",
      titles: FEATURED_CITIES.map((city) => city.article.replaceAll("_", " ")).join("|"),
    });

    fetch(`https://en.wikipedia.org/w/api.php?${params}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Featured city image request failed");
        return response.json();
      })
      .then((data) => {
        const pages = Object.values(data.query?.pages || {});
        const slides = FEATURED_CITIES.flatMap((city) => {
          const page = pages.find((item) => item.title?.toLowerCase() === city.article.replaceAll("_", " ").toLowerCase());
          return page?.thumbnail?.source ? [{ ...city, image: page.thumbnail.source }] : [];
        });
        setHeroSlides(slides);
      })
      .catch((error) => {
        if (error.name !== "AbortError") console.warn("Could not load featured city image:", error);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (heroSlides.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const slideTimer = window.setInterval(() => {
      setActiveHeroSlide((current) => (current + 1) % heroSlides.length);
    }, 6500);
    return () => window.clearInterval(slideTimer);
  }, [heroSlides.length]);

  const currentHeroSlide = heroSlides[activeHeroSlide] || null;
  const renderTitleWord = (word, className, delayOffset = 0) => (
    <span className={`lp-title-word ${className}`} aria-hidden="true">
      {Array.from(word).map((letter, index) => (
        <motion.span
          key={`${word}-${index}`}
          className="lp-title-letter"
          initial={prefersReducedMotion ? false : { opacity: 0, y: "0.6em", filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            duration: prefersReducedMotion ? 0.01 : 0.56,
            delay: prefersReducedMotion ? 0 : delayOffset + index * 0.045,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {letter}
        </motion.span>
      ))}
    </span>
  );

  const usageStats = [
    { label: "Active visits in this browser", value: activeVisitCount, detail: "Live across open tabs", icon: Users, color: "#a78bfa" },
    { label: "Visits on this browser", value: browserVisitCount, detail: "Updates as visits begin", icon: Eye, color: "#38bdf8" },
    { label: "Time on this visit", value: formatDuration(pageSeconds), detail: "Updates every second", icon: Clock3, color: "#2dd4bf" },
    { label: "Simulator tools", value: NAVIGATION_ITEMS.length, detail: "Current app catalog", icon: PanelsTopLeft, color: "#22d3ee" },
    { label: "City models", value: Object.keys(CITIES).length, detail: "Current city catalog", icon: MapPin, color: "#34d399" },
  ];

  return (
    <main className="lp-root">
      <div className="lp-grid" aria-hidden="true" />
      <header className="lp-brand-bar">
        <Link to="/" className="lp-brand" aria-label="YUG NIRMAN home">
          <span className="lp-brand-mark">
            <BrandMark className="lp-brand-image" />
          </span>
          <span className="lp-brand-copy">
            <strong>YUG NIRMAN</strong>
            <small>CITY SIMULATOR · URBAN INTELLIGENCE</small>
          </span>
        </Link>
        <nav className="lp-nav" aria-label="Main navigation">
          <a href="#roadmap">Roadmap</a>
          <a href="#platform">Platform</a>
          <a href="#activity">Live activity</a>
        </nav>
        {isLoggedIn && (
          <button type="button" className="lp-logout" onClick={logout}>
            <LogOut size={16} aria-hidden="true" />
            Log out
          </button>
        )}
      </header>
      <section className="lp-hero" aria-labelledby="lp-title">
        <AnimatePresence initial={false} mode="sync">
          {currentHeroSlide && (
            <motion.img
              key={currentHeroSlide.id}
              className="lp-hero-image"
              src={currentHeroSlide.image}
              alt=""
              fetchPriority="high"
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 1.06, filter: "blur(7px) saturate(0.92) brightness(1.06)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px) saturate(1.14) brightness(1.08)" }}
              exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.985, filter: "blur(3px) saturate(0.92) brightness(1.02)" }}
              transition={{ duration: prefersReducedMotion ? 0.01 : 1.25, ease: [0.22, 1, 0.36, 1] }}
            />
          )}
        </AnimatePresence>
        <div className="lp-hero-scrim" aria-hidden="true" />
        <div className="lp-hero-content">
          <div className="lp-badge">
            <span className="lp-badge-dot" />
            URBAN INTELLIGENCE · DIGITAL TWIN
          </div>
          <h1 id="lp-title" className="lp-title" aria-label="YUG NIRMAN">
            {renderTitleWord("YUG", "lp-title-first", 0)}<br />
            {renderTitleWord("NIRMAN", "lp-title-glow", 0.18)}
          </h1>
          <p className="lp-subtitle">
            See how city systems connect. Explore the signals shaping tomorrow, and test more sustainable ways forward.
          </p>
          <div className="lp-hero-actions">
            <Link to={isLoggedIn ? "/dashboard" : "/login"} className="lp-btn lp-btn-user">
              {isLoggedIn ? "Open dashboard" : "Enter the simulator"}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <a href="#platform" className="lp-hero-secondary">Explore the platform <span aria-hidden="true">↓</span></a>
          </div>
        </div>
      </section>

      <section className="lp-about-section lp-reveal" aria-labelledby="lp-about-title">
        <div className="lp-reveal-item">
          <p className="lp-section-kicker">ABOUT YUG NIRMAN</p>
          <h2 id="lp-about-title" className="lp-section-title">Understand a city as one connected system.</h2>
        </div>
        <div className="lp-about-copy lp-reveal-item">
          <p>
            YUG NIRMAN is an interactive urban-planning simulator for exploring how population, mobility, energy, water, and the environment shape city life.
          </p>
          <p>
            Explore city indicators, compare planning scenarios, and review future outlooks. Forecasts and simulated activity use illustrative sample data, not official city predictions.
          </p>
        </div>
      </section>

      <section id="activity" className="lp-stats-section lp-overview-section lp-reveal" aria-labelledby="lp-overview-title">
        <div className="lp-section-heading lp-reveal-item">
          <p className="lp-section-kicker">LIVE · THIS BROWSER</p>
          <h2 id="lp-overview-title" className="lp-section-title">Activity, right now</h2>
        </div>
        <div className="lp-stats-grid lp-overview-grid">
          {usageStats.map(({ label, value, detail, icon: Icon, color }) => (
            <article className="lp-stat-card lp-overview-card lp-reveal-item" key={label} style={{ "--accent": color }}>
              <Icon className="lp-overview-icon" size={24} aria-hidden="true" />
              <div className="lp-stat-value">
                {value}
              </div>
              <div className="lp-stat-label">{label}</div>
              <div className="lp-overview-detail">{detail}</div>
            </article>
          ))}
        </div>
        <p className="lp-data-note lp-reveal-item">
          Activity updates live in this browser. Active visits count open tabs on this device; site-wide online totals require a shared analytics service.
        </p>
      </section>

      <section id="platform" className="lp-stats-section lp-platform-section lp-reveal" aria-labelledby="lp-capabilities-title">
        <div className="lp-section-heading lp-reveal-item">
          <p className="lp-section-kicker">ONE CITY · CONNECTED SYSTEMS</p>
          <h2 id="lp-capabilities-title" className="lp-section-title">Explore the city systems</h2>
        </div>
        <div className="lp-stats-grid lp-capabilities-grid">
          {capabilities.map(({ title, description, icon: Icon, color }) => (
            <article className="lp-stat-card lp-capability-card lp-reveal-item" key={title} style={{ "--accent": color }}>
              <Icon className="lp-capability-icon" size={28} aria-hidden="true" />
              <h3 className="lp-capability-title">{title}</h3>
              <p className="lp-capability-description">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="roadmap"
        className="lp-stats-section lp-roadmap-section lp-reveal"
        aria-labelledby="lp-roadmap-title"
      >
        <div className="lp-section-heading lp-reveal-item">
          <p className="lp-section-kicker">
            <span>HOW IT WORKS</span>
          </p>

          <h2 id="lp-roadmap-title" className="lp-section-title">
            Process of <span>simulation</span>
          </h2>
        </div>

        <div className="lp-roadmap-flow lp-reveal-item">
          <div className="lp-roadmap-line" aria-hidden="true">
            <div className="lp-roadmap-line-progress" />
          </div>

          {roadmapSteps.map(({ step, title, description, icon: Icon, color }, index) => (
            <article
              key={step}
              className={`lp-roadmap-item lp-roadmap-item-${index + 1} lp-reveal-item`}
              style={{ "--accent": color }}
            >
              <div className="lp-roadmap-node">
                <div className="lp-roadmap-node-inner">
                  <span>{step}</span>
                </div>
              </div>

              <div className="lp-roadmap-card">
                <div className="lp-roadmap-card-label">STEP {step}</div>

                <div className="lp-roadmap-icon" aria-hidden="true">
                  <Icon size={21} strokeWidth={2} />
                </div>

                <h3>{title}</h3>
                <p>{description}</p>

                <div className="lp-roadmap-progress">
                  <span />
                </div>
              </div>

              {index < roadmapSteps.length - 1 && (
                <div className="lp-roadmap-arrow" aria-hidden="true">
                  <ArrowRight size={15} />
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="lp-cta-section lp-reveal" aria-labelledby="lp-cta-title">
        <div className="lp-reveal-item">
          <p className="lp-section-kicker">CONNECT WITH US</p>
          <h2 id="lp-cta-title" className="lp-section-title">
            {isLoggedIn ? "Return to your city" : "Connect with us"}
          </h2>
          <p className="lp-cta-desc">
            {isLoggedIn
              ? "Open the dashboard and continue exploring city data and planning tools."
              : "Sign in to explore city data, forecasts, and planning tools."}
          </p>
        </div>
        <div className="lp-cta-buttons lp-reveal-item">
          <Link to={isLoggedIn ? "/dashboard" : "/login"} className="lp-btn lp-btn-user">
            {isLoggedIn ? "Open dashboard" : "User login"}<ArrowRight size={18} aria-hidden="true" />
          </Link>
          {!isLoggedIn && (
            <Link to="/admin-login" className="lp-btn lp-btn-admin">
              <ShieldCheck size={18} aria-hidden="true" />Admin login
            </Link>
          )}
        </div>
      </section>

      <footer className="lp-footer lp-reveal">
        <div className="lp-reveal-item">YUG NIRMAN · City Simulator</div>
        <div className="lp-footer-sub lp-reveal-item">Explore city systems. Compare possibilities. Plan for a sustainable future.</div>
      </footer>
    </main>
  );
}