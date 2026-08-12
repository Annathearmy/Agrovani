'use client'

import { useState, useEffect, useCallback } from 'react'
import React from 'react'
import Link from 'next/link'
import FarmMapCard from '@/components/farmer/FarmMapCard'
import BookMachineryCard from '@/components/farmer/BookMachineryCard'
import {
  Wheat, FlaskConical, ArrowLeft, TrendingUp, Sun, Moon, Snowflake,
  Droplets, Sparkles, Clock, Mic, Camera, IndianRupee, AlertTriangle, Loader2,
} from 'lucide-react'

class DebugBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null } }
  static getDerivedStateFromError(err) { return { err } }
  componentDidCatch(err) { console.error('Dashboard render error:', err) }
  render() {
    if (this.state.err) {
      return (
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <p className="text-lg font-semibold text-slate-900">Something went wrong loading this view.</p>
          <button onClick={() => this.setState({ err: null })} className="pill-dark mt-4">Retry</button>
        </div>
      )
    }
    return this.props.children
  }
}

function StressGauge({ label, value, icon: Icon, unit = '/9' }) {
  const v = Number(value) || 0
  const pct = Math.min(100, (v / 9) * 100)
  const color = v > 6 ? '#ef4444' : v > 4 ? '#f59e0b' : v > 2 ? '#eab308' : '#10b981'
  return (
    <div className="rounded-xl bg-white/90 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-3xl font-bold" style={{ color }}>{v.toFixed(1)}<span className="text-base font-medium text-slate-400">{unit}</span></p>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export default function App() {
  const [farms, setFarms] = useState([])
  const [farm, setFarm] = useState(null)
  const [tab, setTab] = useState('residue')
  const [stress, setStress] = useState(null)
  const [residue, setResidue] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const p = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tab') : null
    if (p === 'crop') setTab('crop')
    fetch('/api/farms')
      .then((r) => r.json())
      .then((list) => {
        setFarms(list)
        const savedId = typeof window !== 'undefined' ? localStorage.getItem('fv_farmId') : null
        const initial = list.find((f) => f.id === savedId) || list[0]
        setFarm(initial)
      })
      .catch(() => {})
  }, [])

  const loadData = useCallback((f) => {
    if (!f) return
    setLoading(true)
    setStress(null)
    setResidue(null)
    // Residue is fast (local calc) - resolve it immediately.
    fetch(`/api/residue?farmId=${f.id}`).then((r) => r.json()).then(setResidue).catch(() => {})
    // Stress depends on live Meteoblue data and can take a few seconds.
    fetch(`/api/stress?farmId=${f.id}`)
      .then((r) => r.json())
      .then(setStress)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { if (farm) loadData(farm) }, [farm, loadData])

  const diag = stress?.diagnostic
  const sprayWindows = stress?.sprayWindow || []

  return (
    <DebugBoundary>
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> FarmVista
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">Farm:</span>
          <select
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm"
            value={farm?.id || ''}
            onChange={(e) => setFarm(farms.find((f) => f.id === e.target.value))}
          >
            {farms.map((f) => (
              <option key={f.id} value={f.id}>{f.name} • {f.village} ({f.cropType})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Segmented Tab Toggle */}
      <div className="mb-8 inline-flex rounded-full bg-white/80 p-1 shadow-sm backdrop-blur">
        <button onClick={() => setTab('residue')} className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${tab === 'residue' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}>
          <Wheat className="h-4 w-4" /> Residue & Stubble Management
        </button>
        <button onClick={() => setTab('crop')} className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${tab === 'crop' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}>
          <FlaskConical className="h-4 w-4" /> Biostimulant & Crop Health
        </button>
      </div>

      {loading && (
        <div className="mb-6 flex items-center gap-2 rounded-xl bg-white/80 px-4 py-3 text-sm text-slate-500 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Fetching live weather & agronomic data…
        </div>
      )}

      {/* TAB 1: RESIDUE */}
      {tab === 'residue' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="glass-card card-3d">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Residue forecast</p>
            <p className="mt-3 text-4xl font-bold text-slate-900">{residue ? (residue.residueTons / (farm?.areaInAcres || 1)).toFixed(1) : '\u2014'} <span className="text-lg text-slate-400">t/acre</span></p>
            <p className="mt-2 text-sm text-slate-500">{residue?.residueTons ?? '\u2014'} tons total across {farm?.areaInAcres} acres</p>
          </div>
          <div className="glass-card card-3d">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Buyer demand</p>
            <p className="mt-3 text-4xl font-bold text-emerald-600">{residue?.buyerDemand || '\u2014'}</p>
            <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><IndianRupee className="h-4 w-4" /> {residue?.totalValueINR?.toLocaleString('en-IN') ?? '\u2014'} potential value</p>
            <BookMachineryCard farm={farm} defaultType="Baler" triggerLabel="Sell Stubble" triggerClass="pill-dark mt-4 w-full" />
          </div>
          <div className="glass-card card-3d">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Machinery readiness</p>
            <p className="mt-3 text-4xl font-bold text-slate-900">{residue?.machineryReadiness ?? '\u2014'}%</p>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <AlertTriangle className={`h-4 w-4 ${residue?.riskLevel === 'High' ? 'text-red-500' : 'text-amber-500'}`} />
              <span className="text-slate-600">Stubble risk: <b>{residue?.riskLevel || '\u2014'}</b> • {residue?.hotspots ?? 0} hotspots</span>
            </div>
          </div>

          <div className="lg:col-span-2">
            <FarmMapCard lat={farm?.latitude} lon={farm?.longitude} mode="residue" title="Residue & Machinery Map" />
          </div>

          <div className="glass-card card-3d flex flex-col">
            <h3 className="text-lg font-semibold text-slate-900">Machinery booking</h3>
            <p className="mt-1 text-sm text-slate-500">Reserve Happy Seeders, Balers & Mulchers from nearby custom hiring centers.</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">Happy Seeder <span className="text-emerald-600">Available</span></li>
              <li className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">Baler <span className="text-emerald-600">Available</span></li>
              <li className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">Mulcher <span className="text-emerald-600">Available</span></li>
            </ul>
            <div className="mt-auto pt-4">
              <BookMachineryCard farm={farm} defaultType="Happy Seeder" triggerLabel="Book Machinery" triggerClass="pill-dark w-full" />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CROP HEALTH */}
      {tab === 'crop' && (
        <div className="space-y-6">
          {/* ROI banner */}
          <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-4 text-white shadow-sm">
            <TrendingUp className="h-6 w-6" />
            <p className="text-lg font-semibold">+12% Verified Yield Gain</p>
            <span className="hidden h-6 w-px bg-white/40 sm:block" />
            <p className="text-lg font-semibold">+₹4,200 Profit / Acre</p>
            <span className="ml-auto rounded-full bg-white/20 px-3 py-1 text-xs font-medium">Causal ROI attribution</span>
          </div>

          {/* Stress gauges */}
          <div className="glass-card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Live abiotic stress — {farm?.cropType}</h3>
              {diag && <span className="text-sm text-slate-500">TMAX {diag.tmax?.toFixed(1)}°C • TMIN {diag.tmin?.toFixed(1)}°C</span>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StressGauge label="Diurnal Heat" value={diag?.scores?.diurnal} icon={Sun} />
              <StressGauge label="Night Heat" value={diag?.scores?.night} icon={Moon} />
              <StressGauge label="Frost" value={diag?.scores?.frost} icon={Snowflake} />
              <div className="rounded-xl bg-white/90 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500"><Droplets className="h-4 w-4" /><span className="text-xs font-medium uppercase tracking-wide">Drought Index</span></div>
                <p className="mt-2 text-3xl font-bold text-slate-900">{diag?.droughtIndex?.value?.toFixed(2) ?? '\u2014'}</p>
                <p className="mt-2 text-sm font-medium" style={{ color: diag?.droughtIndex?.risk === 'High Risk' ? '#ef4444' : diag?.droughtIndex?.risk === 'Medium Risk' ? '#f59e0b' : '#10b981' }}>{diag?.droughtIndex?.risk || '\u2014'}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Product recommendation */}
            <div className="glass-card card-3d lg:col-span-2">
              <div className="flex items-center gap-2 text-emerald-600"><Sparkles className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-widest">Recommendation</span></div>
              {diag ? (
                <>
                  <h3 className="mt-3 text-2xl font-bold text-slate-900">{diag.product.product}</h3>
                  <p className="text-sm font-medium text-emerald-600">{diag.product.brand}</p>
                  <p className="mt-2 text-sm text-slate-600">{diag.product.rationale}</p>
                  <div className="mt-4 rounded-xl bg-slate-900 p-4 text-white">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-300"><FlaskConical className="h-4 w-4" /> Smart pump-count dosing</div>
                    <p className="mt-2 text-sm">{diag.dosing.message}</p>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-300">
                      <span>{diag.dosing.totalPumps} pumps</span>
                      <span>{diag.dosing.totalCaps} caps</span>
                      <span>{diag.dosing.totalLitres} L product</span>
                    </div>
                  </div>
                </>
              ) : <p className="mt-4 text-sm text-slate-400">Computing recommendation…</p>}
            </div>

            {/* Spray window */}
            <div className="glass-card card-3d">
              <div className="flex items-center gap-2 text-slate-500"><Clock className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-widest">Optimal Spray Window</span></div>
              <p className="mt-1 text-xs text-slate-400">Syngenta CE Hub</p>
              {sprayWindows.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {sprayWindows.slice(0, 4).map((w, i) => (
                    <li key={i} className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{w.startTime || w.date || 'Window'} {w.endTime ? `\u2192 ${w.endTime}` : ''}</li>
                  ))}
                </ul>
              ) : (
                <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  No high-confidence window flagged right now. Best practice: spray in the <b>early morning (6–9 AM)</b> or late evening with low wind.
                </div>
              )}
              <BookMachineryCard farm={farm} defaultType="Boom Sprayer" triggerLabel="Book Sprayer Machine" triggerClass="pill-dark mt-4 w-full" />
            </div>
          </div>

          {/* AI widgets (voice + crop cam) */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="glass-card">
              <div className="flex items-center gap-2 text-slate-900"><Mic className="h-5 w-5 text-emerald-500" /><h3 className="text-lg font-semibold">Voice Advisory</h3></div>
              <p className="mt-1 text-sm text-slate-500">Ask in Punjabi, Hindi, Marathi, Tamil or Telugu. Speech-to-Text advisory.</p>
              <button className="mt-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600"><Mic className="h-6 w-6" /></button>
              <p className="mt-3 text-xs text-slate-400">AI voice model connects on enablement.</p>
            </div>
            <div className="glass-card">
              <div className="flex items-center gap-2 text-slate-900"><Camera className="h-5 w-5 text-emerald-500" /><h3 className="text-lg font-semibold">Crop Cam Diagnostic</h3></div>
              <p className="mt-1 text-sm text-slate-500">Snap a leaf to detect chlorosis, heat wilting & fungal lesions with Gemini Vision.</p>
              <div className="mt-4 flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-400">Upload leaf image</div>
              <p className="mt-3 text-xs text-slate-400">AI vision model connects on enablement.</p>
            </div>
          </div>

          {/* Map */}
          <FarmMapCard lat={farm?.latitude} lon={farm?.longitude} mode="crop" stressScore={Math.max(diag?.scores?.diurnal || 0, diag?.scores?.night || 0)} title="Crop Health & Stress Map" />
        </div>
      )}
    </main>
    </DebugBoundary>
  )
}
