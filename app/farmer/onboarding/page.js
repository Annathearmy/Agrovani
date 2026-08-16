'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Search, Save, ArrowLeft, ArrowRight, CheckCircle2, MapPin, Sprout } from 'lucide-react'

const CROPS = ['Rice', 'Wheat', 'Corn', 'Cotton', 'Soybean']
const DISTRICTS = ['Patiala', 'Ludhiana', 'Indore', 'Nagpur', 'Guntur']

const EMPTY = {
  name: '', village: '', district: 'Patiala', state: 'Punjab',
  cropType: 'Rice', areaInAcres: 5, soilPh: 6.5, nitrogenKgPerHa: 100,
  latitude: 30.3398, longitude: 76.3869, locale: 'en',
}

export default function App() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(EMPTY)
  const [geoResults, setGeoResults] = useState([])
  const [geoLoading, setGeoLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    try {
      const cached = localStorage.getItem('fv_onboarding')
      if (cached) setForm({ ...EMPTY, ...JSON.parse(cached) })
    } catch (e) {}
  }, [])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function geocode() {
    if (!form.village) return
    setGeoLoading(true)
    try {
      const res = await fetch(`/api/geocode?query=${encodeURIComponent(form.village)}`)
      const data = await res.json()
      setGeoResults(data.results || [])
    } finally {
      setGeoLoading(false)
    }
  }

  function pickGeo(r) {
    set('latitude', r.latitude)
    set('longitude', r.longitude)
    setGeoResults([])
  }

  function saveOffline() {
    localStorage.setItem('fv_onboarding', JSON.stringify(form))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function finish() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/farms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      localStorage.setItem('fv_farmId', data.id)
      localStorage.setItem('fv_onboarding', JSON.stringify(form))
      router.push('/farmer/dashboard')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> AgroVani
        </Link>
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-2 w-10 rounded-full ${step >= s ? 'bg-slate-900' : 'bg-slate-200'}`} />
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="glass-card">
          <h1 className="text-2xl font-bold text-slate-900">Set up your farm</h1>
          <p className="mt-1 text-sm text-slate-500">Step {step} of 3</p>

          {step === 1 && (
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Gurpreet Singh" />
              </div>
              <div className="space-y-2">
                <Label>Village / Town</Label>
                <div className="flex gap-2">
                  <Input value={form.village} onChange={(e) => set('village', e.target.value)} placeholder="e.g. Patiala" />
                  <Button type="button" onClick={geocode} variant="outline" className="shrink-0">
                    <Search className="mr-1 h-4 w-4" /> {geoLoading ? '...' : 'Locate'}
                  </Button>
                </div>
                {geoResults.length > 0 && (
                  <div className="mt-1 rounded-lg border border-slate-200 bg-white shadow-sm">
                    {geoResults.map((r, i) => (
                      <button key={i} onClick={() => pickGeo(r)} className="flex w-full items-start gap-2 border-b border-slate-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-slate-50">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span className="text-slate-700">{r.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-400">Located at {Number(form.latitude).toFixed(3)}, {Number(form.longitude).toFixed(3)}</p>
              </div>
              <div className="space-y-2">
                <Label>District</Label>
                <div className="flex flex-wrap gap-2">
                  {DISTRICTS.map((d) => (
                    <button key={d} onClick={() => set('district', d)} className={`rounded-full border px-4 py-1.5 text-sm font-medium ${form.district === d ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-700'}`}>{d}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label>Primary crop</Label>
                <div className="flex flex-wrap gap-2">
                  {CROPS.map((c) => (
                    <button key={c} onClick={() => set('cropType', c)} className={`rounded-full border px-4 py-1.5 text-sm font-medium ${form.cropType === c ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 text-slate-700'}`}>{c}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Area (acres)</Label>
                  <Input type="number" value={form.areaInAcres} onChange={(e) => set('areaInAcres', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Soil pH</Label>
                  <Input type="number" step="0.1" value={form.soilPh} onChange={(e) => set('soilPh', e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nitrogen (kg/ha)</Label>
                <Input type="number" value={form.nitrogenKgPerHa} onChange={(e) => set('nitrogenKgPerHa', e.target.value)} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-slate-600">Review your details and finish. Your data is cached on this device for offline use.</p>
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
                <div><span className="text-slate-400">Name</span><p className="font-medium text-slate-900">{form.name || '\u2014'}</p></div>
                <div><span className="text-slate-400">Village</span><p className="font-medium text-slate-900">{form.village || '\u2014'}</p></div>
                <div><span className="text-slate-400">District</span><p className="font-medium text-slate-900">{form.district}</p></div>
                <div><span className="text-slate-400">Crop</span><p className="font-medium text-slate-900">{form.cropType}</p></div>
                <div><span className="text-slate-400">Area</span><p className="font-medium text-slate-900">{form.areaInAcres} acres</p></div>
                <div><span className="text-slate-400">Soil pH / N</span><p className="font-medium text-slate-900">{form.soilPh} / {form.nitrogenKgPerHa}</p></div>
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <Button variant="ghost" disabled={step === 1} onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            {step < 3 ? (
              <button className="pill-dark" onClick={() => setStep((s) => s + 1)}>Next <ArrowRight className="ml-2 h-4 w-4" /></button>
            ) : (
              <button className="pill-dark" onClick={finish} disabled={submitting}>{submitting ? 'Saving\u2026' : 'Finish & view dashboard'}</button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-card card-3d">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Live preview</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600"><Sprout className="h-6 w-6" /></div>
              <div>
                <p className="text-lg font-semibold text-slate-900">{form.name || 'Your name'}</p>
                <p className="text-sm text-slate-500">{form.village || 'Village'}, {form.district}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-400">Crop</p>
                <p className="font-semibold text-slate-900">{form.cropType}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-400">Area</p>
                <p className="font-semibold text-slate-900">{form.areaInAcres} acres</p>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <p className="text-sm font-semibold text-slate-900">Save offline</p>
            <p className="mt-1 text-xs text-slate-500">Works without internet. We'll sync when you're back online.</p>
            <Button onClick={saveOffline} variant="outline" className="mt-3 w-full rounded-full">
              {saved ? <><CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" /> Saved</> : <><Save className="mr-2 h-4 w-4" /> Save offline</>}
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}
