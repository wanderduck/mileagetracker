// screens/LocationTrackingTestScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import LocationTrackingService from '../services/LocationTrackingService';

/**
 * LocationTrackingTestScreen
 *
 * This test interface demonstrates the LocationTrackingService capabilities and helps you
 * understand how location-based trip detection works. It provides real-time visibility
 * into location data collection, movement analysis, and data quality filtering.
 *
 * Key features:
 * - Start/stop location tracking with user feedback
 * - Real-time display of current location and movement characteristics
 * - History of recent location updates with movement analysis
 * - Tracking statistics and service status information
 * - Quality filter demonstrations showing how GPS noise is handled
 *
 * This screen serves as both a testing tool and an educational interface that shows
 * the sophisticated processing happening behind the scenes in location-based applications.
 */
export default function LocationTrackingTestScreen() {
  // Core tracking state
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [trackingStatus, setTrackingStatus] = useState(null);

  // UI state for better user experience
  const [isInitializing, setIsInitializing] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [totalDistance, setTotalDistance] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState(null);

  // Reference for managing listeners
  const locationListenerRef = useRef(null);
  const trackingStateListenerRef = useRef(null);

  /**
   * Component initialization and cleanup
   * Sets up event listeners and gets initial service status
   */
  useEffect(() => {
    // Set up listeners for location updates and tracking state changes
    setupEventListeners();

    // Get initial service status
    updateTrackingStatus();

    // Cleanup listeners when component unmounts
    return () => {
      cleanupEventListeners();
    };
  }, []);

  /**
   * Set up event listeners to respond to location service events
   * This demonstrates the observer pattern for handling real-time location updates
   */
  const setupEventListeners = () => {
    // Listen for location updates to update the UI in real-time
    locationListenerRef.current = (locationData) => {
      setCurrentLocation(locationData);
      setLastUpdateTime(new Date().toLocaleTimeString());

      // Add to local history for display (keep last 20 updates)
      setLocationHistory(prev => {
        const newHistory = [locationData, ...prev].slice(0, 20);

        // Calculate cumulative distance for this session
        if (newHistory.length > 1) {
          const totalDist = newHistory.reduce((sum, location, index) => {
            if (index < newHistory.length - 1 && location.movement) {
              return sum + (location.movement.distanceMeters || 0);
            }
            return sum;
          }, 0);
          setTotalDistance(totalDist);
        }

        return newHistory;
      });
    };

    // Listen for tracking state changes to update UI controls
    trackingStateListenerRef.current = (trackingState) => {
      setIsTracking(trackingState);
      if (trackingState) {
        setSessionStartTime(new Date());
        setTotalDistance(0);
      } else {
        setSessionStartTime(null);
      }
      updateTrackingStatus();
    };

    // Register listeners with the service
    LocationTrackingService.addLocationUpdateListener(locationListenerRef.current);
    LocationTrackingService.addTrackingStateListener(trackingStateListenerRef.current);
  };

  /**
   * Clean up event listeners to prevent memory leaks
   * Important for proper resource management in React Native
   */
  const cleanupEventListeners = () => {
    if (locationListenerRef.current) {
      LocationTrackingService.removeLocationUpdateListener(locationListenerRef.current);
    }
    if (trackingStateListenerRef.current) {
      LocationTrackingService.removeTrackingStateListener(trackingStateListenerRef.current);
    }
  };

  /**
   * Update tracking status information for display
   * Provides insight into the current state of the location service
   */
  const updateTrackingStatus = () => {
    const status = LocationTrackingService.getTrackingStatus();
    setTrackingStatus(status);
  };

  /**
   * Initialize and start location tracking
   * Demonstrates the complete startup sequence with proper error handling
   */
  const startTracking = async () => {
    try {
      setIsInitializing(true);

      // Initialize the location tracking service
      console.log('Starting location tracking initialization...');
      const initResult = await LocationTrackingService.initializeLocationTracking();

      if (!initResult.success) {
        Alert.alert(
          'Initialization Failed',
          initResult.message,
          [{ text: 'OK' }]
        );
        return;
      }

      // Start continuous tracking
      console.log('Starting continuous location tracking...');
      const trackingResult = await LocationTrackingService.startLocationTracking();

      if (!trackingResult.success) {
        Alert.alert(
          'Tracking Failed',
          trackingResult.message,
          [{ text: 'OK' }]
        );
        return;
      }

      Alert.alert(
        'Tracking Started',
        'Location tracking is now active. You should see location updates appearing below.',
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('Error starting tracking:', error);
      Alert.alert(
        'Error',
        `Failed to start tracking: ${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsInitializing(false);
    }
  };

  /**
   * Stop location tracking and clean up
   * Demonstrates proper resource cleanup for battery conservation
   */
  const stopTracking = async () => {
    try {
      const result = await LocationTrackingService.stopLocationTracking();

      if (result.success) {
        Alert.alert(
          'Tracking Stopped',
          'Location tracking has been stopped to conserve battery.',
          [{ text: 'OK' }]
        );

        // Clear current location display but keep history for review
        setCurrentLocation(null);
        setLastUpdateTime(null);
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Error stopping tracking:', error);
      Alert.alert('Error', `Failed to stop tracking: ${error.message}`);
    }
  };

  /**
   * Clear location history for a fresh start
   * Useful for testing different scenarios
   */
  const clearHistory = () => {
    setLocationHistory([]);
    setTotalDistance(0);
    Alert.alert('History Cleared', 'Location history has been cleared.');
  };

  /**
   * Format location data for display
   * Demonstrates how to present technical data in user-friendly format
   */
  const formatLocationForDisplay = (location) => {
    if (!location) return null;

    return {
      coordinates: `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`,
      accuracy: location.accuracy ? `±${location.accuracy.toFixed(1)}m` : 'Unknown',
      timestamp: new Date(location.timestamp).toLocaleTimeString(),
    };
  };

  /**
   * Format movement data for display
   * Shows how movement analysis results can be presented to users
   */
  const formatMovementForDisplay = (movement) => {
    if (!movement) return null;

    return {
      distance: `${movement.distanceMeters.toFixed(1)}m`,
      speed: `${movement.speedKmh.toFixed(1)} km/h`,
      bearing: `${movement.bearing.toFixed(0)}°`,
      type: movement.movementType,
      timeGap: `${(movement.timeDeltaMs / 1000).toFixed(1)}s`
    };
  };

  /**
   * Get a user-friendly description of tracking status
   * Helps users understand what the service is currently doing
   */
  const getTrackingStatusDescription = () => {
    if (!trackingStatus) return 'Status unknown';

    if (trackingStatus.isTracking) {
      return `Active tracking (${trackingStatus.historyCount} updates collected)`;
    } else {
      return 'Tracking stopped';
    }
  };

  /**
   * Calculate session duration for display
   * Shows how long the current tracking session has been active
   */
  const getSessionDuration = () => {
    if (!sessionStartTime) return null;

    const durationMs = Date.now() - sessionStartTime.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={updateTrackingStatus}
        />
      }
    >
      <View style={styles.content}>
        <Text style={styles.title}>Location Tracking Test</Text>
        <Text style={styles.subtitle}>
          Test location-based trip detection foundation
        </Text>

        {/* Tracking Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tracking Controls</Text>

          <View style={styles.controlsContainer}>
            {!isTracking ? (
              <TouchableOpacity
                style={[styles.button, styles.startButton]}
                onPress={startTracking}
                disabled={isInitializing}
              >
                <Text style={styles.buttonText}>
                  {isInitializing ? 'Starting...' : 'Start Location Tracking'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.stopButton]}
                onPress={stopTracking}
              >
                <Text style={styles.buttonText}>
                  Stop Location Tracking
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, styles.clearButton]}
              onPress={clearHistory}
            >
              <Text style={styles.buttonText}>Clear History</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Current Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Status</Text>
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              Status: {getTrackingStatusDescription()}
            </Text>
            {sessionStartTime && (
              <Text style={styles.statusText}>
                Session Duration: {getSessionDuration()}
              </Text>
            )}
            {lastUpdateTime && (
              <Text style={styles.statusText}>
                Last Update: {lastUpdateTime}
              </Text>
            )}
            <Text style={styles.statusText}>
              Total Distance: {(totalDistance / 1000).toFixed(3)} km
            </Text>
          </View>
        </View>

        {/* Current Location */}
        {currentLocation && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Location</Text>
            <View style={styles.locationContainer}>
              {(() => {
                const displayLocation = formatLocationForDisplay(currentLocation);
                return (
                  <>
                    <Text style={styles.locationText}>
                      Coordinates: {displayLocation.coordinates}
                    </Text>
                    <Text style={styles.locationText}>
                      Accuracy: {displayLocation.accuracy}
                    </Text>
                    <Text style={styles.locationText}>
                      Time: {displayLocation.timestamp}
                    </Text>
                  </>
                );
              })()}

              {currentLocation.movement && (
                <>
                  <Text style={styles.movementTitle}>Movement Analysis:</Text>
                  {(() => {
                    const movement = formatMovementForDisplay(currentLocation.movement);
                    return (
                      <>
                        <Text style={styles.movementText}>
                          Distance: {movement.distance}
                        </Text>
                        <Text style={styles.movementText}>
                          Speed: {movement.speed}
                        </Text>
                        <Text style={styles.movementText}>
                          Type: {movement.type}
                        </Text>
                        <Text style={styles.movementText}>
                          Bearing: {movement.bearing}
                        </Text>
                      </>
                    );
                  })()}
                </>
              )}
            </View>
          </View>
        )}

        {/* Location History */}
        {locationHistory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Recent Location History ({locationHistory.length} updates)
            </Text>

            {locationHistory.map((location, index) => {
              const displayLocation = formatLocationForDisplay(location);
              const movement = location.movement ? formatMovementForDisplay(location.movement) : null;

              return (
                <View key={`${location.timestamp}-${index}`} style={styles.historyItem}>
                  <Text style={styles.historyTitle}>
                    Update #{locationHistory.length - index}
                  </Text>
                  <Text style={styles.historyText}>
                    {displayLocation.coordinates} ({displayLocation.accuracy})
                  </Text>
                  <Text style={styles.historyTime}>
                    {displayLocation.timestamp}
                  </Text>

                  {movement && (
                    <View style={styles.historyMovement}>
                      <Text style={styles.historyMovementText}>
                        {movement.distance} • {movement.speed} • {movement.type}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Service Configuration */}
        {trackingStatus && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Configuration</Text>
            <View style={styles.configContainer}>
              <Text style={styles.configText}>
                Update Interval: {trackingStatus.configuration?.timeInterval / 1000}s
              </Text>
              <Text style={styles.configText}>
                Distance Filter: {trackingStatus.configuration?.distanceInterval}m
              </Text>
              <Text style={styles.configText}>
                Accuracy Setting: {trackingStatus.configuration?.accuracy?.toString()}
              </Text>
            </View>
          </View>
        )}

        {/* Usage Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Testing Instructions</Text>
          <Text style={styles.instructionText}>
            1. Tap "Start Location Tracking" to begin collecting location data
          </Text>
          <Text style={styles.instructionText}>
            2. Move around (walk, drive, or change locations) to see movement analysis
          </Text>
          <Text style={styles.instructionText}>
            3. Observe how the service calculates distance, speed, and movement type
          </Text>
          <Text style={styles.instructionText}>
            4. Try stopping for different periods to see how stationary detection works
          </Text>
          <Text style={styles.instructionText}>
            5. Use "Clear History" to start fresh testing scenarios
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  controlsContainer: {
    gap: 12,
  },
  button: {
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#f44336',
  },
  clearButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusContainer: {
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#333',
  },
  locationContainer: {
    gap: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
  },
  movementTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  movementText: {
    fontSize: 14,
    color: '#666',
  },
  historyItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 12,
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  historyText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  historyTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  historyMovement: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  historyMovementText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  configContainer: {
    gap: 8,
  },
  configText: {
    fontSize: 14,
    color: '#666',
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
});