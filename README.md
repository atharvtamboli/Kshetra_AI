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

npm init -y
npm install express cors axios

2. Start the KshetraAI Engine (Server)
Start the Node.js proxy server. This handles the complex ArcGIS token authentication and spatial math.

node server.js
The server will start on http://localhost:3000.

GET /api/dashboard-data: Serves portfolio analytics and aggregated KPIs to the dashboard.

Disclaimer on Government Tokens
This project connects to secure government GIS servers (gisprod.rajasthan.gov.in). These servers utilize short-lived ArcGIS session tokens (usually expiring after 1 hour). If the map stops loading data, you must extract a fresh token from the live Rajdharaa portal via your browser's Network tab and update the authCache in server.js.
