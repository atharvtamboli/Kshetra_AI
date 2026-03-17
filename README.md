# Kshetra_AI

Markdown
# KshetraAI - Institutional Land Intelligence

KshetraAI is a high-performance, dark-mode geospatial intelligence platform designed for institutional real estate investors. It bypasses traditional static maps by piping **live cadastral (Khasra) boundaries directly from government production servers (Rajasthan JDA)** into a custom Leaflet-powered interface.

##  Core Features

* **Live Government API Integration:** Streams live coordinate data from the Jaipur Development Authority's ArcGIS Settlement layers.
* **100km Deep-Scan Radar:** Click anywhere on the map to trigger a spatial intersection query that mathematically calculates, sorts, and retrieves the Top 5 closest land parcels within a 100km radius.
* **Precision Khasra Search:** Instantly query the government database by exact `OBJECTID` or `KH_NO` and automatically fly the camera to the plot.
* **Live Reverse Geocoding:** Integrates with OpenStreetMap's Nominatim API to instantly identify the village, district, and pin code of any clicked location.
* **Institutional Deal Flow Dashboard:** A dedicated analytics view (`dashboard.html`) to manage saved portfolios, calculate estimated valuations, generate investment scores, and match land against active corporate buyer mandates using Chart.js.

## Tech Stack

**Frontend:**
* Vanilla HTML5 / CSS3 / JavaScript
* [Leaflet.js](https://leafletjs.com/) (High-performance web mapping)
* [Chart.js](https://www.chartjs.org/) (Dashboard data visualization)
* CARTO Dark Matter Basemaps

**Backend:**
* [Node.js](https://nodejs.org/) & [Express.js](https://expressjs.com/)
* Axios (For proxying requests and handling ArcGIS tokens)
* CORS (Cross-Origin Resource Sharing)

## Installation & Setup

### Prerequisites
You must have [Node.js](https://nodejs.org/) installed on your machine.

### 1. Initialize the Backend
Open your terminal, navigate to your project folder, and install the required dependencies:
```bash
npm init -y
npm install express cors axios
2. Start the KshetraAI Engine (Server)
Start the Node.js proxy server. This handles the complex ArcGIS token authentication and spatial math.

Bash
node server.js
The server will start on http://localhost:3000.

3. Launch the Frontend
Because the frontend uses modern ES6 modules and fetch requests, it must be served via a local web server (do not just double-click the HTML file).

If using VS Code, use the Live Server extension.

Serve index.html (Map Explorer) or dashboard.html (Analytics).

API Architecture
The Node.js backend acts as a stealth proxy, attaching necessary Referer headers and dynamic tokens to bypass government CORS restrictions.

GET /api/search?khasra={id}: Queries the ArcGIS server for a specific parcel.

GET /api/identify?lat={lat}&lng={lng}: Pings OpenStreetMap for local area names.

GET /api/identify-khasra?lat={lat}&lng={lng}: Casts a 100km spatial net using esriSpatialRelIntersects to find the nearest boundaries to a GPS coordinate.

POST /api/save-parcel: Saves a discovered Khasra to the local in-memory portfolio.

GET /api/dashboard-data: Serves portfolio analytics and aggregated KPIs to the dashboard.

Disclaimer on Government Tokens
This project connects to secure government GIS servers (gisprod.rajasthan.gov.in). These servers utilize short-lived ArcGIS session tokens (usually expiring after 1 hour). If the map stops loading data, you must extract a fresh token from the live Rajdharaa portal via your browser's Network tab and update the authCache in server.js.
