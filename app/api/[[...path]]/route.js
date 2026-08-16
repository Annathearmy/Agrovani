import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import { fetchWeather } from '@/lib/adapters/weather'
import { fetchSprayWindow, fetchHydricStress, geocodeLocation } from '@/lib/adapters/cehub'
import { computeStressDiagnostic, CROP_LIST } from '@/lib/calculations/cropRecommendation'
import { computeResidue, DISTRICT_DATA, getDistrictData } from '@/lib/calculations/residueRecommendation'

// MongoDB connection
let client
let db

async function connectToMongo() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME)
  }
  return db
}

function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

function ok(data, status = 200) {
  return handleCORS(NextResponse.json(data, { status }))
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

const SEED_FARMS = [
  { name: 'Gurpreet Singh', village: 'Patiala', district: 'Patiala', state: 'Punjab', cropType: 'Rice', areaInAcres: 6, latitude: 30.3398, longitude: 76.3869, soilPh: 6.4, nitrogenKgPerHa: 95 },
  { name: 'Harjinder Kaur', village: 'Ludhiana', district: 'Ludhiana', state: 'Punjab', cropType: 'Wheat', areaInAcres: 8, latitude: 30.901, longitude: 75.8573, soilPh: 6.8, nitrogenKgPerHa: 110 },
  { name: 'Ramesh Patel', village: 'Indore', district: 'Indore', state: 'Madhya Pradesh', cropType: 'Soybean', areaInAcres: 5, latitude: 22.7196, longitude: 75.8577, soilPh: 6.2, nitrogenKgPerHa: 80 },
  { name: 'Vijay Deshmukh', village: 'Nagpur', district: 'Nagpur', state: 'Maharashtra', cropType: 'Cotton', areaInAcres: 7, latitude: 21.1458, longitude: 79.0882, soilPh: 7.1, nitrogenKgPerHa: 105 },
  { name: 'Lakshmi Reddy', village: 'Guntur', district: 'Guntur', state: 'Andhra Pradesh', cropType: 'Rice', areaInAcres: 9, latitude: 16.3067, longitude: 80.4365, soilPh: 6.6, nitrogenKgPerHa: 120 },
]

const SEED_MACHINERY = [
  { type: 'Happy Seeder', provider: 'Patiala Agri Co-op', district: 'Patiala', pricePerAcre: 1200, available: true, lat: 30.35, lon: 76.40 },
  { type: 'Baler', provider: 'Green Fields Custom Hiring', district: 'Ludhiana', pricePerAcre: 1500, available: true, lat: 30.91, lon: 75.86 },
  { type: 'Mulcher', provider: 'Malwa Machinery Hub', district: 'Patiala', pricePerAcre: 1000, available: true, lat: 30.31, lon: 76.36 },
  { type: 'Boom Sprayer', provider: 'AgroSpray Services', district: 'Indore', pricePerAcre: 600, available: true, lat: 22.72, lon: 75.86 },
  { type: 'Happy Seeder', provider: 'Vidarbha Farm Tech', district: 'Nagpur', pricePerAcre: 1300, available: true, lat: 21.15, lon: 79.09 },
]

async function seedDb(db) {
  const farmsCol = db.collection('farms')
  const count = await farmsCol.countDocuments()
  if (count === 0) {
    const now = new Date()
    const farms = SEED_FARMS.map((f) => ({ id: uuidv4(), ...f, createdAt: now }))
    await farmsCol.insertMany(farms)
    await db.collection('machinery').insertMany(SEED_MACHINERY.map((m) => ({ id: uuidv4(), ...m })))
    const metrics = Object.entries(DISTRICT_DATA).map(([district, d]) => ({ id: uuidv4(), district, ...d }))
    await db.collection('district_metrics').insertMany(metrics)
    return { seeded: true, farms: farms.length }
  }
  return { seeded: false }
}

async function handleRoute(request, { params }) {
  const { path = [] } = await params
  const route = `/${path.join('/')}`
  const method = request.method
  const { searchParams } = new URL(request.url)

  try {
    const db = await connectToMongo()

    if ((route === '/' || route === '/root') && method === 'GET') {
      return ok({ message: 'AgroVani API', crops: CROP_LIST })
    }

    // Seed database with demo farms/machinery/metrics
    if (route === '/seed' && method === 'POST') {
      const result = await seedDb(db)
      return ok(result)
    }

    // Geocoding for onboarding (Nominatim fallback for CE Hub LocationSearch)
    if (route === '/geocode' && method === 'GET') {
      const query = searchParams.get('query') || ''
      if (!query) return ok({ results: [] })
      const results = await geocodeLocation(query)
      return ok({ results })
    }

    // Farms CRUD
    if (route === '/farms' && method === 'POST') {
      const body = await request.json()
      const farm = {
        id: uuidv4(),
        name: body.name || 'Farmer',
        village: body.village || '',
        district: body.district || 'Patiala',
        state: body.state || '',
        cropType: body.cropType || 'Rice',
        areaInAcres: Number(body.areaInAcres) || 1,
        latitude: Number(body.latitude) || 30.3398,
        longitude: Number(body.longitude) || 76.3869,
        soilPh: body.soilPh != null ? Number(body.soilPh) : null,
        nitrogenKgPerHa: body.nitrogenKgPerHa != null ? Number(body.nitrogenKgPerHa) : null,
        locale: body.locale || 'en',
        createdAt: new Date(),
      }
      await db.collection('farms').insertOne(farm)
      const { _id, ...clean } = farm
      return ok(clean)
    }

    if (route === '/farms' && method === 'GET') {
      const id = searchParams.get('id')
      if (id) {
        const farm = await db.collection('farms').findOne({ id })
        if (!farm) return ok({ error: 'Farm not found' }, 404)
        const { _id, ...clean } = farm
        return ok(clean)
      }
      const farms = await db.collection('farms').find({}).limit(100).toArray()
      return ok(farms.map(({ _id, ...r }) => r))
    }

    // Stress diagnostic (core engine) â€” Meteoblue + cardinal temps + spray window
    if (route === '/stress' && method === 'GET') {
      const farmId = searchParams.get('farmId')
      let lat, lon, crop, area, soilPh, nitrogen
      if (farmId) {
        const farm = await db.collection('farms').findOne({ id: farmId })
        if (!farm) return ok({ error: 'Farm not found' }, 404)
        lat = farm.latitude; lon = farm.longitude; crop = farm.cropType
        area = farm.areaInAcres; soilPh = farm.soilPh; nitrogen = farm.nitrogenKgPerHa
      } else {
        lat = Number(searchParams.get('lat'))
        lon = Number(searchParams.get('lon'))
        crop = searchParams.get('crop') || 'Rice'
        area = Number(searchParams.get('area')) || 5
        soilPh = searchParams.get('ph') ? Number(searchParams.get('ph')) : null
        nitrogen = searchParams.get('n') ? Number(searchParams.get('n')) : null
      }

      const weather = await fetchWeather(lat, lon)
      const diagnostic = computeStressDiagnostic({
        weather, crop, areaInAcres: area, soilPh, nitrogenKgPerHa: nitrogen,
      })
      const spray = await fetchSprayWindow(lat, lon, 'Foliar')
      const hydric = await fetchHydricStress(lat, lon, crop)

      const log = {
        id: uuidv4(),
        farmId: farmId || null,
        tmax: weather.tmax,
        tmin: weather.tmin,
        diurnalScore: diagnostic.scores.diurnal,
        nightScore: diagnostic.scores.night,
        frostScore: diagnostic.scores.frost,
        droughtIndex: diagnostic.droughtIndex?.value ?? null,
        recommendedProduct: diagnostic.product.product,
        sprayWindowStart: spray.windows?.[0]?.startTime || null,
        createdAt: new Date(),
      }
      await db.collection('stress_diagnostic_logs').insertOne(log)

      return ok({
        weather,
        diagnostic,
        sprayWindow: spray.windows,
        hydricStress: hydric.data,
        location: { latitude: lat, longitude: lon },
      })
    }

    // Residue economics (Tab 1)
    if (route === '/residue' && method === 'GET') {
      const farmId = searchParams.get('farmId')
      let area, district
      if (farmId) {
        const farm = await db.collection('farms').findOne({ id: farmId })
        if (!farm) return ok({ error: 'Farm not found' }, 404)
        area = farm.areaInAcres; district = farm.district
      } else {
        area = Number(searchParams.get('area')) || 5
        district = searchParams.get('district') || 'Patiala'
      }
      const result = computeResidue({ areaInAcres: area, district })
      return ok(result)
    }

    // Machinery listing
    if (route === '/machinery' && method === 'GET') {
      const district = searchParams.get('district')
      const type = searchParams.get('type')
      const q = {}
      if (district) q.district = district
      if (type) q.type = type
      const items = await db.collection('machinery').find(q).limit(100).toArray()
      return ok(items.map(({ _id, ...r }) => r))
    }

    // Bookings
    if (route === '/bookings' && method === 'POST') {
      const body = await request.json()
      const booking = {
        id: uuidv4(),
        farmId: body.farmId || null,
        farmerName: body.farmerName || 'Farmer',
        machineryType: body.machineryType || 'Happy Seeder',
        provider: body.provider || '',
        district: body.district || '',
        date: body.date || new Date().toISOString().slice(0, 10),
        acres: Number(body.acres) || 1,
        status: 'requested',
        createdAt: new Date(),
      }
      await db.collection('bookings').insertOne(booking)
      const { _id, ...clean } = booking
      return ok(clean)
    }

    if (route === '/bookings' && method === 'GET') {
      const farmId = searchParams.get('farmId')
      const q = farmId ? { farmId } : {}
      const items = await db.collection('bookings').find(q).sort({ createdAt: -1 }).limit(100).toArray()
      return ok(items.map(({ _id, ...r }) => r))
    }

    // District metrics
    if (route === '/district-metrics' && method === 'GET') {
      const district = searchParams.get('district')
      if (district) return ok({ district, ...getDistrictData(district) })
      return ok(Object.entries(DISTRICT_DATA).map(([d, v]) => ({ district: d, ...v })))
    }

    return ok({ error: `Route ${route} not found` }, 404)
  } catch (error) {
    console.error('API Error:', error)
    return ok({ error: 'Internal server error', detail: String(error?.message || error) }, 500)
  }
}

export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
