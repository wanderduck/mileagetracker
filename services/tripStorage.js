// services/tripStorage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const TRIPS_STORAGE_KEY = 'mileagetracker_trips';
const CURRENT_TRIP_KEY = 'mileagetracker_currenttrip';
const SETTINGS_KEY = 'mileagetracker_settings';

export default class TripStorageService {
  constructor() {
    // Default settings
    this.settings = {
      mileageRate: 0.40,           // Cost per mile in dollars
      monthlyBudget: 200,          // Monthly budget in dollars
      warningThreshold: 0.85,      // Alert at 85% of budget
      recordingInterval: 3000,     // 3 seconds between location updates
      geocodeAddresses: true,      // Whether to geocode start/end locations
      preferredChart: 'monthly',   // Default chart view
    };

    // Initialize settings
    this.loadSettings();
  }

  // Load app settings
  async loadSettings() {
    try {
      const settingsJson = await AsyncStorage.getItem(SETTINGS_KEY);
      if (settingsJson) {
        this.settings = { ...this.settings, ...JSON.parse(settingsJson) };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  // Save app settings
  async saveSettings(newSettings) {
    try {
      this.settings = { ...this.settings, ...newSettings };
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  }

  // Create a new trip and begin storing location data
  async startTrip(startLocation) {
    try {
      // Generate a unique ID using timestamp
      const tripId = `trip_${Date.now()}`;

      // Get current date components
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1; // 1-12
      const day = now.getDate();
      const weekday = now.getDay(); // 0-6 (Sunday-Saturday)

      // Calculate week number (1-52)
      const firstDayOfYear = new Date(year, 0, 1);
      const pastDaysOfYear = (now - firstDayOfYear) / 86400000;
      const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);

      // Create new trip object
      const newTrip = {
        id: tripId,
        startTime: now.toISOString(),
        endTime: null,
        durationMinutes: 0,
        distanceMiles: 0,
        cost: 0,
        avgSpeedMph: 0,
        startLocation: startLocation || {
          latitude: null,
          longitude: null,
          address: null
        },
        endLocation: {
          latitude: null,
          longitude: null,
          address: null
        },
        path: [],
        // Metadata for querying
        day,
        month,
        year,
        weekNumber,
        weekday
      };

      // Save as current trip
      await AsyncStorage.setItem(CURRENT_TRIP_KEY, JSON.stringify(newTrip));

      return newTrip;
    } catch (error) {
      console.error('Failed to start trip:', error);
      return null;
    }
  }

  // Add a location point to the current trip
  async addLocationToTrip(location) {
    try {
      // Get current trip
      const tripJson = await AsyncStorage.getItem(CURRENT_TRIP_KEY);
      if (!tripJson) {
        return false;
      }

      const trip = JSON.parse(tripJson);

      // Add location to path
      trip.path.push({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: new Date().toISOString(),
        speed: location.coords.speed || 0,
        altitude: location.coords.altitude || 0
      });

      // Update end location
      trip.endLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: null // Could geocode this later if needed
      };

      // Save updated trip
      await AsyncStorage.setItem(CURRENT_TRIP_KEY, JSON.stringify(trip));

      return true;
    } catch (error) {
      console.error('Failed to add location to trip:', error);
      return false;
    }
  }

  // End the current trip and save it to storage
  async endTrip(finalLocation) {
    try {
      // Get current trip
      const tripJson = await AsyncStorage.getItem(CURRENT_TRIP_KEY);
      if (!tripJson) {
        return null;
      }

      const trip = JSON.parse(tripJson);

      // Update end time and final location
      const now = new Date();
      trip.endTime = now.toISOString();

      if (finalLocation) {
        trip.endLocation = {
          latitude: finalLocation.coords.latitude,
          longitude: finalLocation.coords.longitude,
          address: null // Could geocode this later
        };
      }

      // Calculate trip duration in minutes
      const startTime = new Date(trip.startTime);
      const endTime = new Date(trip.endTime);
      trip.durationMinutes = Math.round((endTime - startTime) / 60000);

      // Calculate total distance
      trip.distanceMiles = this.calculateTripDistance(trip.path);

      // Calculate cost based on distance
      trip.cost = trip.distanceMiles * this.settings.mileageRate;

      // Calculate average speed (if trip has duration)
      if (trip.durationMinutes > 0) {
        trip.avgSpeedMph = trip.distanceMiles / (trip.durationMinutes / 60);
      }

      // Save the trip to the trips array
      await this.saveCompletedTrip(trip);

      // Clear the current trip
      await AsyncStorage.removeItem(CURRENT_TRIP_KEY);

      return trip;
    } catch (error) {
      console.error('Failed to end trip:', error);
      return null;
    }
  }

  // Calculate the total distance of a trip in miles
  calculateTripDistance(pathPoints) {
    if (!pathPoints || pathPoints.length < 2) {
      return 0;
    }

    let totalMeters = 0;

    for (let i = 1; i < pathPoints.length; i++) {
      const prevPoint = pathPoints[i - 1];
      const currPoint = pathPoints[i];

      // Skip points with invalid coordinates
      if (!prevPoint.latitude || !currPoint.latitude) {
        continue;
      }

      // Calculate distance between consecutive points
      const distance = this.getDistanceBetweenPoints(
        prevPoint.latitude,
        prevPoint.longitude,
        currPoint.latitude,
        currPoint.longitude
      );

      // Filter out unreasonable jumps (e.g., GPS errors)
      // 100 meters in 3 seconds = 120 km/h or 75 mph
      if (distance < 100) {
        totalMeters += distance;
      }
    }

    // Convert meters to miles
    return parseFloat((totalMeters / 1609.34).toFixed(2));
  }

  // Calculate distance between two points using Haversine formula
  getDistanceBetweenPoints(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  // Save a completed trip to storage
  async saveCompletedTrip(trip) {
    try {
      // Get existing trips
      const trips = await this.getAllTrips();

      // Add the new trip
      trips.push(trip);

      // Save updated trips
      await AsyncStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(trips));

      return true;
    } catch (error) {
      console.error('Failed to save completed trip:', error);
      return false;
    }
  }

  // Get the current in-progress trip
  async getCurrentTrip() {
    try {
      const tripJson = await AsyncStorage.getItem(CURRENT_TRIP_KEY);

      if (tripJson) {
        return JSON.parse(tripJson);
      }

      return null;
    } catch (error) {
      console.error('Failed to get current trip:', error);
      return null;
    }
  }

  // Get all saved trips
  async getAllTrips() {
    try {
      const tripsJson = await AsyncStorage.getItem(TRIPS_STORAGE_KEY);

      if (tripsJson) {
        return JSON.parse(tripsJson);
      }

      return [];
    } catch (error) {
      console.error('Failed to get trips:', error);
      return [];
    }
  }

  // Get trips within a date range
  async getTripsInRange(startDate, endDate) {
    try {
      const allTrips = await this.getAllTrips();

      // Convert dates to timestamps for comparison
      const startTimestamp = new Date(startDate).getTime();
      const endTimestamp = new Date(endDate).getTime();

      // Filter trips within range
      return allTrips.filter(trip => {
        const tripStartTime = new Date(trip.startTime).getTime();
        return tripStartTime >= startTimestamp && tripStartTime <= endTimestamp;
      });
    } catch (error) {
      console.error('Failed to get trips in range:', error);
      return [];
    }
  }

  // Get trips for a specific date
  async getTripsForDate(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    try {
      const allTrips = await this.getAllTrips();

      return allTrips.filter(trip =>
        trip.year === year && trip.month === month && trip.day === day
      );
    } catch (error) {
      console.error('Failed to get trips for date:', error);
      return [];
    }
  }

  // Get trips for a specific month
  async getTripsForMonth(year, month) {
    try {
      const allTrips = await this.getAllTrips();

      return allTrips.filter(trip =>
        trip.year === year && trip.month === month
      );
    } catch (error) {
      console.error('Failed to get trips for month:', error);
      return [];
    }
  }

  // Get trips for a specific week
  async getTripsForWeek(year, weekNumber) {
    try {
      const allTrips = await this.getAllTrips();

      return allTrips.filter(trip =>
        trip.year === year && trip.weekNumber === weekNumber
      );
    } catch (error) {
      console.error('Failed to get trips for week:', error);
      return [];
    }
  }

  // Delete a specific trip
  async deleteTrip(tripId) {
    try {
      const trips = await this.getAllTrips();

      // Filter out the trip to delete
      const updatedTrips = trips.filter(trip => trip.id !== tripId);

      // Save updated trips
      await AsyncStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(updatedTrips));

      return true;
    } catch (error) {
      console.error('Failed to delete trip:', error);
      return false;
    }
  }

  // Delete all trips (useful for testing/reset)
  async deleteAllTrips() {
    try {
      await AsyncStorage.removeItem(TRIPS_STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Failed to delete all trips:', error);
      return false;
    }
  }

  // Get total miles for a time period
  async getTotalMiles(startDate, endDate) {
    try {
      const trips = await this.getTripsInRange(startDate, endDate);

      const totalMiles = trips.reduce((sum, trip) => sum + trip.distanceMiles, 0);

      return parseFloat(totalMiles.toFixed(2));
    } catch (error) {
      console.error('Failed to calculate total miles:', error);
      return 0;
    }
  }

  // Get total cost for a time period
  async getTotalCost(startDate, endDate) {
    try {
      const trips = await this.getTripsInRange(startDate, endDate);

      const totalCost = trips.reduce((sum, trip) => sum + trip.cost, 0);

      return parseFloat(totalCost.toFixed(2));
    } catch (error) {
      console.error('Failed to calculate total cost:', error);
      return 0;
    }
  }

  // Get summary stats for a month
  async getMonthSummary(year, month) {
    try {
      const trips = await this.getTripsForMonth(year, month);

      // Calculate monthly stats
      const totalMiles = trips.reduce((sum, trip) => sum + trip.distanceMiles, 0);
      const totalCost = trips.reduce((sum, trip) => sum + trip.cost, 0);
      const totalTrips = trips.length;
      const totalDurationMinutes = trips.reduce((sum, trip) => sum + trip.durationMinutes, 0);

      // Calculate daily breakdowns
      const dailyData = {};
      trips.forEach(trip => {
        const day = trip.day;

        if (!dailyData[day]) {
          dailyData[day] = {
            miles: 0,
            cost: 0,
            tripCount: 0
          };
        }

        dailyData[day].miles += trip.distanceMiles;
        dailyData[day].cost += trip.cost;
        dailyData[day].tripCount += 1;
      });

      return {
        year,
        month,
        totalMiles: parseFloat(totalMiles.toFixed(2)),
        totalCost: parseFloat(totalCost.toFixed(2)),
        totalTrips,
        totalDurationMinutes,
        dailyData,
        trips,
        averageMilesPerTrip: totalTrips > 0 ? parseFloat((totalMiles / totalTrips).toFixed(2)) : 0,
        averageCostPerTrip: totalTrips > 0 ? parseFloat((totalCost / totalTrips).toFixed(2)) : 0
      };
    } catch (error) {
      console.error('Failed to get month summary:', error);
      return null;
    }
  }
}
