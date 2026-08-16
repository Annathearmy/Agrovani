#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "AgroVani (Annam.ai) - agri-intelligence app: live Meteoblue ERA5LAND weather -> biostimulant abiotic stress engine (cardinal temperature formulas), Syngenta CE Hub spray window, residue/stubble economics, interactive Leaflet map, farmer onboarding + 2-tab dashboard. Adapted from provided TS/Prisma codebase into this JS/MongoDB/Next15 environment."

backend:
  - task: "Seed endpoint (POST /api/seed) - farms, machinery, district_metrics"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: true
        -agent: "main"
        -comment: "Seeds 5 farms across Punjab/MP/Maharashtra/AP with lat/long, 5 machinery, district metrics. Verified via curl returns {seeded:true, farms:5}. Idempotent (skips if farms exist)."
        -working: true
        -agent: "testing"
        -comment: "TESTED: POST /api/seed returns {seeded:false} (already seeded - idempotent behavior confirmed). Endpoint working correctly."

  - task: "Farms CRUD (POST/GET /api/farms)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: true
        -agent: "main"
        -comment: "POST creates farm with UUID; GET lists all or by ?id=. Uses MONGO_URL + DB_NAME. No ObjectId leakage. Verified 5 farms returned."
        -working: true
        -agent: "testing"
        -comment: "TESTED: GET /api/farms returns 5 farms with correct structure (id, name, village, district, cropType, areaInAcres, latitude, longitude, soilPh, nitrogenKgPerHa). No MongoDB _id leakage confirmed. UUID format verified. GET /api/farms?id={farmId} returns single farm correctly. All CRUD operations working."

  - task: "Stress diagnostic engine (GET /api/stress) - Meteoblue live + cardinal temps + Syngenta spray window"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js, lib/adapters/weather.js, lib/adapters/cehub.js, lib/calculations/cropRecommendation.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: true
        -agent: "main"
        -comment: "LIVE Meteoblue ERA5LAND (temp via '2 m above gnd', precip 'sfc' sum, soil '0-7 cm down' mean, evapotranspiration code 261 with temp fallback). Computes diurnal/night/frost (0-9), drought index, yield risk, product match (Stress Buster/Yield Booster), smart dosing. Also calls Syngenta CE Hub SprayWindowRecommendation (returns [] currently - real API response) + HydricStress. Verified: Rice Patiala -> night 7.07, DI 0.92 High Risk, Stress Buster. Saves StressDiagnosticLog. Supports ?farmId= or ?lat&lon&crop&area."
        -working: true
        -agent: "testing"
        -comment: "TESTED: CORE ENGINE FULLY WORKING. LIVE Meteoblue integration confirmed with realistic temps (Rice Patiala: tmax=31.93°C, tmin=26.71°C, tavg=29.32°C, precip=7.9mm, soilMoisture=21.5%, evap=2.39mm). Diagnostic scores correct: diurnal=0, night=7.07, frost=0 (all 0-9 range). DroughtIndex: 0.92 High Risk. Product: Syngenta Stress Buster with correct dosing message (bottle caps + pumps per acre). Syngenta CE Hub spray window returns [] (valid real API response). Tested multiple crops: Wheat (lat/lon) night=9.00 (higher stress as expected), Cotton night=6.84. All weather series data present. Endpoint works with both ?farmId= and ?lat&lon&crop&area parameters. No errors."

  - task: "Residue economics (GET /api/residue)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js, lib/calculations/residueRecommendation.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: true
        -agent: "main"
        -comment: "ResidueTons = area*1.7, TotalValueINR = tons*districtRate, buyer demand + machinery readiness + hotspots per district. Verified Patiala 6 acres -> 10.2 tons, Rs 16830, High demand, 82% readiness."
        -working: true
        -agent: "testing"
        -comment: "TESTED: Math verified correct - 6 acres * 1.7 = 10.2 tons, Rs 16,830. All required fields present: residueTons, totalValueINR, buyerDemand (High), machineryReadiness (82%), hotspots (4), riskLevel (High). Endpoint working perfectly."

  - task: "Geocoding (GET /api/geocode) - Nominatim fallback for CE Hub LocationSearch"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js, lib/adapters/cehub.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        -working: true
        -agent: "main"
        -comment: "CE Hub LocationSearch path returns 404 (not publicly resolvable), so using OpenStreetMap Nominatim (India-restricted, free, no key). Returns name/lat/long."
        -working: true
        -agent: "testing"
        -comment: "TESTED: GET /api/geocode?query=Patiala returns 3 results from OpenStreetMap Nominatim. All results have correct latitude/longitude numbers. First result: lat=30.2092778, lon=76.3397231. Endpoint working correctly."

  - task: "Machinery listing + Bookings (GET /api/machinery, POST/GET /api/bookings)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        -working: true
        -agent: "main"
        -comment: "Machinery list filterable by district/type. Bookings create with UUID + status 'requested'."
        -working: true
        -agent: "testing"
        -comment: "TESTED: GET /api/machinery returns 5 machinery items. GET /api/machinery?district=Patiala filter working correctly (2 items, all from Patiala). POST /api/bookings creates booking with UUID and status='requested'. GET /api/bookings?farmId={id} retrieves bookings correctly. All endpoints working."

  - task: "District metrics (GET /api/district-metrics)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        -working: true
        -agent: "testing"
        -comment: "TESTED: GET /api/district-metrics returns 5 district metrics with correct structure (district, rate, buyerDemand, machineryReadiness, hotspots, state). Endpoint working correctly."

frontend:
  - task: "Farmer dashboard 2-tab (Residue + Crop Health) with live data + Leaflet map"
    implemented: true
    working: true
    file: "app/farmer/dashboard/page.js, components/farmer/FarmMapCard.js, components/farmer/LeafletMap.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: false
        -agent: "main"
        -comment: "Initially blank due to react-leaflet@4 'Map container is already initialized' error under React 18 StrictMode dev double-mount (whole page crashed via error boundary)."
        -working: true
        -agent: "main"
        -comment: "Fixed by setting reactStrictMode:false in next.config.js. Verified via headless Chrome: Residue tab (1.7 t/acre, 10.2 tons, Rs 16830 High, 82%, map with pins) and Crop tab (TMAX 31.9/TMIN 26.7, Night 7.1/9, DI 0.92 High Risk, Syngenta Stress Buster + dosing, heat-overlay map) both render with live data."

  - task: "Landing page + Onboarding wizard (geocode, localStorage, live preview)"
    implemented: true
    working: true
    file: "app/page.js, app/farmer/onboarding/page.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        -working: true
        -agent: "main"
        -comment: "Landing hero with language toggle (en/hi/pa). Onboarding 3-step wizard with Locate (geocode), live preview card, Save offline (localStorage). Verified via headless Chrome."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    -agent: "main"
    -message: "Please test all backend endpoints. Start by POST /api/seed. Key focus: GET /api/stress?farmId={id} which calls LIVE Meteoblue (may take 1-20s) and Syngenta CE Hub - verify it returns weather + diagnostic.scores (diurnal/night/frost 0-9) + droughtIndex + product recommendation + dosing without errors. Also test different crops via ?lat=&lon=&crop=&area= (e.g. Wheat, Cotton). Verify /api/residue math (area*1.7). Note: Syngenta SprayWindow legitimately returns empty array [] for these coords - that is the real API response, not a bug. API keys are in /app/.env (METEOBLUE_APIKEY, CEHUB_APIKEY)."
    -agent: "testing"
    -message: "BACKEND TESTING COMPLETE - ALL 13 TESTS PASSED ✅. Comprehensive testing performed on all backend endpoints: 1) POST /api/seed (idempotent ✓), 2) GET /api/farms (5 farms, no _id leakage ✓), 3) GET /api/farms?id= (single farm ✓), 4) GET /api/stress?farmId= with LIVE Meteoblue (realistic temps 31.93°C/26.71°C, scores 0-9 range, drought index, product recommendation, dosing ✓), 5-6) GET /api/stress with lat/lon for Wheat & Cotton (different crop scores ✓), 7) GET /api/residue (math correct: 6*1.7=10.2 tons ✓), 8) GET /api/geocode (Nominatim working ✓), 9-10) GET /api/machinery with/without filters ✓, 11-12) POST/GET /api/bookings ✓, 13) GET /api/district-metrics ✓. CORE ENGINE (stress diagnostic) fully functional with live external API integrations. No critical issues found. All endpoints production-ready."
