import ServiceArea from '../models/ServiceArea.js';

// Admin: Create a new service area
export const createServiceArea = async (req, res) => {
    try {
        const { areaName, city, coordinates, color, multiplier, minimumOrderValue } = req.body;

        // Validation
        if (!areaName || !coordinates || !Array.isArray(coordinates)) {
            return res.status(400).json({ message: 'Missing required fields or invalid coordinates' });
        }

        const newArea = new ServiceArea({
            areaName,
            city,
            boundary: {
                type: 'Polygon',
                coordinates: [coordinates] // Wrap in another array for GeoJSON Polygon
            },
            color,
            multiplier: multiplier || 1.0,
            minimumOrderValue
        });

        await newArea.save();
        res.status(201).json(newArea);
    } catch (err) {
        console.error('Create Service Area Error:', err);
        res.status(500).json({ message: err.message });
    }
};

// Admin: Get all service areas
export const getAllServiceAreas = async (req, res) => {
    try {
        const areas = await ServiceArea.find().sort({ createdAt: -1 });
        res.status(200).json(areas);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Admin: Update service area
export const updateServiceArea = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (updates.coordinates) {
            updates.boundary = {
                type: 'Polygon',
                coordinates: [updates.coordinates]
            };
            delete updates.coordinates;
        }

        const updatedArea = await ServiceArea.findByIdAndUpdate(id, updates, { new: true });
        if (!updatedArea) return res.status(404).json({ message: 'Area not found' });

        res.status(200).json(updatedArea);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Admin: Delete service area
export const deleteServiceArea = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await ServiceArea.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ message: 'Area not found' });
        res.status(200).json({ message: 'Service area deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Public/Customer: Check availability and get zone details
export const checkLocationAvailability = async (req, res) => {
    try {
        const { lat, lng } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({ message: 'Latitude and Longitude are required' });
        }

        // Geospatial Query: Point-in-Polygon
        const area = await ServiceArea.findOne({
            isActive: true,
            boundary: {
                $geoIntersects: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(lng), parseFloat(lat)] // [lng, lat]
                    }
                }
            }
        });

        if (!area) {
            return res.status(200).json({ 
                available: false, 
                message: 'Sorry, we do not serve this location yet.' 
            });
        }

        res.status(200).json({
            available: true,
            areaId: area._id,
            name: area.areaName,
            pricingFactor: area.multiplier || 1.0,
            minimumOrderValue: area.minimumOrderValue
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
