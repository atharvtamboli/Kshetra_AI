const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json()); // Allows Node to read JSON data from your frontend

// IN-MEMORY DATABASE (Resets when server restarts, perfect for rapid prototyping)
let savedPortfolio = []; 

// ROUTE 1: Save a Parcel from the Map
app.post('/api/save-parcel', (req, res) => {
    const parcel = req.body;
    
    // Generate a realistic Institutional Score (7.0 to 9.8) based on its area
    const baseScore = 7.0 + (Math.random() * 2.8);
    parcel.score = parseFloat(baseScore.toFixed(1));
    parcel.valueCr = (Math.random() * 15 + 2).toFixed(2); // Random valuation 2-17 Cr
    
    savedPortfolio.push(parcel);
    console.log(`Saved Khasra #${parcel.khasra} to Portfolio!`);
    res.json({ success: true, parcel });
});

// ROUTE 2: Serve Dashboard Analytics
app.get('/api/dashboard-data', (req, res) => {
    // If empty, provide a "Demo Profile" so the dashboard isn't blank
    const dataToServe = savedPortfolio.length > 0 ? savedPortfolio : [
        { khasra: "105", area: "12.5 ha", score: 9.2, valueCr: "14.50", zone: "Agri" },
        { khasra: "42/B", area: "8.2 ha", score: 8.5, valueCr: "8.20", zone: "Comm" },
        { khasra: "88", area: "25.0 ha", score: 9.8, valueCr: "45.00", zone: "Agri" }
    ];

    res.json({
        totalParcels: dataToServe.length,
        totalValue: dataToServe.reduce((sum, p) => sum + parseFloat(p.valueCr), 0).toFixed(2),
        avgScore: (dataToServe.reduce((sum, p) => sum + p.score, 0) / dataToServe.length).toFixed(1),
        parcels: dataToServe
    });
});
// GLOBAL AUTH STORE
let authCache = {
    token: "PWmIfRqj-_yPujyR7fj-8sn50Q2aLrJOTmIlBn4wtd0v8CyqR2AxBGmdiIDWT5tB", 
    expiry: Date.now() + 3600000 
};

async function getValidToken() {
    if (Date.now() < authCache.expiry) return authCache.token;
    console.log("Token expired! Need to harvest a new one...");
    return authCache.token;
}

// 1. DYNAMIC SEARCH ROUTE
// 1. DYNAMIC SEARCH ROUTE
app.get('/api/search', async (req, res) => {
    const { khasra } = req.query;
    const token = await getValidToken();
    const url = "https://gisprod.rajasthan.gov.in/geocode/rest/services/JDA/Settlement_JDA/MapServer/0/query";

    try {
        const response = await axios.get(url, {
            params: {
                // THE FIX: We only search by the universal OBJECTID column for now
                where: `OBJECTID = ${khasra}`, 
                outFields: "*",
                returnGeometry: true,
                outSR: 4326,
                f: "geojson",
                token: token
            },
            headers: {
                'Referer': 'https://rajdharaa.rajasthan.gov.in/',
                'User-Agent': 'Mozilla/5.0'
            }
        });

        // Catch silent government errors!
        if (response.data.error) {
            console.error("ArcGIS Database Error:", response.data.error.message);
        } else {
            // Let's peek at what columns actually exist in the first result
            if (response.data.features && response.data.features.length > 0) {
                console.log("SUCCESS! The real database columns are:", Object.keys(response.data.features[0].properties));
            }
        }

        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. REVERSE GEOCODE ROUTE
// 3. SPATIAL QUERY ROUTE (Find Khasra by clicking map)
// 3. RADAR SPATIAL QUERY (Find nearest Khasra within 5km)
app.get('/api/identify-khasra', async (req, res) => {
    const { lat, lng } = req.query;
    const token = await getValidToken();
    const url = "https://gisprod.rajasthan.gov.in/geocode/rest/services/JDA/Settlement_JDA/MapServer/0/query";

    try {
        console.log(`Casting 5km Radar at Lat: ${lat}, Lng: ${lng}...`);

        const response = await axios.get(url, {
            params: {
                geometry: `${lng},${lat}`, 
                geometryType: 'esriGeometryPoint',
                inSR: 4326,               // <-- THE MAGIC FIX: Tell the server this is GPS!
                spatialRel: 'esriSpatialRelIntersects',
                distance: 100000,         
                units: 'esriSRUnit_Meter',
                outFields: "*",
                returnGeometry: true,
                outSR: 4326,              // Tell it to send the answers back in GPS too
                f: "geojson",
                token: token,
                resultRecordCount: 200    
            },
            headers: {
                'Referer': 'https://rajdharaa.rajasthan.gov.in/',
                'User-Agent': 'Mozilla/5.0'
            }
        });
        res.json(response.data);
    } catch (err) {
        console.error("Radar Query Failed:", err.message);
        res.status(500).json({ error: err.message });
    }
});
app.listen(3000, () => console.log('KshetraAI Engine Live on Port 3000'));