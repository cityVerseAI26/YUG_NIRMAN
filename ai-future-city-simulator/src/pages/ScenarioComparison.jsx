import React, { useMemo, useState } from "react";
import { CheckCircle2, GitCompare, Sliders } from "lucide-react";
import { useCity } from "../context/CityContext";
import PageHeader from "../components/common/PageHeader";
import CityTransformation from "../components/common/CityTransformation";
import { buildScenarioTransformation } from "../utils/cityTransformation";

const formatCapex = (value) => `₹${value.toLocaleString("en-IN")} Cr`;

export const ScenarioComparison = () => {
  const { city } = useCity();
  const [selectedScenarioId, setSelectedScenarioId] = useState("green");
  const [investmentScale, setInvestmentScale] = useState(100);

  const scenarios = useMemo(() => {
    const scale = investmentScale / 100;
    const baseTraffic = city?.metrics?.traffic?.value || 72;
    const baseAqi = city?.metrics?.aqi?.value || 156;
    const baseWater = city?.metrics?.waterDemand?.value || 78;
    const baseHealth = city?.healthScore?.overall || 64;

    return [
      {
        id: "baseline",
        name: "Status Quo",
        subtitle: "Baseline (Current City Condition)",
        tagline: "Continued growth with minimal policy intervention based on actual city profile.",
        accent: "slate",
        metrics: {
          population: city?.metrics?.population?.display || "12.5M",
          traffic: `${baseTraffic}%`,
          aqi: `${baseAqi}`,
          water: `${baseWater}%`,
          capex: formatCapex(0),
          health: `${baseHealth} / 100`,
        },
        advantages: ["No added municipal capital outlay", "Zero construction transit disruptions"],
        tradeoffs: ["Mounting arterial congestion", "Water stress & particulate pollution risk"],
      },
      {
        id: "green",
        name: "Aggressive Green Transition",
        subtitle: "Eco-Mobility & Clean Grid",
        tagline: "Electrified mass mobility, urban bioswales, and distributed solar mandates.",
        accent: "emerald",
        metrics: {
          population: city?.metrics?.population?.display || "12.5M",
          traffic: `${Math.max(15, Math.round(baseTraffic - 28 * scale))}%`,
          aqi: `${Math.max(25, Math.round(baseAqi - 42 * scale))}`,
          water: `${Math.max(30, Math.round(baseWater - 18 * scale))}%`,
          capex: formatCapex(Math.round(18500 * scale)),
          health: `${Math.min(96, Math.round(baseHealth + 22 * scale))} / 100`,
        },
        advantages: ["Substantial congestion & AQI drop", "Elevated livability & health rating"],
        tradeoffs: ["High initial municipal CapEx", "Long corridor delivery timelines"],
      },
      {
        id: "hyperdense",
        name: "Hyper-Dense Urbanization",
        subtitle: "High Density & Transit Mesh",
        tagline: "Vertical clusters with high-capacity transit corridors and congestion pricing.",
        accent: "cyan",
        metrics: {
          population: city?.metrics?.population?.display || "12.5M",
          traffic: `${Math.max(20, Math.round(baseTraffic - 14 * scale))}%`,
          aqi: `${Math.max(30, Math.round(baseAqi - 18 * scale))}`,
          water: `${Math.max(40, Math.round(baseWater - 8 * scale))}%`,
          capex: formatCapex(Math.round(34000 * scale)),
          health: `${Math.min(92, Math.round(baseHealth + 14 * scale))} / 100`,
        },
        advantages: ["High mass-transit capacity", "Maximized agglomeration economic yield"],
        tradeoffs: ["Elevated peak water & power load", "Lower open green space per resident"],
      },
    ];
  }, [city, investmentScale]);

  const selectedScenario = scenarios.find(({ id }) => id === selectedScenarioId) || scenarios[1];

  const transformation = useMemo(() => {
    return buildScenarioTransformation({
      city,
      scenarioId: selectedScenarioId,
      investmentScale,
    });
  }, [city, selectedScenarioId, investmentScale]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compare Scenarios"
        subtitle="Compare example policy results. All results are simulated."
        icon={GitCompare}
        badge="Sample"
        whyFeatureIds="scenario-comparison"
      />

      {/* Investment scale controller */}
      <section className="flex flex-col gap-4 rounded-2xl border border-cyan-500/20 bg-slate-900/80 p-4 sm:flex-row sm:items-center sm:justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <Sliders className="h-5 w-5 shrink-0 text-cyan-300" />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-white">Investment scaling & policy intensity</h2>
            <p className="text-xs text-slate-400">
              Modulates capital expenditure, transit corridor length, and green infrastructure deployment intensity.
            </p>
          </div>
        </div>
        <label className="flex items-center gap-3">
          <span className="sr-only">Investment scaling multiplier</span>
          <input
            type="range"
            min="50"
            max="150"
            step="5"
            value={investmentScale}
            onChange={(event) => setInvestmentScale(Number(event.target.value))}
            className="w-40 cursor-pointer accent-cyan-400 sm:w-56"
          />
          <span className="min-w-20 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1.5 text-center font-mono text-xs font-bold text-cyan-200">
            {investmentScale}% Scale
          </span>
        </label>
      </section>

      {/* Scenario cards chooser */}
      <section aria-labelledby="scenario-cards-title">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">Target Horizon: 2035</p>
            <h2 id="scenario-cards-title" className="mt-1 text-lg font-black text-white">Choose a planning scenario</h2>
          </div>
          <p className="text-[11px] text-slate-400">Select a scenario to evaluate its comprehensive Before vs After transformation.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {scenarios.map((scenario) => {
            const isSelected = selectedScenarioId === scenario.id;
            const borderColor = scenario.accent === "emerald"
              ? "border-emerald-400/30"
              : scenario.accent === "cyan"
                ? "border-cyan-400/30"
                : "border-slate-700";
            return (
              <article
                key={scenario.id}
                className={`flex flex-col justify-between rounded-2xl border bg-slate-950/75 p-4 transition ${borderColor} ${
                  isSelected ? "ring-2 ring-cyan-400/70 shadow-lg shadow-cyan-950/40" : "hover:border-slate-500"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">{scenario.subtitle}</p>
                      <h3 className="mt-1 text-base font-black text-white">{scenario.name}</h3>
                    </div>
                    {isSelected && (
                      <span className="rounded-full bg-cyan-400/15 border border-cyan-400/30 px-2 py-0.5 text-[9px] font-bold uppercase text-cyan-200">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{scenario.tagline}</p>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {[
                      ["Population baseline", scenario.metrics.population],
                      ["Traffic load", scenario.metrics.traffic],
                      ["AQI level", scenario.metrics.aqi],
                      ["Water load", scenario.metrics.water],
                      ["CapEx outlay", scenario.metrics.capex],
                      ["Health score", scenario.metrics.health],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg border border-slate-800 bg-slate-900/70 p-2">
                        <p className="text-[9px] uppercase tracking-wide text-slate-500">{label}</p>
                        <p className="mt-0.5 text-xs font-bold text-slate-100 font-mono">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 grid gap-2 border-t border-slate-800 pt-3 text-[10px]">
                    <div>
                      <p className="font-bold uppercase tracking-wide text-emerald-300">Advantages</p>
                      <ul className="mt-1 space-y-0.5 text-slate-300">
                        {scenario.advantages.map((item) => <li key={item}>✓ {item}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="font-bold uppercase tracking-wide text-rose-300">Trade-offs</p>
                      <ul className="mt-1 space-y-0.5 text-slate-400">
                        {scenario.tradeoffs.map((item) => <li key={item}>⚠ {item}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedScenarioId(scenario.id)}
                  className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition cursor-pointer ${
                    isSelected
                      ? "bg-cyan-400 text-slate-950 font-black shadow-md shadow-cyan-400/25"
                      : "border border-slate-700 bg-slate-900 text-slate-200 hover:border-cyan-400/50"
                  }`}
                >
                  {isSelected && <CheckCircle2 className="h-4 w-4" />}
                  {isSelected ? "Comparing this scenario" : "Select & compare scenario"}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      {/* ── Comprehensive Before vs After Urban Transformation Section ── */}
      <CityTransformation
        transformation={transformation}
        title={`BEFORE vs AFTER · ${selectedScenario.name.toUpperCase()} EVALUATION`}
      />
    </div>
  );
};

export default ScenarioComparison;
