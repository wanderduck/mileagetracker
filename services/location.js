// services/location.js
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Background task name
const LOCATION_TRACKING_TASK = 'background-location-tracking';

// Storage keys
const CURRENT_TRIP_KEY = 'current_trip';
const TRIPS_STORAGE_KEY = 'saved_trips';

export default class LocationService {
  constructor() {
    this.isTracking = false;
    this.currentTrip = null;
    this.setupBackgroundTask();
  }

  // Set up the background location task
  setupBackgroundTask() {
    // Define the background task
    TaskManager.defineTask(LOCATION_TRACKING_TASK, async ({ data, error }) => {
      if (error) {
        console.error('Location tracking error:', error);
        return;
      }

      if (data) {
        // Get location data
        const { locations } = data;

        if (locations && locations.length > 0) {
          // Get current trip from storage
          try {
            const tripJson = await AsyncStorage.getItem(CURRENT_TRIP_KEY);
            if (tripJson) {
              const trip = JSON.parse(tripJson);

              // Add new locations to the trip
              for (const location of locations) {
                const locationData = {
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                  timestamp: location.timestamp,
                  accuracy: location.coords.accuracy,
                  speed: location.coords.speed || 0,
                };

                trip.locations.push(locationData);
              }

              // Update trip in storage
              await AsyncStorage.setItem(CURRENT_TRIP_KEY, JSON.stringify(trip));
            }
          } catch (error) {
            console.error('Error updating trip data:', error);
          }
        }
      }
    });
  }

  // Start location tracking
  async startTracking() {
    try {
      if (this.isTracking) return true;

      // Request location permissions
      const foregroundPermission = await Location.requestForegroundPermissionsAsync();
      const backgroundPermission = await Location.requestBackgroundPermissionsAsync();

      if (!foregroundPermission.granted || !backgroundPermission.granted) {
        throw new Error('Location permissions not granted');
      }

      // Create a new trip
      const newTrip = {
        startTime: new Date().toISOString(),
        endTime: null,
        locations: [],
        distanceMiles: 0,
        cost: 0,
      };

      // Save the new trip as the current trip
      await AsyncStorage.setItem(CURRENT_TRIP_KEY, JSON.stringify(newTrip));
      this.currentTrip = newTrip;

      // Start location updates
      await Location.startLocationUpdatesAsync(LOCATION_TRACKING_TASK, {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10, // Update every 10 meters
        timeInterval: 3000,   // Update every 3 seconds
        foregroundService: {
          notificationTitle: "Tracking Miles",
          notificationBody: "Recording your trip distance",
        },
        // Allow background tracking
        showsBackgroundLocationIndicator: true,
        activityType: Location.ActivityType.AutomotiveNavigation,
      });

      this.isTracking = true;
      return true;
    } catch (error) {
      console.error('Failed to start tracking:', error);
      return false;
    }
  }

  // Stop location tracking
  async stopTracking() {
    try {
      if (!this.isTracking) return true;

      // Stop location updates
      await Location.stopLocationUpdatesAsync(LOCATION_TRACKING_TASK);

      // Finalize the current trip
      const tripJson = await AsyncStorage.getItem(CURRENT_TRIP_KEY);
      if (tripJson) {
        const trip = JSON.parse(tripJson);
        trip.endTime = new Date().toISOString();

        // Calculate distance and cost
        trip.distanceMiles = this.calculateTripDistance(trip.locations);
        trip.cost = trip.distanceMiles * 0.40; // $0.40 per mile

        // Save the completed trip
        await this.saveCompletedTrip(trip);

        // Clear the current trip
        await AsyncStorage.removeItem(CURRENT_TRIP_KEY);
        this.currentTrip = null;
      }

      this.isTracking = false;
      return true;
    } catch (error) {
      console.error('Failed to stop tracking:', error);
      return false;
    }
  }

  // Calculate distance of trip in miles
  calculateTripDistance(locations) {
    if (!locations || locations.length < 2) return 0;

    let totalMeters = 0;

    for (let i = 1; i < locations.length; i++) {
      const prevLoc = locations[i - 1];
      const currLoc = locations[i];

      const distance = this.getDistanceBetweenPoints(
        prevLoc.latitude,
        prevLoc.longitude,
        currLoc.latitude,
        currLoc.longitude
      );

      totalMeters += distance;
    }

    // Convert meters to miles
    return totalMeters / 1609.34;
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

  // Save completed trip to storage
  async saveCompletedTrip(trip) {
    try {
      // Get existing trips
      const tripsJson = await AsyncStorage.getItem(TRIPS_STORAGE_KEY);
      let trips = [];

      if (tripsJson) {
        trips = JSON.parse(tripsJson);
      }

      // Add new trip
      trips.push(trip);

      // Save updated trips
      await AsyncStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(trips));

      return true;
    } catch (error) {
      console.error('Failed to save completed trip:', error);
      return false;
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
}