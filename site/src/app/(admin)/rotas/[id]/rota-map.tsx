'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

const RouteMap = dynamic(() => import('@/components/map/RouteMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
    </div>
  ),
})

interface MapPoint {
  lat: number
  lng: number
  label: string
}

export default function RotaDetailMap({
  points,
  polyline,
}: {
  points: MapPoint[]
  polyline: string | null
}) {
  return <RouteMap points={points} polyline={polyline} />
}
