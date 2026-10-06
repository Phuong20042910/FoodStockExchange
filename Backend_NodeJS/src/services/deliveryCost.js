const axios = require('axios');

const ORS_API_KEY = process.env.ORS_API_KEY || '';
const REST_LONG = parseFloat(process.env.RESTAURANT_LONGITUDE || '106.702000');
const REST_LAT = parseFloat(process.env.RESTAURANT_LATITUDE || '10.776000');

function calculateHaversine(lon1, lat1, lon2, lat2) {
    const R = 6371.0; // km
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.asin(Math.sqrt(a));
    return R * c;
}

async function calculateDeliveryCost(destLong, destLat) {
    let distanceKm = 0.0;
    let durationMins = 0;
    let routeFound = false;

    if (ORS_API_KEY && !ORS_API_KEY.startsWith('YOUR_')) {
        try {
            const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${REST_LONG},${REST_LAT}&end=${destLong},${destLat}`;
            const res = await axios.get(url, { timeout: 10000 });
            if (res.status === 200) {
                const data = res.data;
                distanceKm = data.features[0].properties.summary.distance / 1000.0;
                durationMins = Math.floor(data.features[0].properties.summary.duration / 60.0);
                routeFound = true;
            }
        } catch (err) {
            console.log(`Lỗi kết nối OpenRouteService: ${err.message}. Sử dụng Haversine...`);
        }
    }

    if (!routeFound) {
        const haversineDist = calculateHaversine(REST_LONG, REST_LAT, destLong, destLat);
        distanceKm = haversineDist * 1.3;
        durationMins = Math.floor(distanceKm * 2.5);
    }

    const baseShippingFee = 10000;
    const perKmCharge = 5000;
    let shippingFee = baseShippingFee + (distanceKm * perKmCharge);
    
    shippingFee = Math.ceil(shippingFee / 1000.0) * 1000;

    return {
        distance_km: Math.round(distanceKm * 100) / 100,
        estimated_duration_minutes: durationMins,
        shipping_fee: shippingFee,
        source: routeFound ? "OpenRouteService API" : "Haversine Fallback Engine (Node)"
    };
}

module.exports = {
    calculateDeliveryCost
};
