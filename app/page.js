'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Wind, Droplet, Leaf, ArrowRight } from 'lucide-react'
import { getDictionary, LOCALES } from '@/lib/i18n'

const impactCards = [
  { title: 'Reduce stubble burning', description: 'Protect air quality with residue alternatives and local machinery support.', icon: Wind },
  { title: 'Beat abiotic stress', description: 'Live heat, frost and drought scores drive precise biostimulant decisions.', icon: Droplet },
  { title: 'Create residue income', description: 'Find buyers and processing plants for stubble off-take and steady income.', icon: Leaf },
]

export default function App() {
  const [locale, setLocale] = useState('en')
  const [location] = useState('Punjab')
  const t = getDictionary(locale)

  return (
    <main className="relative overflow-hidden pb-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.14),_transparent_25%)] blur-3xl" />

      <header className="relative mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">🌾</span>
          AgroVani
        </div>
        <div className="flex items-center gap-1 rounded-full bg-white/70 p-1 shadow-sm backdrop-blur">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              onClick={() => setLocale(l.code)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${locale === l.code ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </header>

      <section className="relative mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.25fr_0.95fr] lg:items-center lg:px-8">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-3 rounded-full bg-slate-900/10 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm backdrop-blur-xl">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            {t.heroBadge}
          </div>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-6xl">
            {t.heroTitle(location)}
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-700">{t.heroSubtitle}</p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link href="/farmer/onboarding" className="pill-dark">
              {t.getStarted} <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link href="/farmer/dashboard" className="pill-outline">Explore the demo dashboard</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {impactCards.map((card) => {
              const Icon = card.icon
              return (
                <div key={card.title} className="glass-card card-3d">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900/5 text-emerald-500">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h2 className="mt-4 text-base font-semibold text-slate-950">{card.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="glass-panel relative overflow-hidden rounded-[2rem] p-4 card-3d">
            <img
              src="https://images.unsplash.com/photo-1602989106211-81de671c23a9?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"
              alt="Lush green paddy field"
              className="h-48 w-full rounded-2xl object-cover"
            />
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-900/5 p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">AgroVani</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">Live field insights</p>
              </div>
              <span className="badge-green">{t.farms}</span>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{t.residueForecast}</p>
                <p className="mt-3 text-3xl font-semibold text-slate-950">3.4 t/acre</p>
              </div>
              <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Night heat stress</p>
                <p className="mt-3 text-3xl font-semibold text-emerald-600">7.1 / 9</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
