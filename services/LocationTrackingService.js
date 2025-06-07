// LocationTrackingService.js - Production GPS Tracking Service with Singleton Pattern
// This service handles sophisticated location tracking with quality filtering
// and movement analysis for automatic trip detection systems

import * as Location from 'expo-location';
import { Alert } from 'react-native';

/**
 * LocationTrackingService
 *
 * This class provides sophisticated GPS location tracking capabilities designed
 * specifically for mileage tracking applications. Now implemented as a singleton
 * to allow test screens and other components to access the same instance.
 */
class LocationTrackingService {
  constructor() {
    // Tracking state management
    this.isActive = false;
    this.subscription = null;
    this.lastKnownLocation = null;
    this.locationHistory = [];

    // Quality control parameters
    this.minimumAccuracy = 50; // meters - ignore readings with worse accuracy
    this.minimumMovementDistance = 5; // meters - threshold for detecting actual movement
    this.maximumLocationAge = 30000; // 30 seconds - ignore stale readings

    // Callback handlers for location updates (backward compatibility)
    this.onLocationUpdate = null;
    this.onMovementDetected = null;
    this.onLocationError = null;

    // Event listener arrays for supporting multiple listeners
    this.locationUpdateListeners = [];
    this.trackingStateListeners = [];
    this.movementDetectedListeners = [];
    this.locationErrorListeners = [];

    // Initialize service state
    this.initializeService();
  }

  /**
   * Singleton instance management
   */
  static instance = null;

  static getInstance() {
    if (!LocationTrackingService.instance) {
      LocationTrackingService.instance = new LocationTrackingService();
    }
    return LocationTrackingService.instance;
  }

  /**
   * Static listener management methods
   * These allow components to register listeners without having the instance
   */
  static addLocationUpdateListener(listener) {
    const instance = LocationTrackingService.getInstance();
    if (typeof listener === 'function' && !instance.locationUpdateListeners.includes(listener)) {
      instance.locationUpdateListeners.push(listener);
    }
  }

  static removeLocationUpdateListener(listener) {
    const instance = LocationTrackingService.getInstance();
    const index = instance.locationUpdateListeners.indexOf(listener);
    if (index > -1) {
      instance.locationUpdateListeners.splice(index, 1);
    }
  }

  static addTrackingStateListener(listener) {
    const instance = LocationTrackingService.getInstance();
    if (typeof listener === 'function' && !instance.trackingStateListeners.includes(listener)) {
      instance.trackingStateListeners.push(listener);
    }
  }

  static removeTrackingStateListener(listener) {
    const instance = LocationTrackingService.getInstance();
    const index = instance.trackingStateListeners.indexOf(listener);
    if (index > -1) {
      instance.trackingStateListeners.splice(index, 1);
    }
  }

  static getTrackingStatus() {
    const instance = LocationTrackingService.getInstance();
    return instance.getServiceStatus();
  }

  /**
   * Initialize Service
   */
  async initializeService() {
    try {
      // Check if location services are enabled on the device
      const serviceEnabled = await Location.hasServicesEnabledAsync();
      if (!serviceEnabled) {
        console.warn('Location services are disabled on this device');
      }

      console.log('LocationTrackingService initialized with quality filtering enabled');
    } catch (error) {
      console.error('Error initializing LocationTrackingService:', error);
    }
  }

  /**
   * Start Location Tracking
   */
  async startTracking() {
    try {
      console.log('Starting sophisticated location tracking...');

      // Check and request location permissions
      const permissionGranted = await this.ensureLocationPermissions();
      if (!permissionGranted) {
        console.error('Location permissions not granted');
        return false;
      }

      // Configure tracking options for optimal accuracy and battery balance
      const trackingOptions = {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
        mayShowUserSettingsDialog: true,
      };

      // Start location subscription with quality filtering
      this.subscription = await Location.watchPositionAsync(
        trackingOptions,
        (location) => this.handleLocationUpdate(location)
      );

      this.isActive = true;
      console.log('Location tracking started successfully with quality filtering');

      // Notify all tracking state listeners
      this.notifyTrackingStateListeners(true);

      return true;

    } catch (error) {
      console.error('Failed to start location tracking:', error);
      this.handleLocationError(error);
      return false;
    }
  }

  /**
   * Stop Location Tracking
   */
  async stopTracking() {
    try {
      console.log('Stopping location tracking...');

      if (this.subscription) {
        this.subscription.remove();
        this.subscription = null;
      }

      this.isActive = false;
      this.lastKnownLocation = null;
      this.locationHistory = [];

      console.log('Location tracking stopped successfully');

      // Notify all tracking state listeners
      this.notifyTrackingStateListeners(false);

      return true;

    } catch (error) {
      console.error('Error stopping location tracking:', error);
      return false;
    }
  }

  /**
   * Handle Location Update
   */
  handleLocationUpdate(rawLocation) {
    try {
      // Extract location data with quality metrics
      const locationData = {
        latitude: rawLocation.coords.latitude,
        longitude: rawLocation.coords.longitude,
        accuracy: rawLocation.coords.accuracy,
        altitude: rawLocation.coords.altitude,
        speed: rawLocation.coords.speed,
        heading: rawLocation.coords.heading,
        timestamp: rawLocation.timestamp,
        age: Date.now() - rawLocation.timestamp
      };

      // Apply quality filtering to reject poor readings
      if (!this.passesQualityFilter(locationData)) {
        console.log('Location update rejected by quality filter:', {
          accuracy: locationData.accuracy,
          age: locationData.age
        });
        return;
      }

      // Detect if this represents genuine movement vs. GPS drift
      const movementDetected = this.detectMovement(locationData);

      // Add movement data to location object
      if (movementDetected && this.lastKnownLocation) {
        locationData.movement = {
          distanceMeters: this.calculateDistance(
            this.lastKnownLocation.latitude,
            this.lastKnownLocation.longitude,
            locationData.latitude,
            locationData.longitude
          ),
          timeDeltaMs: locationData.timestamp - this.lastKnownLocation.timestamp,
          speedKmh: locationData.speed ? locationData.speed * 3.6 : 0,
          bearing: locationData.heading || 0,
          movementType: this.classifyMovement(locationData.speed)
        };
      }

      // Add to location history for movement analysis
      this.locationHistory.push(locationData);

      // Keep history manageable (last 50 points for analysis)
      if (this.locationHistory.length > 50) {
        this.locationHistory.shift();
      }

      // Update last known position
      this.lastKnownLocation = locationData;

      // Notify all listeners of the high-quality location update
      this.notifyLocationUpdateListeners(locationData);

      // Notify movement listeners if genuine movement was detected
      if (movementDetected) {
        this.notifyMovementDetectedListeners(locationData);
      }

      console.log('High-quality location update processed:', {
        lat: locationData.latitude.toFixed(6),
        lng: locationData.longitude.toFixed(6),
        accuracy: locationData.accuracy.toFixed(1),
        movement: movementDetected
      });

    } catch (error) {
      console.error('Error processing location update:', error);
      this.handleLocationError(error);
    }
  }

  /**
   * Notify all location update listeners
   */
  notifyLocationUpdateListeners(locationData) {
    // Call the direct callback if set (backward compatibility)
    if (this.onLocationUpdate) {
      this.onLocationUpdate(locationData);
    }

    // Call all registered listeners
    this.locationUpdateListeners.forEach(listener => {
      try {
        listener(locationData);
      } catch (error) {
        console.error('Error in location update listener:', error);
      }
    });
  }

  /**
   * Notify all tracking state listeners
   */
  notifyTrackingStateListeners(isTracking) {
    this.trackingStateListeners.forEach(listener => {
      try {
        listener(isTracking);
      } catch (error) {
        console.error('Error in tracking state listener:', error);
      }
    });
  }

  /**
   * Notify all movement detected listeners
   */
  notifyMovementDetectedListeners(locationData) {
    // Call the direct callback if set (backward compatibility)
    if (this.onMovementDetected) {
      this.onMovementDetected(locationData);
    }

    // Call all registered listeners
    this.movementDetectedListeners.forEach(listener => {
      try {
        listener(locationData);
      } catch (error) {
        console.error('Error in movement detected listener:', error);
      }
    });
  }

  /**
   * Quality Filter Implementation
   */
  passesQualityFilter(locationData) {
    // Reject readings with poor accuracy
    if (locationData.accuracy > this.minimumAccuracy) {
      return false;
    }

    // Reject readings that are too old
    if (locationData.age > this.maximumLocationAge) {
      return false;
    }

    // Reject readings with obviously invalid coordinates
    if (Math.abs(locationData.latitude) > 90 || Math.abs(locationData.longitude) > 180) {
      return false;
    }

    // Reject readings that are identical to the previous reading
    if (this.lastKnownLocation) {
      const distance = this.calculateDistance(
        this.lastKnownLocation.latitude,
        this.lastKnownLocation.longitude,
        locationData.latitude,
        locationData.longitude
      );

      const timeDifference = locationData.timestamp - this.lastKnownLocation.timestamp;

      // If location is identical and time difference is small, likely a duplicate
      if (distance < 1 && timeDifference < 2000) {
        return false;
      }
    }

    return true;
  }

  /**
   * Movement Detection Algorithm
   */
  detectMovement(newLocation) {
    if (!this.lastKnownLocation) {
      return true; // First location update always counts as movement
    }

    // Calculate distance moved since last update
    const distanceMoved = this.calculateDistance(
      this.lastKnownLocation.latitude,
      this.lastKnownLocation.longitude,
      newLocation.latitude,
      newLocation.longitude
    );

    // Calculate time elapsed since last update
    const timeElapsed = newLocation.timestamp - this.lastKnownLocation.timestamp;
    const timeElapsedMinutes = timeElapsed / (1000 * 60);

    // Calculate apparent speed from distance and time
    const apparentSpeed = timeElapsedMinutes > 0 ? (distanceMoved / timeElapsedMinutes) * 60 : 0;

    // Consider multiple factors to determine if this represents genuine movement
    const significantDistance = distanceMoved >= this.minimumMovementDistance;
    const reasonableSpeed = apparentSpeed <= 200;
    const consistentMovement = this.isMovementConsistent(newLocation);

    return significantDistance && reasonableSpeed && consistentMovement;
  }

  /**
   * Movement Consistency Analysis
   */
  isMovementConsistent(newLocation) {
    if (this.locationHistory.length < 3) {
      return true;
    }

    // Analyze the last few location points to detect movement patterns
    const recentLocations = this.locationHistory.slice(-3);
    recentLocations.push(newLocation);

    // Calculate the total distance across recent points
    let totalDistance = 0;
    for (let i = 1; i < recentLocations.length; i++) {
      totalDistance += this.calculateDistance(
        recentLocations[i-1].latitude,
        recentLocations[i-1].longitude,
        recentLocations[i].latitude,
        recentLocations[i].longitude
      );
    }

    // Calculate the direct distance from start to end
    const directDistance = this.calculateDistance(
      recentLocations[0].latitude,
      recentLocations[0].longitude,
      recentLocations[recentLocations.length - 1].latitude,
      recentLocations[recentLocations.length - 1].longitude
    );

    // If the path distance is much longer than direct distance, movement is consistent
    const pathEfficiency = directDistance / totalDistance;

    return pathEfficiency > 0.3 || totalDistance > 50;
  }

  /**
   * Classify Movement Type
   */
  classifyMovement(speedMs) {
    if (!speedMs || speedMs < 0.5) return 'stationary';
    if (speedMs < 2) return 'walking';
    if (speedMs < 8) return 'running';
    return 'driving';
  }

  /**
   * Calculate Distance Between Coordinates
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.degreesToRadians(lat2 - lat1);
    const dLon = this.degreesToRadians(lon2 - lon1);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.degreesToRadians(lat1)) * Math.cos(this.degreesToRadians(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in meters
  }

  /**
   * Convert Degrees to Radians
   */
  degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Ensure Location Permissions
   */
  async ensureLocationPermissions() {
    try {
      // Check current permission status
      let { status } = await Location.getForegroundPermissionsAsync();

      if (status !== 'granted') {
        console.log('Requesting location permissions...');

        const permissionResponse = await Location.requestForegroundPermissionsAsync();
        status = permissionResponse.status;
      }

      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'This app needs location access to automatically track your trips. Please enable location permissions in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Location.enableNetworkProviderAsync() }
          ]
        );
        return false;
      }

      // For automatic trip detection, also request background permissions
      let backgroundStatus = await Location.getBackgroundPermissionsAsync();

      if (backgroundStatus.status !== 'granted') {
        console.log('Requesting background location permissions...');

        const backgroundResponse = await Location.requestBackgroundPermissionsAsync();
        backgroundStatus = backgroundResponse;
      }

      if (backgroundStatus.status !== 'granted') {
        console.warn('Background location permission not granted - automatic detection may be limited');
      }

      console.log('Location permissions verified successfully');
      return true;

    } catch (error) {
      console.error('Error checking location permissions:', error);
      return false;
    }
  }

  /**
   * Handle Location Errors
   */
  handleLocationError(error) {
    console.error('Location service error:', error);

    if (this.onLocationError) {
      this.onLocationError(error);
    }

    // Notify error listeners
    this.locationErrorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error in location error listener:', listenerError);
      }
    });

    // Provide user-friendly error guidance based on error type
    if (error.code === 'UNAVAILABLE') {
      Alert.alert(
        'Location Unavailable',
        'GPS signal is currently unavailable. Please ensure you are not in a building or underground area.'
      );
    } else if (error.code === 'TIMEOUT') {
      Alert.alert(
        'Location Timeout',
        'Unable to get your location. Please check that location services are enabled and try again.'
      );
    } else {
      Alert.alert(
        'Location Error',
        'An error occurred while tracking your location. Please restart the app if the problem persists.'
      );
    }
  }

  /**
   * Get Current Location
   */
  async getCurrentLocation() {
    try {
      const permissionGranted = await this.ensureLocationPermissions();
      if (!permissionGranted) {
        throw new Error('Location permissions not available');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 10000
      });

      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
        age: Date.now() - location.timestamp
      };

      if (this.passesQualityFilter(locationData)) {
        return locationData;
      } else {
        throw new Error('Current location does not meet quality standards');
      }

    } catch (error) {
      console.error('Error getting current location:', error);
      throw error;
    }
  }

  /**
   * Get Service Status
   */
  getServiceStatus() {
    return {
      isTracking: this.isActive,
      hasSubscription: this.subscription !== null,
      lastLocationTime: this.lastKnownLocation ? new Date(this.lastKnownLocation.timestamp) : null,
      historyCount: this.locationHistory.length,
      configuration: {
        accuracy: 'High',
        timeInterval: 5000,
        distanceInterval: 10
      },
      qualitySettings: {
        minimumAccuracy: this.minimumAccuracy,
        minimumMovementDistance: this.minimumMovementDistance,
        maximumLocationAge: this.maximumLocationAge
      }
    };
  }

  /**
   * Check if Tracking is Active
   */
  isTracking() {
    return this.isActive;
  }

  /**
   * Get Location History
   */
  getLocationHistory() {
    return [...this.locationHistory];
  }

  /**
   * Clear Location History
   */
  clearLocationHistory() {
    this.locationHistory = [];
    this.lastKnownLocation = null;
    console.log('Location history cleared');
  }
}

// Export the singleton instance getter as default
export default LocationTrackingService;

// Also export the class itself for type checking if needed
export { LocationTrackingService };