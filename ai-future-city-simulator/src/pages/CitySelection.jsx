import React, { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Building2, ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import BrandMark from "../components/common/BrandMark";
import { CITIES } from "../data/cityData";
import { useCity } from "../context/CityContext";
import { useAuth } from "../context/AuthContext";

const CITY_OPTIONS = Object.values(CITIES);

export default function CitySelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSelectedCity } = useCity();
  const { currentUser, logout } = useAuth();
  const [cityImages, setCityImages] = useState({});
  const [searchText, setSearchText] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [fanStartIndex, setFanStartIndex] = useState(0);
  const [fanExpanded, setFanExpanded] = useState(false);
  const countries = [...new Set(CITY_OPTIONS.map((city) => city.country))].sort();
  const filteredCities = CITY_OPTIONS.filter((city) => {
    const matchesSearch = `${city.name} ${city.country} ${city.state}`
      .toLowerCase()
      .includes(searchText.trim().toLowerCase());
    return matchesSearch && (selectedCountry === "all" || city.country === selectedCountry);
  });
  const fanCities = Array.from(
    { length: Math.min(6, filteredCities.length) },
    (_, slot) => filteredCities[(fanStartIndex + slot) % filteredCities.length]
  );

  useEffect(() => {
    const controller = new AbortController();
    const chunks = [];
    for (let index = 0; index < CITY_OPTIONS.length; index += 40) {
      chunks.push(CITY_OPTIONS.slice(index, index + 40));
    }

    Promise.all(chunks.map(async (cities) => {
      const titles = cities
        .map((city) => city.id === "bangalore" ? "Bengaluru" : city.name)
        .join("|");
      const params = new URLSearchParams({
        action: "query",
        format: "json",
        prop: "pageimages",
        piprop: "thumbnail",
        pithumbsize: "800",
        redirects: "1",
        origin: "*",
        titles,
      });
      const response = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, { signal: controller.signal });
      if (!response.ok) throw new Error("City image request failed");
      return { cities, data: await response.json() };
    }))
      .then((results) => {
        const images = {};
        results.forEach(({ cities, data }) => {
          Object.values(data.query?.pages || {}).forEach((page) => {
            const title = page.title?.toLowerCase();
            const city = cities.find((item) => {
              const searchableTitle = item.id === "bangalore" ? "bengaluru" : item.name.toLowerCase();
              return searchableTitle === title;
            });
            if (city && page.thumbnail?.source) images[city.id] = page.thumbnail.source;
          });
        });
        setCityImages(images);
      })
      .catch((error) => {
        if (error.name !== "AbortError") console.warn("Could not load city images:", error);
      });

    return () => controller.abort();
  }, []);

  const handleChooseCity = (cityId) => {
    setSelectedCity(cityId);
    const requestedPath = location.state?.from?.pathname;
    const returnPath = typeof requestedPath === "string" && requestedPath.startsWith("/") && !requestedPath.startsWith("//")
      ? requestedPath
      : "/dashboard";
    navigate(returnPath, { replace: true });
  };

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <main className="min-h-screen bg-[#030d1a] text-slate-100 px-4 py-3 sm:px-8 sm:py-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-cyber opacity-60 pointer-events-none" aria-hidden="true" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[42rem] h-[28rem] rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" aria-hidden="true" />

      <div className="max-w-6xl mx-auto relative z-10">
        <header className="flex items-center justify-between gap-4 mb-4">
          <Link to="/" className="inline-flex items-center gap-3 text-white no-underline">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#70e2d0] border border-[#70e2d0]/30 shadow-lg shadow-cyan-500/10">
              <BrandMark className="h-7 w-7" />
            </span>
            <span className="flex flex-col">
              <strong className="font-extrabold tracking-wide">City Simulator</strong>
              <small className="text-[10px] text-slate-500 tracking-[0.16em]">YUG NIRMAN</small>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {currentUser && (
              <span className="hidden sm:inline-flex items-center gap-2 text-xs text-slate-300">
                <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center justify-center font-bold text-[11px]">
                  {currentUser.avatar || "US"}
                </span>
                <span className="font-medium">{currentUser.name || currentUser.email}</span>
              </span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/70 text-slate-300 hover:text-white hover:border-cyan-500/50 transition-colors text-sm cursor-pointer"
            >
              <LogOut size={16} />
              Log out
            </button>
          </div>
        </header>

        <section className="text-center mb-4">
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">Choose a city</h1>
          <p className="mt-1 text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
            {currentUser?.name ? `Welcome, ${currentUser.name}. ` : ""}Choose from {CITY_OPTIONS.length} cities in India and around the world.
          </p>
        </section>

        <div className="max-w-3xl mx-auto mb-4 grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-2">
          <input
            type="search"
            value={searchText}
            onChange={(event) => { setSearchText(event.target.value); setFanStartIndex(0); }}
            placeholder="Search city or country…"
            aria-label="Search cities and countries"
            className="w-full rounded-xl border border-cyan-500/25 bg-slate-950/80 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
          />
          <select
            value={selectedCountry}
            onChange={(event) => { setSelectedCountry(event.target.value); setFanStartIndex(0); }}
            aria-label="Filter cities by country"
            className="rounded-xl border border-cyan-500/25 bg-slate-950/80 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
          >
            <option value="all">All countries ({countries.length})</option>
            {countries.map((country) => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
        </div>

        {fanCities.length > 0 && (
          <section className="city-orbit-section" aria-label="Featured cities">
            <div
              className={`city-orbit-stage${fanExpanded ? " is-expanded" : ""}`}
              onPointerEnter={() => setFanExpanded(true)}
              onPointerLeave={() => setFanExpanded(false)}
              onFocusCapture={() => setFanExpanded(true)}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setFanExpanded(false);
              }}
            >
              <div className="city-fan-count" aria-live="polite">
                <strong>{filteredCities.length}</strong>
                <span>{filteredCities.length === 1 ? "CITY" : "CITIES"}</span>
              </div>
              <div className="city-card-fan">
                {fanCities.map((city, index) => {
                  const offset = index - (fanCities.length - 1) / 2;
                  return (
                    <div
                      key={city.id}
                      className="city-orbit-position"
                      style={{
                        "--fan-index": index + 1,
                        "--fan-angle": `${offset * 5}deg`,
                        "--fan-x": `${offset * 30}px`,
                        "--fan-x-open": `${offset * 65}px`,
                        "--fan-x-mobile": `${offset * 4}%`,
                        "--fan-x-open-mobile": `${offset * 8}%`,
                        "--fan-delay": `${index * 75}ms`,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleChooseCity(city.id)}
                        aria-label={`Choose ${city.name}, ${city.country}`}
                        className="city-orbit-card"
                      >
                        {cityImages[city.id] && <img src={cityImages[city.id]} alt="" loading="lazy" />}
                        <span className="city-orbit-card-shade" aria-hidden="true" />
                        <span className="city-orbit-card-copy">
                          <strong>{city.name}</strong>
                          <small>{city.country}</small>
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="city-orbit-controls">
              <button
                type="button"
                onClick={() => setFanStartIndex((current) => (current - 1 + filteredCities.length) % filteredCities.length)}
                aria-label="Previous featured cities"
                title="Previous cities"
                disabled={filteredCities.length < 2}
              >
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <span className="city-orbit-count" aria-live="polite">
                {fanCities.length} featured · {filteredCities.length} total
              </span>
              <button
                type="button"
                onClick={() => setFanStartIndex((current) => (current + 1) % filteredCities.length)}
                aria-label="Next featured cities"
                title="Next cities"
                disabled={filteredCities.length < 2}
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          </section>
        )}

        <section aria-label="Available cities" className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filteredCities.map((city) => (
              <button
                key={city.id}
                type="button"
                onClick={() => handleChooseCity(city.id)}
                aria-label={`${city.name}, ${city.country}`}
                className="relative overflow-hidden text-left rounded-xl border border-slate-700/80 transition-all duration-200 hover:border-cyan-400/70 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <div className="relative aspect-[4/3] bg-gradient-to-br from-sky-950 via-slate-900 to-indigo-950">
                  <div className="absolute inset-0 flex items-center justify-center text-cyan-300/50" aria-hidden="true">
                    <Building2 size={42} strokeWidth={1.2} />
                  </div>
                  {cityImages[city.id] && (
                    <img
                      src={cityImages[city.id]}
                      alt={`${city.name}, ${city.country}`}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(event) => { event.currentTarget.style.display = "none"; }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/15 to-transparent" />
                  <div className="absolute left-3 right-3 bottom-3 flex items-end justify-between gap-2">
                    <div>
                      <h2 className="text-base sm:text-lg font-extrabold text-white drop-shadow">{city.name}</h2>
                      <span className="text-xs font-medium text-slate-200">{city.country}</span>
                    </div>
                  </div>
                </div>
              </button>
          ))}
        </section>
        {filteredCities.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-400">No cities match your search.</p>
        )}
      </div>
    </main>
  );
}
