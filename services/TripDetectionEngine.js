// TripDetectionEngine.js - Production AI Trip Detection Service with Singleton Pattern
// This service provides sophisticated artificial intelligence for automatic trip
// boundary detection using GPS movement pattern analysis

/**
 * TripDetectionEngine
 *
 * This class implements sophisticated artificial intelligence algorithms that analyze
 * GPS movement patterns to automatically identify trip boundaries. Now implemented as
 * a singleton to ensure all parts of your app work with the same detection instance.
 *
 * Key capabilities:
 * - Analyzes movement patterns to detect trip start and end points
 * - Distinguishes between brief stops and trip endpoints
 * - Handles complex scenarios like multi-stop trips and parking lots
 * - Provides confidence scores for detection decisions
 * - Supports multiple event listeners for flexible integration
 */
class TripDetectionEngine {
  constructor() {
    // Detection state management
    this.isActiveState = false; // Renamed from this.isActive to avoid conflict
    this.currentTripState = 'idle'; // 'idle', 'potential_start', 'active', 'potential_end'
    this.tripStartTime = null;
    this.tripStartLocation = null;
    this.lastSignificantLocation = null;

    // Movement analysis buffers
    this.movementBuffer = [];
    this.stopBuffer = [];

    // Detection parameters (these can be tuned based on experience)
    this.tripStartMovementThreshold = 100; // meters - minimum movement to consider trip start
    this.tripEndStationaryTime = 300000; // 5 minutes - stationary time to end trip
    this.significantMovementDistance = 500; // meters - distance for "significant" movement
    this.stopDetectionRadius = 50; // meters - radius for detecting stops
    this.minimumTripDistance = 500; // meters - minimum distance to qualify as a trip

    // Callback handlers for trip events (backward compatibility)
    this.onTripStart = null;
    this.onTripEnd = null;
    this.onTripUpdate = null;
    this.onStopDetected = null;

    // Event listener arrays for supporting multiple listeners
    this.tripEventListeners = [];
    this.tripStartListeners = [];
    this.tripEndListeners = [];
    this.tripUpdateListeners = [];
    this.stopDetectedListeners = [];

    // Trip analysis data
    this.currentTripData = null;

    // Trip history for the test screen
    this.completedTrips = [];
    this.recentStateTransitions = [];

    // Debug mode flag
    this.debugMode = false;

    console.log('TripDetectionEngine initialized with AI pattern recognition');
  }

  /**
   * Singleton instance management
   */
  static instance = null;

  static getInstance() {
    if (!TripDetectionEngine.instance) {
      TripDetectionEngine.instance = new TripDetectionEngine();
    }
    return TripDetectionEngine.instance;
  }

  /**
   * Static event listener management methods
   * These allow components to register listeners without having the instance
   */
  static addTripEventListener(listener) {
    const instance = TripDetectionEngine.getInstance();
    if (typeof listener === 'function' && !instance.tripEventListeners.includes(listener)) {
      instance.tripEventListeners.push(listener);
    }
  }

  static removeTripEventListener(listener) {
    const instance = TripDetectionEngine.getInstance();
    const index = instance.tripEventListeners.indexOf(listener);
    if (index > -1) {
      instance.tripEventListeners.splice(index, 1);
    }
  }

  static getTripDetectionStatus() {
    const instance = TripDetectionEngine.getInstance();
    return instance.getDetectionStatus();
  }

  static getTripHistory(limit = 10) {
    const instance = TripDetectionEngine.getInstance();
    return instance.completedTrips.slice(-limit);
  }

  static initializeTripDetection() {
    const instance = TripDetectionEngine.getInstance();
    return instance.startDetection();
  }

  static dispose() {
    const instance = TripDetectionEngine.getInstance();
    return instance.stopDetection();
  }

  static setDebugMode(enabled) {
    const instance = TripDetectionEngine.getInstance();
    instance.debugMode = enabled;
    console.log(`Trip detection debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Notify all trip event listeners
   * This method handles the generic event notification that the test screen uses
   */
  notifyTripEventListeners(eventType, eventData) {
    // Log state transitions for the test screen
    this.recentStateTransitions.push({
      type: eventType,
      data: eventData,
      timestamp: Date.now()
    });

    // Keep only the last 50 transitions
    if (this.recentStateTransitions.length > 50) {
      this.recentStateTransitions.shift();
    }

    // Notify all registered trip event listeners
    this.tripEventListeners.forEach(listener => {
      try {
        listener(eventType, eventData);
      } catch (error) {
        console.error('Error in trip event listener:', error);
      }
    });

    // Also handle specific event types for backward compatibility
    switch (eventType) {
      case 'tripStarted':
        this.notifyTripStartListeners(eventData);
        break;
      case 'tripCompleted':
        this.notifyTripEndListeners(eventData);
        break;
      case 'tripProgress':
        this.notifyTripUpdateListeners(eventData);
        break;
      case 'stopDetected':
        this.notifyStopDetectedListeners(eventData);
        break;
      case 'stateChanged':
        // State changes are only for the generic listeners
        break;
    }
  }

  /**
   * Notify trip start listeners
   */
  notifyTripStartListeners(tripData) {
    // Call the direct callback if set (backward compatibility)
    if (this.onTripStart) {
      this.onTripStart(tripData);
    }

    // Call all registered listeners
    this.tripStartListeners.forEach(listener => {
      try {
        listener(tripData);
      } catch (error) {
        console.error('Error in trip start listener:', error);
      }
    });
  }

  /**
   * Notify trip end listeners
   */
  notifyTripEndListeners(tripData) {
    // Call the direct callback if set (backward compatibility)
    if (this.onTripEnd) {
      this.onTripEnd(tripData);
    }

    // Call all registered listeners
    this.tripEndListeners.forEach(listener => {
      try {
        listener(tripData);
      } catch (error) {
        console.error('Error in trip end listener:', error);
      }
    });
  }

  /**
   * Notify trip update listeners
   */
  notifyTripUpdateListeners(tripData) {
    // Call the direct callback if set (backward compatibility)
    if (this.onTripUpdate) {
      this.onTripUpdate(tripData);
    }

    // Call all registered listeners
    this.tripUpdateListeners.forEach(listener => {
      try {
        listener(tripData);
      } catch (error) {
        console.error('Error in trip update listener:', error);
      }
    });
  }

  /**
   * Notify stop detected listeners
   */
  notifyStopDetectedListeners(stopData) {
    // Call the direct callback if set (backward compatibility)
    if (this.onStopDetected) {
      this.onStopDetected(stopData);
    }

    // Call all registered listeners
    this.stopDetectedListeners.forEach(listener => {
      try {
        listener(stopData);
      } catch (error) {
        console.error('Error in stop detected listener:', error);
      }
    });
  }

  /**
   * Start Trip Detection
   */
  async startDetection() {
    try {
      console.log('Starting AI-powered trip detection...');

      // Check if already active
      if (this.isActiveState) {
        console.log('Trip detection is already active');
        return { success: true, message: 'Already active' };
      }

      const previousState = this.currentTripState;
      this.isActiveState = true;
      this.currentTripState = 'idle';
      this.resetTripData();

      // Notify listeners of state change
      this.notifyTripEventListeners('stateChanged', {
        previousState,
        newState: this.currentTripState,
        reason: 'Detection started'
      });

      console.log('Trip detection engine activated successfully');
      return { success: true, message: 'Detection started successfully' };

    } catch (error) {
      console.error('Failed to start trip detection:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Stop Trip Detection
   */
  async stopDetection() {
    try {
      console.log('Stopping trip detection and finalizing analysis...');

      // If there's an active trip, finalize it
      if (this.currentTripState === 'active' && this.currentTripData) {
        await this.finalizeTripAnalysis();
      }

      const previousState = this.currentTripState;
      this.isActiveState = false;
      this.currentTripState = 'idle';
      this.resetTripData();

      // Notify listeners of state change
      this.notifyTripEventListeners('stateChanged', {
        previousState,
        newState: this.currentTripState,
        reason: 'Detection stopped'
      });

      console.log('Trip detection stopped successfully');
      return true;

    } catch (error) {
      console.error('Error stopping trip detection:', error);
      return false;
    }
  }

  /**
   * Process Location Update
   */
  processLocationUpdate(locationData) {
    if (!this.isActiveState) return;

    try {
      // Add location to movement analysis buffer
      this.movementBuffer.push({
        ...locationData,
        processedAt: Date.now()
      });

      // Keep buffer manageable (last 100 points for analysis)
      if (this.movementBuffer.length > 100) {
        this.movementBuffer.shift();
      }

      // Analyze current movement state and make detection decisions
      this.analyzeMovementPattern(locationData);

      // Update trip data if we're actively tracking
      if (this.currentTripState === 'active') {
        this.updateActiveTripAnalysis(locationData);
      }

      if (this.debugMode) {
        console.log('Location processed:', {
          state: this.currentTripState,
          bufferSize: this.movementBuffer.length
        });
      }

    } catch (error) {
      console.error('Error processing location update in trip detection:', error);
    }
  }

  /**
   * Analyze Movement Pattern
   */
  analyzeMovementPattern(newLocation) {
    const currentTime = Date.now();

    // Calculate movement metrics from recent location history
    const movementMetrics = this.calculateMovementMetrics(newLocation);

    const previousState = this.currentTripState;

    // Apply state machine logic based on current trip state
    switch (this.currentTripState) {
      case 'idle':
        this.analyzeForTripStart(newLocation, movementMetrics);
        break;

      case 'potential_start':
        this.confirmTripStart(newLocation, movementMetrics);
        break;

      case 'active':
        this.analyzeActiveTripMovement(newLocation, movementMetrics);
        break;

      case 'potential_end':
        this.confirmTripEnd(newLocation, movementMetrics);
        break;
    }

    // If state changed, notify listeners
    if (previousState !== this.currentTripState) {
      this.notifyTripEventListeners('stateChanged', {
        previousState,
        newState: this.currentTripState,
        reason: 'Movement analysis',
        metrics: movementMetrics
      });
    }
  }

  /**
   * Calculate Movement Metrics
   */
  calculateMovementMetrics(currentLocation) {
    if (this.movementBuffer.length < 2) {
      return {
        totalDistance: 0,
        averageSpeed: 0,
        movementConsistency: 0,
        timeSpan: 0,
        isStationary: true
      };
    }

    // Calculate total distance over recent movement
    let totalDistance = 0;
    const recentPoints = this.movementBuffer.slice(-10); // Last 10 points for analysis

    for (let i = 1; i < recentPoints.length; i++) {
      totalDistance += this.calculateDistance(
        recentPoints[i-1].latitude,
        recentPoints[i-1].longitude,
        recentPoints[i].latitude,
        recentPoints[i].longitude
      );
    }

    // Calculate time span and average speed
    const timeSpan = recentPoints[recentPoints.length - 1].timestamp - recentPoints[0].timestamp;
    const averageSpeed = timeSpan > 0 ? (totalDistance / (timeSpan / 1000)) * 3.6 : 0; // km/h

    // Calculate movement consistency (how linear vs. random the movement is)
    const directDistance = this.calculateDistance(
      recentPoints[0].latitude,
      recentPoints[0].longitude,
      recentPoints[recentPoints.length - 1].latitude,
      recentPoints[recentPoints.length - 1].longitude
    );

    const movementConsistency = totalDistance > 0 ? directDistance / totalDistance : 0;

    // Determine if currently stationary
    const recentMovement = this.calculateDistance(
      this.lastSignificantLocation?.latitude || currentLocation.latitude,
      this.lastSignificantLocation?.longitude || currentLocation.longitude,
      currentLocation.latitude,
      currentLocation.longitude
    );

    const isStationary = recentMovement < this.stopDetectionRadius;

    return {
      totalDistance,
      averageSpeed,
      movementConsistency,
      timeSpan,
      isStationary,
      recentMovement
    };
  }

  /**
   * Analyze for Trip Start
   */
  analyzeForTripStart(location, metrics) {
    // Look for sustained movement that indicates trip beginning
    if (metrics.totalDistance > this.tripStartMovementThreshold &&
        metrics.averageSpeed > 5 && // At least 5 km/h average speed
        metrics.movementConsistency > 0.3) { // Reasonably linear movement

      console.log('Potential trip start detected - analyzing movement pattern...');

      this.currentTripState = 'potential_start';
      this.tripStartTime = Date.now();
      this.tripStartLocation = { ...location };

      // Start accumulating data for trip confirmation
      this.currentTripData = {
        tripId: `trip_${Date.now()}`,
        startTime: new Date().toISOString(),
        startLocation: { ...location },
        route: [{ ...location }],
        totalDistance: 0,
        confidence: 0.6 // Initial confidence for potential trip
      };
    }
  }

  /**
   * Confirm Trip Start
   */
  confirmTripStart(location, metrics) {
    const timeSinceStart = Date.now() - this.tripStartTime;
    const distanceFromStart = this.calculateDistance(
      this.tripStartLocation.latitude,
      this.tripStartLocation.longitude,
      location.latitude,
      location.longitude
    );

    // Confirm trip if sustained movement continues
    if (distanceFromStart > this.significantMovementDistance &&
        metrics.averageSpeed > 3 &&
        timeSinceStart > 30000) { // At least 30 seconds of movement

      console.log('Trip start confirmed - activating full trip tracking');

      this.currentTripState = 'active';
      this.lastSignificantLocation = { ...location };

      // Update trip data with confirmed information
      this.currentTripData.confidence = 0.85;
      this.currentTripData.route.push({ ...location });

      // Notify listeners that a confirmed trip has started
      const tripStartData = {
        ...this.currentTripData,
        detectionMethod: 'automatic',
        startConfidence: 0.85
      };
      this.notifyTripEventListeners('tripStarted', tripStartData);

    } else if (timeSinceStart > 120000) { // 2 minutes without confirmation
      console.log('Potential trip start timeout - returning to idle state');

      // Notify that trip was discarded
      this.notifyTripEventListeners('tripDiscarded', {
        tripId: this.currentTripData?.tripId,
        discardReason: 'Failed to confirm sustained movement',
        duration: timeSinceStart
      });

      this.currentTripState = 'idle';
      this.resetTripData();
    }
  }

  /**
   * Analyze Active Trip Movement
   */
  analyzeActiveTripMovement(location, metrics) {
    const timeSinceLastSignificant = Date.now() - (this.lastSignificantLocation?.timestamp || 0);

    // Update trip route and distance
    this.currentTripData.route.push({ ...location });
    this.currentTripData.totalDistance = this.calculateTripDistance();
    this.currentTripData.duration = Date.now() - new Date(this.currentTripData.startTime).getTime();

    // Calculate additional trip metrics
    const currentSpeed = metrics.averageSpeed;
    const maxSpeed = Math.max(...this.movementBuffer.slice(-20).map(p => p.speed || 0)) * 3.6; // km/h

    // Detect if currently stopped
    if (metrics.isStationary) {
      this.handleStopDetection(location, metrics);
    } else {
      // Update last significant location for continued movement
      this.lastSignificantLocation = { ...location };

      // Clear any accumulated stop data
      this.stopBuffer = [];

      // Notify listeners of trip progress
      const tripUpdateData = {
        ...this.currentTripData,
        currentLocation: location,
        estimatedDistance: this.currentTripData.totalDistance,
        averageSpeed: metrics.averageSpeed,
        maxSpeed,
        routePoints: this.currentTripData.route.length
      };
      this.notifyTripEventListeners('tripProgress', tripUpdateData);
    }
  }

  /**
   * Handle Stop Detection
   */
  handleStopDetection(location, metrics) {
    // Add to stop analysis buffer
    this.stopBuffer.push({
      location: { ...location },
      timestamp: Date.now(),
      metrics: { ...metrics }
    });

    // Keep stop buffer manageable
    if (this.stopBuffer.length > 20) {
      this.stopBuffer.shift();
    }

    const stopDuration = this.calculateStopDuration();

    // Notify listeners of stop detection
    const stopData = {
      location,
      duration: stopDuration,
      tripData: this.currentTripData
    };
    this.notifyTripEventListeners('stopDetected', stopData);

    // Analyze if this stop indicates trip end
    if (stopDuration > this.tripEndStationaryTime) {
      console.log('Extended stop detected - analyzing for trip end...');
      this.currentTripState = 'potential_end';
    }
  }

  /**
   * Confirm Trip End
   */
  confirmTripEnd(location, metrics) {
    const stopDuration = this.calculateStopDuration();

    // Confirm trip end based on extended stationary time and trip characteristics
    if (stopDuration > this.tripEndStationaryTime * 1.5 && // 7.5 minutes of being stopped
        this.currentTripData.totalDistance > this.minimumTripDistance) {

      console.log('Trip end confirmed - finalizing trip analysis');

      // Finalize trip with end location and metrics
      this.currentTripData.endTime = new Date().toISOString();
      this.currentTripData.endLocation = { ...location };
      this.currentTripData.confidence = 0.9;

      // Calculate final trip metrics
      const tripCompleteData = {
        ...this.currentTripData,
        tripStatus: 'completed',
        detectionMethod: 'automatic',
        durationMs: new Date(this.currentTripData.endTime) - new Date(this.currentTripData.startTime),
        totalDistance: this.calculateTripDistance(),
        averageSpeed: this.calculateAverageSpeed(),
        maxSpeed: Math.max(...this.currentTripData.route.map(p => p.speed || 0)) * 3.6
      };

      // Add to completed trips history
      this.completedTrips.push(tripCompleteData);
      if (this.completedTrips.length > 100) {
        this.completedTrips.shift(); // Keep only last 100 trips
      }

      // Notify listeners of trip completion
      this.notifyTripEventListeners('tripCompleted', tripCompleteData);

      // Reset for next trip
      this.currentTripState = 'idle';
      this.resetTripData();

    } else if (stopDuration > this.tripEndStationaryTime * 3) { // 15 minutes timeout
      console.log('Trip end timeout - forcing trip completion');
      this.finalizeTripAnalysis();
    }
  }

  /**
   * Calculate Trip Distance
   */
  calculateTripDistance() {
    if (!this.currentTripData || this.currentTripData.route.length < 2) {
      return 0;
    }

    let totalDistance = 0;
    const route = this.currentTripData.route;

    for (let i = 1; i < route.length; i++) {
      totalDistance += this.calculateDistance(
        route[i-1].latitude,
        route[i-1].longitude,
        route[i].latitude,
        route[i].longitude
      );
    }

    return totalDistance / 1000; // Convert to kilometers
  }

  /**
   * Calculate Average Speed
   */
  calculateAverageSpeed() {
    if (!this.currentTripData || this.currentTripData.route.length < 2) {
      return 0;
    }

    const distance = this.calculateTripDistance();
    const duration = (new Date() - new Date(this.currentTripData.startTime)) / 1000 / 3600; // hours

    return duration > 0 ? distance / duration : 0;
  }

  /**
   * Calculate Stop Duration
   */
  calculateStopDuration() {
    if (this.stopBuffer.length === 0) return 0;

    const firstStop = this.stopBuffer[0];
    const lastStop = this.stopBuffer[this.stopBuffer.length - 1];

    return lastStop.timestamp - firstStop.timestamp;
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
   * Update Active Trip Analysis
   */
  updateActiveTripAnalysis(location) {
    if (!this.currentTripData) return;

    // This method is called from analyzeActiveTripMovement
    // Additional analysis logic can be added here if needed
  }

  /**
   * Analyze Trip Data
   */
  async analyzeTripData(locationPoints, startTime, endTime) {
    try {
      console.log('Performing comprehensive trip analysis...');

      if (!locationPoints || locationPoints.length < 2) {
        throw new Error('Insufficient location data for trip analysis');
      }

      // Calculate comprehensive trip metrics
      const analysis = {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: endTime.getTime() - startTime.getTime(),
        route: locationPoints,
        totalDistance: this.calculateRouteDistance(locationPoints),
        averageSpeed: this.calculateAverageSpeedFromPoints(locationPoints, startTime, endTime),
        qualityScore: this.calculateDataQuality(locationPoints),
        confidence: this.calculateDetectionConfidence(locationPoints),
        movementPattern: this.analyzeMovementPatternType(locationPoints)
      };

      console.log('Trip analysis completed:', {
        distance: analysis.totalDistance.toFixed(2) + ' km',
        duration: Math.round(analysis.duration / 60000) + ' minutes',
        quality: (analysis.qualityScore * 100).toFixed(0) + '%',
        confidence: (analysis.confidence * 100).toFixed(0) + '%'
      });

      return analysis;

    } catch (error) {
      console.error('Error analyzing trip data:', error);
      throw error;
    }
  }

  /**
   * Calculate Route Distance
   */
  calculateRouteDistance(points) {
    if (points.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      totalDistance += this.calculateDistance(
        points[i-1].latitude,
        points[i-1].longitude,
        points[i].latitude,
        points[i].longitude
      );
    }

    return totalDistance / 1000; // Convert to kilometers
  }

  /**
   * Calculate Average Speed from Points
   */
  calculateAverageSpeedFromPoints(points, startTime, endTime) {
    const distance = this.calculateRouteDistance(points);
    const duration = (endTime.getTime() - startTime.getTime()) / 1000 / 3600; // hours

    return duration > 0 ? distance / duration : 0; // km/h
  }

  /**
   * Calculate Data Quality Score
   */
  calculateDataQuality(points) {
    if (points.length === 0) return 0;

    let qualitySum = 0;
    let validPoints = 0;

    for (const point of points) {
      if (point.accuracy && point.accuracy <= 50) { // Good accuracy
        qualitySum += 1.0;
      } else if (point.accuracy && point.accuracy <= 100) { // Moderate accuracy
        qualitySum += 0.7;
      } else { // Poor or unknown accuracy
        qualitySum += 0.3;
      }
      validPoints++;
    }

    return validPoints > 0 ? qualitySum / validPoints : 0;
  }

  /**
   * Calculate Detection Confidence
   */
  calculateDetectionConfidence(points) {
    // Base confidence on trip characteristics
    const distance = this.calculateRouteDistance(points);
    const pointDensity = points.length / Math.max(distance, 0.1);

    let confidence = 0.5; // Base confidence

    // Increase confidence for longer trips
    if (distance > 5) confidence += 0.2;
    if (distance > 20) confidence += 0.1;

    // Increase confidence for good point density
    if (pointDensity > 10) confidence += 0.1;
    if (pointDensity > 20) confidence += 0.1;

    // Cap confidence at 0.95
    return Math.min(confidence, 0.95);
  }

  /**
   * Analyze Movement Pattern Type
   */
  analyzeMovementPatternType(points) {
    if (points.length < 3) return 'unknown';

    // Calculate average speed variations
    let speeds = [];
    for (let i = 1; i < points.length; i++) {
      const distance = this.calculateDistance(
        points[i-1].latitude,
        points[i-1].longitude,
        points[i].latitude,
        points[i].longitude
      );
      const timeDiff = (points[i].timestamp - points[i-1].timestamp) / 1000; // seconds
      if (timeDiff > 0) {
        speeds.push((distance / timeDiff) * 3.6); // km/h
      }
    }

    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;

    // Categorize based on average speed
    if (avgSpeed < 20) return 'city_driving';
    if (avgSpeed < 60) return 'suburban_driving';
    return 'highway_driving';
  }

  /**
   * Finalize Trip Analysis
   */
  async finalizeTripAnalysis() {
    if (this.currentTripData) {
      console.log('Finalizing current trip analysis...');

      this.currentTripData.endTime = new Date().toISOString();
      this.currentTripData.confidence = 0.8; // Moderate confidence for forced completion

      const tripCompleteData = {
        ...this.currentTripData,
        tripStatus: 'force_completed',
        detectionMethod: 'automatic',
        durationMs: new Date(this.currentTripData.endTime) - new Date(this.currentTripData.startTime),
        totalDistance: this.calculateTripDistance(),
        averageSpeed: this.calculateAverageSpeed(),
        maxSpeed: Math.max(...this.currentTripData.route.map(p => p.speed || 0)) * 3.6
      };

      // Add to completed trips history
      this.completedTrips.push(tripCompleteData);
      if (this.completedTrips.length > 100) {
        this.completedTrips.shift();
      }

      this.notifyTripEventListeners('tripCompleted', tripCompleteData);
    }

    this.currentTripState = 'idle';
    this.resetTripData();
  }

  /**
   * Reset Trip Data
   */
  resetTripData() {
    this.currentTripData = null;
    this.tripStartTime = null;
    this.tripStartLocation = null;
    this.lastSignificantLocation = null;
    this.movementBuffer = [];
    this.stopBuffer = [];
  }

  /**
   * Get Detection Status
   */
  getDetectionStatus() {
    const timeInCurrentState = this.currentTripState !== 'idle' && this.tripStartTime ?
      Date.now() - this.tripStartTime : 0;

    return {
      isActive: this.isActiveState,
      currentState: this.currentTripState,
      hasActiveTrip: this.currentTripData !== null,
      timeInCurrentState,
      bufferSizes: {
        movement: this.movementBuffer.length,
        stops: this.stopBuffer.length
      },
      currentTripProgress: this.currentTripData ? {
        duration: Date.now() - new Date(this.currentTripData.startTime).getTime(),
        distance: this.currentTripData.totalDistance || 0,
        routePoints: this.currentTripData.route?.length || 0
      } : null,
      completedTrips: this.completedTrips.length,
      totalDistanceTracked: this.completedTrips.reduce((sum, trip) => sum + (trip.totalDistance || 0), 0),
      recentStateTransitions: this.recentStateTransitions.slice(-10)
    };
  }

  /**
   * Check if Detection is Active
   */
  isActive() {
    return this.isActiveState;
  }
}

// Export the class itself as default
export default TripDetectionEngine;

// Also export the class for type checking if needed
export { TripDetectionEngine };