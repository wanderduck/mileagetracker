// IntegratedTripManager.js - Enhanced Version with Proper Service Coordination
// IntegratedTripManager.js - Updated to use singleton instances
// Only showing the parts that need to change

import LocationTrackingService from './LocationTrackingService';
import TripDetectionEngine from './TripDetectionEngine';

export default class IntegratedTripManager {
  constructor(existingLocationTracker) {
    // Store reference to your existing LocationTrackerService
    this.existingTracker = existingLocationTracker;

    // UPDATED: Use singleton instances for both services
    this.locationService = LocationTrackingService.getInstance();
    this.tripDetectionEngine = TripDetectionEngine.getInstance();

    // Track integration state with more detail
    this.isIntegratedTracking = false;
    this.servicesReady = {
      locationService: false,
      tripDetection: false
    };

    // Track current trip data
    this.currentTripStartTime = null;
    this.accumulatedTripData = [];
    this.detectedTripBoundaries = null;

    // Set up event handlers to bridge between systems
    this.setupEventHandlers();
  }

  /**
   * Setup Event Handlers with enhanced error handling
   * UPDATED to work with singleton instances
   */
  setupEventHandlers() {
    // IMPORTANT: Clear any existing callbacks to prevent conflicts
    // This ensures this integration doesn't interfere with other uses
    this.locationService.onLocationUpdate = null;
    this.locationService.onLocationError = null;
    this.tripDetectionEngine.onTripStart = null;
    this.tripDetectionEngine.onTripEnd = null;
    this.tripDetectionEngine.onTripUpdate = null;
    this.tripDetectionEngine.onStopDetected = null;

    // Set up new callbacks for this integration
    this.locationService.onLocationUpdate = (locationData) => {
      this.handleLocationUpdate(locationData);
    };

    // Listen for location errors
    this.locationService.onLocationError = (error) => {
      console.error('Location service error:', error);
      this.handleServiceError('location', error);
    };

    // Listen for trip events from our detection engine
    this.tripDetectionEngine.onTripStart = (tripData) => {
      this.handleAutomaticTripStart(tripData);
    };

    this.tripDetectionEngine.onTripEnd = (tripData) => {
      this.handleAutomaticTripEnd(tripData);
    };

    this.tripDetectionEngine.onTripUpdate = (tripData) => {
      this.handleTripUpdate(tripData);
    };

    this.tripDetectionEngine.onStopDetected = (stopData) => {
      this.handleStopDetected(stopData);
    };
  }


  /**
   * Start Integrated Tracking with fail-fast behavior
   * All services must start successfully or tracking fails completely
   */
  async startIntegratedTracking() {
    try {
      console.log('Starting integrated trip tracking with automatic detection');

      // Reset service ready states
      this.servicesReady = {
        locationService: false,
        tripDetection: false
      };

      // Start location tracking service first (it's the foundation)
      console.log('Starting location tracking service...');
      const locationSuccess = await this.locationService.startTracking();

      if (!locationSuccess) {
        throw new Error('Failed to start location tracking service');
      }

      this.servicesReady.locationService = true;
      console.log('Location tracking service started successfully');

      // Start trip detection engine
      console.log('Starting trip detection engine...');
      const detectionSuccess = await this.tripDetectionEngine.startDetection();

      if (!detectionSuccess) {
        // If detection fails, stop location service before throwing
        await this.locationService.stopTracking();
        this.servicesReady.locationService = false;
        throw new Error('Failed to start trip detection engine');
      }

      this.servicesReady.tripDetection = true;
      console.log('Trip detection engine started successfully');

      // Both services are running - initialize trip tracking
      this.isIntegratedTracking = true;
      this.currentTripStartTime = new Date();
      this.accumulatedTripData = [];
      this.detectedTripBoundaries = null;

      console.log('Integrated tracking system activated successfully');
      return true;

    } catch (error) {
      console.error('Failed to start integrated tracking:', error);

      // Clean up any partially started services
      await this.emergencyStopAllServices();

      return false;
    }
  }

  /**
   * Stop Integrated Tracking with proper cleanup
   */
  async stopIntegratedTracking() {
    try {
      console.log('Stopping integrated trip tracking and processing trip data');

      if (!this.isIntegratedTracking) {
        console.log('Integrated tracking was not active');
        return true;
      }

      // Mark that we're stopping to prevent new data processing
      this.isIntegratedTracking = false;

      // Stop detection engine first (it depends on location data)
      if (this.servicesReady.tripDetection) {
        await this.tripDetectionEngine.stopDetection();
        this.servicesReady.tripDetection = false;
      }

      // Stop location service
      if (this.servicesReady.locationService) {
        await this.locationService.stopTracking();
        this.servicesReady.locationService = false;
      }

      // Process the complete trip if we have accumulated data
      if (this.accumulatedTripData.length > 0) {
        await this.processFinalTripData();
      }

      // Reset tracking state
      this.currentTripStartTime = null;
      this.accumulatedTripData = [];
      this.detectedTripBoundaries = null;

      console.log('Integrated tracking stopped successfully');
      return true;

    } catch (error) {
      console.error('Error stopping integrated tracking:', error);

      // Force stop all services
      await this.emergencyStopAllServices();

      return false;
    }
  }

  /**
   * Emergency stop for all services
   * Used when normal shutdown fails or errors occur
   */
  async emergencyStopAllServices() {
    console.log('Performing emergency stop of all services');

    try {
      if (this.locationService && this.locationService.isTracking()) {
        await this.locationService.stopTracking();
      }
    } catch (error) {
      console.error('Error stopping location service:', error);
    }

    try {
      if (this.tripDetectionEngine && this.tripDetectionEngine.isActive()) {
        await this.tripDetectionEngine.stopDetection();
      }
    } catch (error) {
      console.error('Error stopping trip detection:', error);
    }

    // Reset all states
    this.isIntegratedTracking = false;
    this.servicesReady = {
      locationService: false,
      tripDetection: false
    };
    this.currentTripStartTime = null;
    this.accumulatedTripData = [];
    this.detectedTripBoundaries = null;
  }

  /**
   * Handle service errors
   */
  handleServiceError(service, error) {
    console.error(`Service error in ${service}:`, error);

    // If a critical service fails during tracking, stop everything
    if (this.isIntegratedTracking) {
      console.log('Critical service failure during tracking - stopping all services');
      this.stopIntegratedTracking();
    }
  }

  /**
   * Handle Location Updates with validation
   */
  handleLocationUpdate(locationData) {
    if (!this.isIntegratedTracking) return;

    // Validate that both services are still running
    if (!this.servicesReady.locationService || !this.servicesReady.tripDetection) {
      console.warn('Location update received but services not ready');
      return;
    }

    // Feed location data to trip detection engine
    this.tripDetectionEngine.processLocationUpdate(locationData);

    // Accumulate location data with timestamp
    this.accumulatedTripData.push({
      ...locationData,
      timestamp: new Date().toISOString()
    });

    // Provide real-time updates to existing system
    this.notifyExistingSystemOfProgress();
  }

  /**
   * Handle Stop Detection
   * Enhanced to track stop events for better trip analysis
   */
  handleStopDetected(stopData) {
    console.log('Stop detected during trip:', stopData);

    // Store stop information for trip analysis
    if (this.accumulatedTripData.length > 0) {
      const lastDataPoint = this.accumulatedTripData[this.accumulatedTripData.length - 1];
      lastDataPoint.stopDetected = {
        duration: stopData.duration,
        location: stopData.location
      };
    }
  }

  /**
   * Handle Automatic Trip Start
   */
  handleAutomaticTripStart(tripData) {
    console.log('Trip detection engine confirmed trip start:', tripData);

    if (this.isIntegratedTracking) {
      // Refine trip start time based on AI detection
      this.currentTripStartTime = new Date(tripData.startTime);

      // Store detected boundaries for later use
      if (!this.detectedTripBoundaries) {
        this.detectedTripBoundaries = {};
      }
      this.detectedTripBoundaries.detectedStart = tripData;

      console.log('Refined trip start time based on movement analysis');
    }
  }

  /**
   * Handle Automatic Trip End
   */
  handleAutomaticTripEnd(tripData) {
    console.log('Trip detection engine identified trip end:', tripData);

    // Store the automatically detected trip end information
    if (this.detectedTripBoundaries) {
      this.detectedTripBoundaries.detectedEnd = tripData;
    }
  }

  /**
   * Handle Trip Updates
   */
  handleTripUpdate(tripData) {
    if (!this.isIntegratedTracking) return;

    // Log trip progress for debugging
    console.log('Trip progress update:', {
      estimatedDistance: tripData.estimatedDistance,
      duration: tripData.duration,
      averageSpeed: tripData.averageSpeed,
      confidence: tripData.confidence
    });
  }

  /**
   * Process Final Trip Data with enhanced automatic detection data
   */
  async processFinalTripData() {
    try {
      console.log('Processing final trip data with automatic analysis');

      // Use trip detection engine to analyze the complete trip
      const tripAnalysis = await this.tripDetectionEngine.analyzeTripData(
        this.accumulatedTripData,
        this.currentTripStartTime,
        new Date()
      );

      // Create enhanced trip record with all data
      const integatedTripRecord = this.createEnhancedTripRecord(tripAnalysis);

      // Save the trip using existing LocationTrackerService
      const success = await this.saveToExistingSystem(integatedTripRecord);

      if (success) {
        console.log('Trip successfully integrated into existing system with enhanced data');
        return integatedTripRecord;
      } else {
        throw new Error('Failed to save trip to existing system');
      }

    } catch (error) {
      console.error('Error processing final trip data:', error);

      // Attempt to save basic trip data as fallback
      await this.saveBasicTripData();

      throw error;
    }
  }

  /**
   * Save basic trip data as fallback
   */
  async saveBasicTripData() {
    try {
      console.log('Attempting to save basic trip data as fallback');

      if (this.accumulatedTripData.length < 2) {
        console.log('Insufficient data for basic trip');
        return;
      }

      const firstLocation = this.accumulatedTripData[0];
      const lastLocation = this.accumulatedTripData[this.accumulatedTripData.length - 1];
      const distance = this.calculateCurrentDistance();

      const basicTrip = {
        id: `trip_${Date.now()}`,
        startTime: this.currentTripStartTime.toISOString(),
        endTime: new Date().toISOString(),
        startLatitude: firstLocation.latitude,
        startLongitude: firstLocation.longitude,
        endLatitude: lastLocation.latitude,
        endLongitude: lastLocation.longitude,
        distanceMiles: parseFloat(distance.toFixed(2)),
        duration: Math.round((Date.now() - this.currentTripStartTime.getTime()) / 1000),
        cost: this.calculateTripCost(distance),
        source: 'integrated_basic_fallback'
      };

      const storage = this.existingTracker.getTripStorage();
      await storage.saveTrip(basicTrip);

      console.log('Basic trip data saved as fallback');

    } catch (error) {
      console.error('Failed to save basic trip data:', error);
    }
  }

  /**
   * Create Enhanced Trip Record with all automatic detection data
   */
  createEnhancedTripRecord(tripAnalysis) {
    // Extract key locations
    const startLocation = tripAnalysis.route[0];
    const endLocation = tripAnalysis.route[tripAnalysis.route.length - 1];

    // Create coordinates array for the trip (compatible with TripHistoryScreen)
    const coordinates = tripAnalysis.route.map(point => ({
      latitude: point.latitude,
      longitude: point.longitude,
      timestamp: point.timestamp
    }));

    // Build comprehensive trip record
    const tripRecord = {
      // Basic trip identification
      id: `trip_${Date.now()}`,
      startTime: this.currentTripStartTime.toISOString(),
      endTime: new Date().toISOString(),

      // Location information
      startLatitude: startLocation.latitude,
      startLongitude: startLocation.longitude,
      endLatitude: endLocation.latitude,
      endLongitude: endLocation.longitude,

      // Core trip metrics
      distanceMiles: parseFloat(tripAnalysis.totalDistance.toFixed(2)),
      duration: Math.round(tripAnalysis.duration / 1000), // seconds
      durationMinutes: Math.round(tripAnalysis.duration / 60000), // minutes
      averageSpeed: parseFloat(tripAnalysis.averageSpeed.toFixed(1)),
      avgSpeedMph: parseFloat((tripAnalysis.averageSpeed * 0.621371).toFixed(1)), // km/h to mph

      // Route data for visualization
      route: tripAnalysis.route,
      coordinates: coordinates, // For TripHistoryScreen compatibility
      path: coordinates, // Alternative format some screens might use

      // Automatic detection enhancements
      qualityScore: tripAnalysis.qualityScore,
      detectionConfidence: tripAnalysis.confidence,
      movementPattern: tripAnalysis.movementPattern,

      // Cost calculation
      cost: this.calculateTripCost(tripAnalysis.totalDistance),

      // Metadata
      source: 'integrated_automatic_detection',
      analysisVersion: '1.0',

      // Detected boundaries if available
      detectedBoundaries: this.detectedTripBoundaries || null,

      // Date components for querying (matching tripStorage.js format)
      day: this.currentTripStartTime.getDate(),
      month: this.currentTripStartTime.getMonth() + 1,
      year: this.currentTripStartTime.getFullYear(),
      weekday: this.currentTripStartTime.getDay(),
      weekNumber: this.getWeekNumber(this.currentTripStartTime)
    };

    return tripRecord;
  }

  /**
   * Calculate week number for date
   */
  getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  /**
   * Calculate Trip Cost
   */
  calculateTripCost(distanceKm) {
    // Convert km to miles and apply rate
    const distanceMiles = distanceKm * 0.621371;
    const mileageRate = 0.40; // $0.40 per mile
    return parseFloat((distanceMiles * mileageRate).toFixed(2));
  }

  /**
   * Save to Existing System
   */
  async saveToExistingSystem(tripRecord) {
    try {
      const storage = this.existingTracker.getTripStorage();

      // The storage service expects certain fields, ensure they exist
      if (!tripRecord.startLocation) {
        tripRecord.startLocation = {
          latitude: tripRecord.startLatitude,
          longitude: tripRecord.startLongitude,
          address: null
        };
      }

      if (!tripRecord.endLocation) {
        tripRecord.endLocation = {
          latitude: tripRecord.endLatitude,
          longitude: tripRecord.endLongitude,
          address: null
        };
      }

      // Save using the proper method
      await storage.saveCompletedTrip(tripRecord);

      console.log('Enhanced trip saved to existing system:', tripRecord.id);
      return true;

    } catch (error) {
      console.error('Failed to save trip to existing system:', error);
      return false;
    }
  }

  /**
   * Notify Existing System of Progress
   */
  notifyExistingSystemOfProgress() {
    if (this.accumulatedTripData.length > 1) {
      const currentDistance = this.calculateCurrentDistance();
      const currentDuration = Date.now() - this.currentTripStartTime.getTime();

      // Could emit events or update UI here
      console.log('Current trip progress:', {
        distance: currentDistance.toFixed(2),
        duration: Math.round(currentDuration / 1000),
        points: this.accumulatedTripData.length
      });
    }
  }

  /**
   * Calculate Current Distance
   */
  calculateCurrentDistance() {
    if (this.accumulatedTripData.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 1; i < this.accumulatedTripData.length; i++) {
      const prev = this.accumulatedTripData[i - 1];
      const curr = this.accumulatedTripData[i];
      totalDistance += this.locationService.calculateDistance(
        prev.latitude, prev.longitude,
        curr.latitude, curr.longitude
      );
    }
    return totalDistance / 1000; // Convert to kilometers
  }

  /**
   * Get Integration Status
   */
  getIntegrationStatus() {
    return {
      isTracking: this.isIntegratedTracking,
      trackingStartTime: this.currentTripStartTime,
      locationPointsCollected: this.accumulatedTripData.length,
      currentDistance: this.calculateCurrentDistance(),
      servicesActive: {
        locationTracking: this.servicesReady.locationService,
        tripDetection: this.servicesReady.tripDetection
      },
      lastError: this.lastError || null
    };
  }

  /**
   * Get Enhanced Trip Statistics
   */
  async getEnhancedTripStatistics() {
    try {
      const storage = this.existingTracker.getTripStorage();
      const allTrips = await storage.getAllTrips();

      // Separate trips by source
      const manualTrips = allTrips.filter(trip =>
        !trip.source || (trip.source !== 'integrated_automatic_detection' && trip.source !== 'integrated_basic_fallback')
      );
      const automaticTrips = allTrips.filter(trip =>
        trip.source === 'integrated_automatic_detection' || trip.source === 'integrated_basic_fallback'
      );

      // Calculate statistics
      const statistics = {
        // Overall statistics
        totalTrips: allTrips.length,
        totalMiles: allTrips.reduce((sum, trip) => sum + (trip.distanceMiles || 0), 0),
        totalCost: allTrips.reduce((sum, trip) => sum + (trip.cost || 0), 0),

        // Source breakdown
        manualTripsCount: manualTrips.length,
        automaticTripsCount: automaticTrips.length,

        // Quality metrics
        averageQualityScore: this.calculateAverageQualityScore(automaticTrips),
        averageDetectionConfidence: this.calculateAverageConfidence(automaticTrips),

        // Trip characteristics
        averageTripDistance: allTrips.length > 0 ?
          allTrips.reduce((sum, trip) => sum + (trip.distanceMiles || 0), 0) / allTrips.length : 0,
        averageTripDuration: allTrips.length > 0 ?
          allTrips.reduce((sum, trip) => sum + (trip.duration || trip.durationMinutes * 60 || 0), 0) / allTrips.length : 0,

        // Recent activity
        tripsThisWeek: this.countTripsInTimeframe(allTrips, 7),
        tripsThisMonth: this.countTripsInTimeframe(allTrips, 30),

        // Data quality
        highQualityTrips: automaticTrips.filter(trip => (trip.qualityScore || 0) > 0.8).length,
        dataQualityPercentage: automaticTrips.length > 0 ?
          (automaticTrips.filter(trip => (trip.qualityScore || 0) > 0.7).length / automaticTrips.length) * 100 : 0
      };

      return statistics;

    } catch (error) {
      console.error('Error calculating enhanced trip statistics:', error);
      throw error;
    }
  }

  /**
   * Helper methods for statistics
   */
  calculateAverageQualityScore(trips) {
    const tripsWithQuality = trips.filter(trip => trip.qualityScore !== undefined);
    if (tripsWithQuality.length === 0) return 0;
    return tripsWithQuality.reduce((sum, trip) => sum + trip.qualityScore, 0) / tripsWithQuality.length;
  }

  calculateAverageConfidence(trips) {
    const tripsWithConfidence = trips.filter(trip => trip.detectionConfidence !== undefined);
    if (tripsWithConfidence.length === 0) return 0;
    return tripsWithConfidence.reduce((sum, trip) => sum + trip.detectionConfidence, 0) / tripsWithConfidence.length;
  }

  countTripsInTimeframe(trips, days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return trips.filter(trip => new Date(trip.startTime) > cutoffDate).length;
  }
}