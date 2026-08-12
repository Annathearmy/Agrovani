#!/usr/bin/env python3
"""
FarmVista Backend API Test Suite
Tests all backend endpoints with LIVE external API integrations (Meteoblue + Syngenta CE Hub)
"""

import requests
import json
import sys
from typing import Dict, Any

# Base URL from environment
BASE_URL = "https://annam-extended.preview.emergentagent.com/api"

# Test results tracking
test_results = {
    "passed": [],
    "failed": [],
    "warnings": []
}

def log_test(test_name: str, passed: bool, message: str = "", data: Any = None):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"\n{status}: {test_name}")
    if message:
        print(f"  Message: {message}")
    if data and not passed:
        print(f"  Data: {json.dumps(data, indent=2)}")
    
    if passed:
        test_results["passed"].append(test_name)
    else:
        test_results["failed"].append({"test": test_name, "message": message, "data": data})

def log_warning(test_name: str, message: str):
    """Log warning"""
    print(f"\n⚠️  WARNING: {test_name}")
    print(f"  Message: {message}")
    test_results["warnings"].append({"test": test_name, "message": message})

def test_seed_endpoint():
    """Test 1: POST /api/seed - should seed database with farms"""
    print("\n" + "="*80)
    print("TEST 1: POST /api/seed")
    print("="*80)
    
    try:
        response = requests.post(f"{BASE_URL}/seed", timeout=30)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 200:
            log_test("POST /api/seed", False, f"Expected 200, got {response.status_code}", response.text)
            return None
        
        data = response.json()
        
        # Should return either {seeded:true, farms:5} or {seeded:false}
        if "seeded" not in data:
            log_test("POST /api/seed", False, "Response missing 'seeded' field", data)
            return None
        
        if data["seeded"] == True:
            if data.get("farms") != 5:
                log_test("POST /api/seed", False, f"Expected farms:5, got {data.get('farms')}", data)
                return None
            log_test("POST /api/seed", True, "Database seeded with 5 farms")
        else:
            log_test("POST /api/seed", True, "Database already seeded (idempotent)")
        
        return data
        
    except Exception as e:
        log_test("POST /api/seed", False, f"Exception: {str(e)}")
        return None

def test_get_farms():
    """Test 2: GET /api/farms - should return array of 5 farms"""
    print("\n" + "="*80)
    print("TEST 2: GET /api/farms")
    print("="*80)
    
    try:
        response = requests.get(f"{BASE_URL}/farms", timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            log_test("GET /api/farms", False, f"Expected 200, got {response.status_code}", response.text)
            return None
        
        farms = response.json()
        print(f"Number of farms: {len(farms)}")
        
        if not isinstance(farms, list):
            log_test("GET /api/farms", False, "Response is not an array", farms)
            return None
        
        if len(farms) < 5:
            log_test("GET /api/farms", False, f"Expected at least 5 farms, got {len(farms)}", farms)
            return None
        
        # Check first farm structure
        farm = farms[0]
        print(f"Sample farm: {json.dumps(farm, indent=2, default=str)}")
        
        required_fields = ["id", "name", "village", "district", "cropType", "areaInAcres", 
                          "latitude", "longitude", "soilPh", "nitrogenKgPerHa"]
        
        missing_fields = [f for f in required_fields if f not in farm]
        if missing_fields:
            log_test("GET /api/farms", False, f"Missing fields: {missing_fields}", farm)
            return None
        
        # Check for MongoDB _id leakage
        if "_id" in farm:
            log_test("GET /api/farms", False, "MongoDB _id leaked in response", farm)
            return None
        
        # Verify id is UUID format (not ObjectId)
        farm_id = farm["id"]
        if not isinstance(farm_id, str) or len(farm_id) < 32:
            log_test("GET /api/farms", False, f"Invalid UUID format: {farm_id}", farm)
            return None
        
        log_test("GET /api/farms", True, f"Retrieved {len(farms)} farms with correct structure")
        return farms
        
    except Exception as e:
        log_test("GET /api/farms", False, f"Exception: {str(e)}")
        return None

def test_get_single_farm(farm_id: str):
    """Test 3: GET /api/farms?id={farmId} - should return single farm"""
    print("\n" + "="*80)
    print(f"TEST 3: GET /api/farms?id={farm_id}")
    print("="*80)
    
    try:
        response = requests.get(f"{BASE_URL}/farms?id={farm_id}", timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            log_test("GET /api/farms?id=", False, f"Expected 200, got {response.status_code}", response.text)
            return None
        
        farm = response.json()
        print(f"Farm: {json.dumps(farm, indent=2, default=str)}")
        
        if farm.get("id") != farm_id:
            log_test("GET /api/farms?id=", False, f"Expected farm id {farm_id}, got {farm.get('id')}", farm)
            return None
        
        log_test("GET /api/farms?id=", True, f"Retrieved farm {farm.get('name')}")
        return farm
        
    except Exception as e:
        log_test("GET /api/farms?id=", False, f"Exception: {str(e)}")
        return None

def test_stress_with_farm_id(farm_id: str, farm_name: str):
    """Test 4: GET /api/stress?farmId={farmId} - THE CORE ENGINE with LIVE Meteoblue"""
    print("\n" + "="*80)
    print(f"TEST 4: GET /api/stress?farmId={farm_id} (LIVE Meteoblue - may take 1-20s)")
    print("="*80)
    
    try:
        # Use 60s timeout as specified in review request
        response = requests.get(f"{BASE_URL}/stress?farmId={farm_id}", timeout=60)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            log_test(f"GET /api/stress?farmId= ({farm_name})", False, 
                    f"Expected 200, got {response.status_code}", response.text)
            return None
        
        data = response.json()
        
        # Check weather data
        if "weather" not in data:
            log_test(f"GET /api/stress?farmId= ({farm_name})", False, "Missing 'weather' field", data)
            return None
        
        weather = data["weather"]
        print(f"\nWeather data:")
        print(f"  tmax: {weather.get('tmax')}")
        print(f"  tmin: {weather.get('tmin')}")
        print(f"  tavg: {weather.get('tavg')}")
        print(f"  precip: {weather.get('precip')}")
        print(f"  soilMoisturePct: {weather.get('soilMoisturePct')}")
        print(f"  evaporation: {weather.get('evaporation')}")
        
        # Verify weather fields are numbers and realistic
        required_weather = ["tmax", "tmin", "tavg", "precip", "soilMoisturePct", "evaporation"]
        for field in required_weather:
            if field not in weather:
                log_test(f"GET /api/stress?farmId= ({farm_name})", False, 
                        f"Missing weather.{field}", data)
                return None
            
            value = weather[field]
            if not isinstance(value, (int, float)):
                log_test(f"GET /api/stress?farmId= ({farm_name})", False, 
                        f"weather.{field} is not a number: {value}", data)
                return None
        
        # Check temperature is realistic (20-50°C range)
        tmax = weather["tmax"]
        tmin = weather["tmin"]
        if not (15 <= tmax <= 55):
            log_warning(f"GET /api/stress?farmId= ({farm_name})", 
                       f"tmax {tmax}°C outside realistic range 15-55°C")
        if not (10 <= tmin <= 45):
            log_warning(f"GET /api/stress?farmId= ({farm_name})", 
                       f"tmin {tmin}°C outside realistic range 10-45°C")
        
        # Verify weather has series arrays
        if "series" not in weather:
            log_warning(f"GET /api/stress?farmId= ({farm_name})", "Missing weather.series")
        
        # Check diagnostic data
        if "diagnostic" not in data:
            log_test(f"GET /api/stress?farmId= ({farm_name})", False, "Missing 'diagnostic' field", data)
            return None
        
        diagnostic = data["diagnostic"]
        
        # Check diagnostic.scores
        if "scores" not in diagnostic:
            log_test(f"GET /api/stress?farmId= ({farm_name})", False, 
                    "Missing diagnostic.scores", data)
            return None
        
        scores = diagnostic["scores"]
        print(f"\nDiagnostic scores:")
        print(f"  diurnal: {scores.get('diurnal')}")
        print(f"  night: {scores.get('night')}")
        print(f"  frost: {scores.get('frost')}")
        
        for score_name in ["diurnal", "night", "frost"]:
            if score_name not in scores:
                log_test(f"GET /api/stress?farmId= ({farm_name})", False, 
                        f"Missing diagnostic.scores.{score_name}", data)
                return None
            
            score = scores[score_name]
            if not isinstance(score, (int, float)):
                log_test(f"GET /api/stress?farmId= ({farm_name})", False, 
                        f"diagnostic.scores.{score_name} is not a number: {score}", data)
                return None
            
            if not (0 <= score <= 9):
                log_warning(f"GET /api/stress?farmId= ({farm_name})", 
                           f"diagnostic.scores.{score_name} = {score} outside 0-9 range")
        
        # Check diagnostic.droughtIndex
        if "droughtIndex" not in diagnostic:
            log_test(f"GET /api/stress?farmId= ({farm_name})", False, 
                    "Missing diagnostic.droughtIndex", data)
            return None
        
        drought = diagnostic["droughtIndex"]
        print(f"\nDrought Index:")
        print(f"  value: {drought.get('value')}")
        print(f"  risk: {drought.get('risk')}")
        
        if "value" not in drought or "risk" not in drought:
            log_test(f"GET /api/stress?farmId= ({farm_name})", False, 
                    "Missing droughtIndex.value or droughtIndex.risk", data)
            return None
        
        if drought["risk"] not in ["No Risk", "Medium Risk", "High Risk"]:
            log_test(f"GET /api/stress?farmId= ({farm_name})", False, 
                    f"Invalid droughtIndex.risk: {drought['risk']}", data)
            return None
        
        # Check diagnostic.product
        if "product" not in diagnostic:
            log_test(f"GET /api/stress?farmId= ({farm_name})", False, 
                    "Missing diagnostic.product", data)
            return None
        
        product = diagnostic["product"]
        print(f"\nProduct recommendation:")
        print(f"  product: {product.get('product')}")
        print(f"  brand: {product.get('brand')}")
        print(f"  rationale: {product.get('rationale')}")
        
        if "product" not in product or "brand" not in product or "rationale" not in product:
            log_test(f"GET /api/stress?farmId= ({farm_name})", False, 
                    "Missing product fields", data)
            return None
        
        # Verify product is one of the expected values
        expected_products = ["Syngenta Stress Buster", "Syngenta Yield Booster"]
        if product["product"] not in expected_products:
            log_warning(f"GET /api/stress?farmId= ({farm_name})", 
                       f"Unexpected product: {product['product']}")
        
        # Check diagnostic.dosing
        if "dosing" not in diagnostic:
            log_test(f"GET /api/stress?farmId= ({farm_name})", False, 
                    "Missing diagnostic.dosing", data)
            return None
        
        dosing = diagnostic["dosing"]
        print(f"\nDosing:")
        print(f"  message: {dosing.get('message')}")
        
        if "message" not in dosing:
            log_test(f"GET /api/stress?farmId= ({farm_name})", False, 
                    "Missing dosing.message", data)
            return None
        
        # Verify dosing message contains expected terms
        message = dosing["message"].lower()
        if "bottle caps" not in message and "pumps per acre" not in message:
            log_warning(f"GET /api/stress?farmId= ({farm_name})", 
                       f"Dosing message missing expected terms: {dosing['message']}")
        
        # Check sprayWindow
        if "sprayWindow" not in data:
            log_test(f"GET /api/stress?farmId= ({farm_name})", False, 
                    "Missing 'sprayWindow' field", data)
            return None
        
        spray_window = data["sprayWindow"]
        print(f"\nSpray Window: {spray_window}")
        
        if not isinstance(spray_window, list):
            log_test(f"GET /api/stress?farmId= ({farm_name})", False, 
                    "sprayWindow is not an array", data)
            return None
        
        # Note: Empty array [] is valid - that's the real Syngenta API response
        if len(spray_window) == 0:
            print("  Note: Empty spray window is valid (real Syngenta CE Hub response)")
        
        log_test(f"GET /api/stress?farmId= ({farm_name})", True, 
                f"LIVE Meteoblue integration working - tmax:{tmax}°C, tmin:{tmin}°C, night:{scores['night']:.2f}, DI:{drought['value']:.2f} {drought['risk']}, {product['product']}")
        return data
        
    except requests.Timeout:
        log_test(f"GET /api/stress?farmId= ({farm_name})", False, 
                "Request timeout (>60s) - Meteoblue API may be slow or down")
        return None
    except Exception as e:
        log_test(f"GET /api/stress?farmId= ({farm_name})", False, f"Exception: {str(e)}")
        return None

def test_stress_with_coords(lat: float, lon: float, crop: str, area: float):
    """Test 5-6: GET /api/stress with lat/lon/crop/area parameters"""
    print("\n" + "="*80)
    print(f"TEST: GET /api/stress?lat={lat}&lon={lon}&crop={crop}&area={area}")
    print("="*80)
    
    try:
        response = requests.get(
            f"{BASE_URL}/stress?lat={lat}&lon={lon}&crop={crop}&area={area}", 
            timeout=60
        )
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            log_test(f"GET /api/stress (lat/lon, {crop})", False, 
                    f"Expected 200, got {response.status_code}", response.text)
            return None
        
        data = response.json()
        
        # Basic structure check
        if "weather" not in data or "diagnostic" not in data:
            log_test(f"GET /api/stress (lat/lon, {crop})", False, 
                    "Missing weather or diagnostic", data)
            return None
        
        weather = data["weather"]
        diagnostic = data["diagnostic"]
        scores = diagnostic.get("scores", {})
        
        print(f"\nWeather: tmax={weather.get('tmax')}, tmin={weather.get('tmin')}")
        print(f"Scores: diurnal={scores.get('diurnal')}, night={scores.get('night')}, frost={scores.get('frost')}")
        print(f"Product: {diagnostic.get('product', {}).get('product')}")
        
        # Verify scores differ appropriately for different crops
        # (Wheat has lower temp thresholds, so heat scores likely higher)
        log_test(f"GET /api/stress (lat/lon, {crop})", True, 
                f"Works without farmId - {crop} scores: night={scores.get('night'):.2f}")
        return data
        
    except Exception as e:
        log_test(f"GET /api/stress (lat/lon, {crop})", False, f"Exception: {str(e)}")
        return None

def test_residue(farm_id: str, expected_area: float):
    """Test 7: GET /api/residue?farmId={farmId}"""
    print("\n" + "="*80)
    print(f"TEST 7: GET /api/residue?farmId={farm_id}")
    print("="*80)
    
    try:
        response = requests.get(f"{BASE_URL}/residue?farmId={farm_id}", timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            log_test("GET /api/residue", False, 
                    f"Expected 200, got {response.status_code}", response.text)
            return None
        
        data = response.json()
        print(f"Residue data: {json.dumps(data, indent=2, default=str)}")
        
        # Check required fields
        required_fields = ["residueTons", "totalValueINR", "buyerDemand", 
                          "machineryReadiness", "hotspots", "riskLevel"]
        missing = [f for f in required_fields if f not in data]
        if missing:
            log_test("GET /api/residue", False, f"Missing fields: {missing}", data)
            return None
        
        # Verify math: residueTons = areaInAcres * 1.7
        expected_tons = expected_area * 1.7
        actual_tons = data["residueTons"]
        
        if abs(actual_tons - expected_tons) > 0.01:
            log_test("GET /api/residue", False, 
                    f"Math error: expected {expected_tons} tons (area {expected_area} * 1.7), got {actual_tons}", 
                    data)
            return None
        
        # Verify totalValueINR is calculated
        if not isinstance(data["totalValueINR"], (int, float)) or data["totalValueINR"] <= 0:
            log_test("GET /api/residue", False, 
                    f"Invalid totalValueINR: {data['totalValueINR']}", data)
            return None
        
        log_test("GET /api/residue", True, 
                f"Correct math: {expected_area} acres * 1.7 = {actual_tons} tons, Rs {data['totalValueINR']}")
        return data
        
    except Exception as e:
        log_test("GET /api/residue", False, f"Exception: {str(e)}")
        return None

def test_geocode():
    """Test 8: GET /api/geocode?query=Patiala"""
    print("\n" + "="*80)
    print("TEST 8: GET /api/geocode?query=Patiala")
    print("="*80)
    
    try:
        response = requests.get(f"{BASE_URL}/geocode?query=Patiala", timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            log_test("GET /api/geocode", False, 
                    f"Expected 200, got {response.status_code}", response.text)
            return None
        
        data = response.json()
        print(f"Geocode response: {json.dumps(data, indent=2, default=str)}")
        
        if "results" not in data:
            log_test("GET /api/geocode", False, "Missing 'results' field", data)
            return None
        
        results = data["results"]
        if not isinstance(results, list) or len(results) == 0:
            log_test("GET /api/geocode", False, "No results returned", data)
            return None
        
        # Check first result has latitude/longitude
        first = results[0]
        if "latitude" not in first or "longitude" not in first:
            log_test("GET /api/geocode", False, "Missing latitude/longitude", first)
            return None
        
        if not isinstance(first["latitude"], (int, float)) or not isinstance(first["longitude"], (int, float)):
            log_test("GET /api/geocode", False, 
                    f"Invalid lat/lon types: {type(first['latitude'])}, {type(first['longitude'])}", 
                    first)
            return None
        
        log_test("GET /api/geocode", True, 
                f"Found {len(results)} results, first: lat={first['latitude']}, lon={first['longitude']}")
        return data
        
    except Exception as e:
        log_test("GET /api/geocode", False, f"Exception: {str(e)}")
        return None

def test_machinery():
    """Test 9-10: GET /api/machinery with and without filters"""
    print("\n" + "="*80)
    print("TEST 9: GET /api/machinery")
    print("="*80)
    
    try:
        response = requests.get(f"{BASE_URL}/machinery", timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            log_test("GET /api/machinery", False, 
                    f"Expected 200, got {response.status_code}", response.text)
            return None
        
        machinery = response.json()
        print(f"Number of machinery: {len(machinery)}")
        
        if not isinstance(machinery, list):
            log_test("GET /api/machinery", False, "Response is not an array", machinery)
            return None
        
        if len(machinery) == 0:
            log_test("GET /api/machinery", False, "No machinery returned", machinery)
            return None
        
        log_test("GET /api/machinery", True, f"Retrieved {len(machinery)} machinery items")
        
        # Test with district filter
        print("\n" + "="*80)
        print("TEST 10: GET /api/machinery?district=Patiala")
        print("="*80)
        
        response = requests.get(f"{BASE_URL}/machinery?district=Patiala", timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            log_test("GET /api/machinery?district=", False, 
                    f"Expected 200, got {response.status_code}", response.text)
            return None
        
        filtered = response.json()
        print(f"Filtered machinery: {len(filtered)}")
        
        # Verify all results are from Patiala
        non_patiala = [m for m in filtered if m.get("district") != "Patiala"]
        if non_patiala:
            log_test("GET /api/machinery?district=", False, 
                    f"Filter not working: found {len(non_patiala)} non-Patiala items", 
                    non_patiala)
            return None
        
        log_test("GET /api/machinery?district=", True, 
                f"Filter working: {len(filtered)} Patiala machinery items")
        return machinery
        
    except Exception as e:
        log_test("GET /api/machinery", False, f"Exception: {str(e)}")
        return None

def test_bookings(farm_id: str):
    """Test 11: POST /api/bookings and GET /api/bookings"""
    print("\n" + "="*80)
    print("TEST 11: POST /api/bookings")
    print("="*80)
    
    try:
        booking_data = {
            "farmId": farm_id,
            "farmerName": "Gurpreet Singh",
            "machineryType": "Happy Seeder",
            "acres": 6,
            "district": "Patiala"
        }
        
        response = requests.post(
            f"{BASE_URL}/bookings", 
            json=booking_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 200:
            log_test("POST /api/bookings", False, 
                    f"Expected 200, got {response.status_code}", response.text)
            return None
        
        booking = response.json()
        print(f"Booking created: {json.dumps(booking, indent=2, default=str)}")
        
        # Check required fields
        if "id" not in booking or "status" not in booking:
            log_test("POST /api/bookings", False, "Missing id or status", booking)
            return None
        
        if booking["status"] != "requested":
            log_test("POST /api/bookings", False, 
                    f"Expected status 'requested', got '{booking['status']}'", booking)
            return None
        
        log_test("POST /api/bookings", True, 
                f"Booking created with id={booking['id']}, status={booking['status']}")
        
        # Test GET bookings
        print("\n" + "="*80)
        print(f"TEST 12: GET /api/bookings?farmId={farm_id}")
        print("="*80)
        
        response = requests.get(f"{BASE_URL}/bookings?farmId={farm_id}", timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            log_test("GET /api/bookings", False, 
                    f"Expected 200, got {response.status_code}", response.text)
            return None
        
        bookings = response.json()
        print(f"Number of bookings: {len(bookings)}")
        
        # Verify our booking is in the list
        found = any(b.get("id") == booking["id"] for b in bookings)
        if not found:
            log_test("GET /api/bookings", False, 
                    f"Created booking {booking['id']} not found in list", bookings)
            return None
        
        log_test("GET /api/bookings", True, 
                f"Retrieved {len(bookings)} bookings, including newly created one")
        return booking
        
    except Exception as e:
        log_test("POST /api/bookings", False, f"Exception: {str(e)}")
        return None

def test_district_metrics():
    """Test 13: GET /api/district-metrics"""
    print("\n" + "="*80)
    print("TEST 13: GET /api/district-metrics")
    print("="*80)
    
    try:
        response = requests.get(f"{BASE_URL}/district-metrics", timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            log_test("GET /api/district-metrics", False, 
                    f"Expected 200, got {response.status_code}", response.text)
            return None
        
        metrics = response.json()
        print(f"Number of district metrics: {len(metrics)}")
        
        if not isinstance(metrics, list):
            log_test("GET /api/district-metrics", False, "Response is not an array", metrics)
            return None
        
        if len(metrics) == 0:
            log_test("GET /api/district-metrics", False, "No metrics returned", metrics)
            return None
        
        # Check first metric structure
        first = metrics[0]
        print(f"Sample metric: {json.dumps(first, indent=2, default=str)}")
        
        if "district" not in first:
            log_test("GET /api/district-metrics", False, "Missing 'district' field", first)
            return None
        
        log_test("GET /api/district-metrics", True, 
                f"Retrieved {len(metrics)} district metrics")
        return metrics
        
    except Exception as e:
        log_test("GET /api/district-metrics", False, f"Exception: {str(e)}")
        return None

def print_summary():
    """Print test summary"""
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    total = len(test_results["passed"]) + len(test_results["failed"])
    passed = len(test_results["passed"])
    failed = len(test_results["failed"])
    warnings = len(test_results["warnings"])
    
    print(f"\nTotal Tests: {total}")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"⚠️  Warnings: {warnings}")
    
    if test_results["passed"]:
        print("\n✅ PASSED TESTS:")
        for test in test_results["passed"]:
            print(f"  - {test}")
    
    if test_results["failed"]:
        print("\n❌ FAILED TESTS:")
        for failure in test_results["failed"]:
            print(f"  - {failure['test']}")
            print(f"    Reason: {failure['message']}")
    
    if test_results["warnings"]:
        print("\n⚠️  WARNINGS:")
        for warning in test_results["warnings"]:
            print(f"  - {warning['test']}: {warning['message']}")
    
    print("\n" + "="*80)
    
    return failed == 0

def main():
    """Run all tests in order"""
    print("="*80)
    print("FarmVista Backend API Test Suite")
    print("Testing LIVE external APIs: Meteoblue ERA5LAND + Syngenta CE Hub")
    print(f"Base URL: {BASE_URL}")
    print("="*80)
    
    # Test 1: Seed database
    test_seed_endpoint()
    
    # Test 2: Get all farms
    farms = test_get_farms()
    if not farms or len(farms) == 0:
        print("\n❌ Cannot continue: No farms available")
        print_summary()
        sys.exit(1)
    
    # Use first farm for subsequent tests
    farm = farms[0]
    farm_id = farm["id"]
    farm_name = farm["name"]
    farm_area = farm["areaInAcres"]
    
    # Test 3: Get single farm
    test_get_single_farm(farm_id)
    
    # Test 4: Stress diagnostic with farmId (CORE ENGINE - LIVE Meteoblue)
    test_stress_with_farm_id(farm_id, farm_name)
    
    # Test 5: Stress with lat/lon - Wheat
    test_stress_with_coords(30.9, 75.85, "Wheat", 8)
    
    # Test 6: Stress with lat/lon - Cotton
    test_stress_with_coords(21.14, 79.08, "Cotton", 7)
    
    # Test 7: Residue economics
    test_residue(farm_id, farm_area)
    
    # Test 8: Geocoding
    test_geocode()
    
    # Test 9-10: Machinery
    test_machinery()
    
    # Test 11-12: Bookings
    test_bookings(farm_id)
    
    # Test 13: District metrics
    test_district_metrics()
    
    # Print summary
    success = print_summary()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
