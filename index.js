const express = require('express');
const axios = require('axios');
require('dotenv').config();
const session = require('express-session');  // Add express-session

const app = express();
const PORT = 3000;

// Set up session middleware
app.use(session({
  secret: 'your-secret-key',  // You can replace this with a more secure secret
  resave: false,
  saveUninitialized: true,
}));

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  const { uv, message, error, location } = req.session;
  req.session.location = null; // Clear location after rendering
  res.render('index', { uv, message, error, location });
});

app.post('/check', async (req, res) => {
  const { lat, lon } = req.body;

  try {
    // Get the UV data from the OpenUV API
    const response = await axios.get(`https://api.openuv.io/api/v1/uv?lat=${lat}&lng=${lon}`, {
      headers: {
        'x-access-token': process.env.UV_API_KEY,
      },
    });

    const uv = response.data.result.uv;

    // Reverse Geocoding: Get the location name from latitude and longitude
    const geoResponse = await axios.get(`https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lon}&key=${process.env.GEOCODE_API_KEY}`);
    const locationName = geoResponse.data.results[0]?.formatted || "Unknown location";

    // Generate UV message
    let message;
    if (uv < 3) message = "UV is low. No sunscreen needed!";
    else if (uv < 6) message = "Moderate UV. Wear sunscreen if you're outside!";
    else if (uv < 8) message = "High UV! Sunscreen and shade recommended!";
    else message = "Extreme UV! Stay indoors if possible!";

    // Save results in session
    req.session.uv = uv;
    req.session.message = message;
    req.session.error = null;
    req.session.location = locationName; // Save the location name
  } catch (error) {
    console.error("Error:", error.message);
    req.session.uv = null;
    req.session.message = null;
    req.session.error = "Failed to fetch UV data.";
    req.session.location = null; // Clear location on error
  }

  // Redirect to homepage
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
