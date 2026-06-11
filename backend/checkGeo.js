import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const ServiceArea = mongoose.model('ServiceArea', new mongoose.Schema({}, { strict: false }));
  
  const cLat = 22.7115348;
  const cLng = 75.8601046;
  const vLat = 22.717593;
  const vLng = 75.871973;

  const serviceArea = await ServiceArea.findOne({
      isActive: true,
      boundary: {
          $geoIntersects: {
              $geometry: {
                  type: 'Point',
                  coordinates: [cLng, cLat]
              }
          }
      }
  });

  if (serviceArea) {
      console.log('Customer IS IN Geofence:', serviceArea.areaName);
      
      const isPointInPolygon = (lat, lng, polygonCoords) => {
          let inside = false;
          const x = lng;
          const y = lat;
          for (let i = 0, j = polygonCoords.length - 1; i < polygonCoords.length; j = i++) {
              const xi = polygonCoords[i][0];
              const yi = polygonCoords[i][1];
              const xj = polygonCoords[j][0];
              const yj = polygonCoords[j][1];
              const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
              if (intersect) inside = !inside;
          }
          return inside;
      }
      
      const polygonCoords = serviceArea.boundary.coordinates[0];
      const vendorInGeofence = isPointInPolygon(vLat, vLng, polygonCoords);
      console.log('Vendor IS IN Geofence?:', vendorInGeofence);
  } else {
      console.log('Customer is NOT in any Geofence.');
  }

  process.exit(0);
}).catch(console.error);
