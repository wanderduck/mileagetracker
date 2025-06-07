// services/locationTracker.js
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import TripStorageService from './tripStorage';

// Background task name
const LOCATION_TRACKING_TASK = 'background-location-tracking';

// Create a global instance of the trip storage service
const tripStorage = new TripStorageService();

// Define the background location task
TaskManager.defineTask(LOCATION_TRACKING_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Location tracking error:', error);
    return;
  }

  if (data) {
    const { locations } = data;

    if (locations && locations.length > 0) {
      // Get the most recent location
      const mostRecentLocation = locations[locations.length - 1];

      // Add to current trip
      await tripStorage.addLocationToTrip(mostRecentLocation);
    }
  }
});

export default class LocationTrackerService {
  constructor() {
    this.isTracking = false;
    this.tripStorage = tripStorage;
    this.currentTrip = null;
  }

  // Check if tracking is active
  async isTrackingActive() {
    try {
      return await Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING_TASK);
    } catch (error) {
      return false;
    }
  }

  // Start location tracking
  async startTracking() {
    try {
      // Check if we already have permissions
      const foregroundPermission = await Location.getForegroundPermissionsAsync();
      const backgroundPermission = await Location.getBackgroundPermissionsAsync();

      // Request permissions if needed
      if (!foregroundPermission.granted) {
        const { granted } = await Location.requestForegroundPermissionsAsync();
        if (!granted) {
          throw new Error('Foreground location permission denied');
        }
      }

      if (!backgroundPermission.granted) {
        const { granted } = await Location.requestBackgroundPermissionsAsync();
        if (!granted) {
          throw new Error('Background location permission denied');
        }
      }

      // Get current location to start the trip
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      // Start a new trip in storage
      this.currentTrip = await this.tripStorage.startTrip({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        address: null // Could geocode this later
      });

      if (!this.currentTrip) {
        throw new Error('Failed to initialize trip data');
      }

      // Start location updates
      await Location.startLocationUpdatesAsync(LOCATION_TRACKING_TASK, {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 10, // Update every 10 meters
        timeInterval: 3000,   // Update every 3 seconds
        foregroundService: {
          notificationTitle: "Tracking Miles",
          notificationBody: "Recording your mileage for cost calculation",
        },
        // Allow background tracking
        showsBackgroundLocationIndicator: true,
        activityType: Location.ActivityType.AutomotiveNavigation,
      });

      this.isTracking = true;
      console.log('Tracking started with trip ID:', this.currentTrip.id);

      return true;
    } catch (error) {
      console.error('Failed to start tracking:', error);
      return false;
    }
  }

  // Stop location tracking
  async stopTracking() {
    try {
      // Check if tracking is active
      const isActive = await this.isTrackingActive();

      if (isActive) {
        // Get final location
        const finalLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });

        // End the trip in storage
        const completedTrip = await this.tripStorage.endTrip(finalLocation);

        if (completedTrip) {
          console.log('Trip completed:', completedTrip.id);
          console.log(`Distance: ${completedTrip.distanceMiles} miles, Cost: $${completedTrip.cost.toFixed(2)}`);
        }

        // Stop location updates
        await Location.stopLocationUpdatesAsync(LOCATION_TRACKING_TASK);
      }

      this.isTracking = false;
      this.currentTrip = null;

      return true;
    } catch (error) {
      console.error('Failed to stop tracking:', error);
      return false;
    }
  }

  // Get current trip info
  async getCurrentTripInfo() {
    try {
      return await this.tripStorage.getCurrentTrip();
    } catch (error) {
      console.error('Failed to get current trip info:', error);
      return null;
    }
  }

  // Get trip storage service (for accessing trip data and statistics)
  getTripStorage() {
    return this.tripStorage;
  }
}