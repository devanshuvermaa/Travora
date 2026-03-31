axios = require("axios");

module.exports.geocodeAddress = async (address) => {
  const apiKey = process.env.OPENCAGE_API_KEY;
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${apiKey}`;

  try {
    const response = await axios.get(url);
    const data = response.data;
    if (data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry;
      // console.log(`Latitude: ${lat}, Longitude: ${lng}`);
      return { lat, lng };
    } else {
      console.log("No results found.");
      return null;
    }
  } catch (error) {
    console.error("Error:", error);
  }
};
