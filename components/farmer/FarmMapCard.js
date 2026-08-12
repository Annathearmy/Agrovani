'use client'

import dynamic from 'next/dynamic'
import { MapPin } from 'lucide-react'

const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[360px] w-full items-center justify-center rounded-xl bg-slate-100 text-slate-400">
      Loading map…
    </div>
  ),
})

export default function FarmMapCard({ lat, lon, mode = 'residue', stressScore = 0, title }) {
  return (
    <div className="glass-card card-3d">
      <div className="mb-4 flex items-center gap-2">
        <MapPin className="h-5 w-5 text-emerald-500" />
        <h3 className="text-lg font-semibold text-slate-900">{title || 'Farm Map'}</h3>
        <span className="ml-auto rounded-full bg-slate-900/5 px-3 py-1 text-xs font-medium text-slate-500">
          {mode === 'crop' ? 'Crop Health View' : 'Residue & Stubble View'}
        </span>
      </div>
      <div className="overflow-hidden rounded-xl">
        {lat && lon ? (
          <LeafletMap lat={lat} lon={lon} mode={mode} stressScore={stressScore} />
        ) : (
          <div className="flex h-[360px] items-center justify-center bg-slate-100 text-slate-400">No location set</div>
        )}
      </div>
    </div>
  )
}
