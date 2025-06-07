// screens/TripDetectionTestScreen.js
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
import TripDetectionEngine from '../services/TripDetectionEngine';
import LocationTrackingService from '../services/LocationTrackingService';

/**
 * TripDetectionTestScreen
 *
 * This interface provides comprehensive testing and monitoring capabilities for the
 * trip detection engine. It demonstrates how location-based trip detection works
 * in practice and provides real-time visibility into the sophisticated decision-making
 * process that transforms location data into trip records.
 *
 * Key features:
 * - Real-time state machine monitoring with transition history
 * - Active trip tracking with live statistics and route information
 * - Complete trip history with detailed trip characteristics
 * - State transition logging for understanding detection logic
 * - Debug mode controls for detailed system analysis
 * - Integration testing between location tracking and trip detection
 *
 * This screen serves as both a testing tool and an educational interface that
 * demonstrates the complexity and sophistication of automatic trip detection systems.
 */
export default function TripDetectionTestScreen() {
  // Core trip detection state
  const [detectionStatus, setDetectionStatus] = useState(null);
  const [activeTrip, setActiveTrip] = useState(null);
  const [tripHistory, setTripHistory] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);

  // UI state management
  const [isInitializing, setIsInitializing] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [lastEventTime, setLastEventTime] = useState(null);

  // Event listener references for cleanup
  const tripEventListenerRef = useRef(null);

  /**
   * Component initialization and cleanup
   * Sets up trip detection event monitoring and gets initial state
   */
  useEffect(() => {
    setupTripEventListener();
    updateDetectionStatus();

    return () => {
      cleanupTripEventListener();
    };
  }, []);

  /**
   * Set up event listener to monitor trip detection events in real-time
   * This provides immediate feedback about state changes and trip events
   */
  const setupTripEventListener = () => {
    tripEventListenerRef.current = (eventType, eventData) => {
      setLastEventTime(new Date().toLocaleTimeString());

      // Add event to recent events history for display
      setRecentEvents(prev => {
        const newEvent = {
          type: eventType,
          data: eventData,
          timestamp: Date.now(),
          timeString: new Date().toLocaleTimeString()
        };

        // Keep last 20 events for display
        return [newEvent, ...prev].slice(0, 20);
      });

      // Handle specific event types to update UI state
      switch (eventType) {
        case 'tripStarted':
          setActiveTrip(eventData);
          console.log('Trip started:', eventData.tripId);
          break;

        case 'tripProgress':
          setActiveTrip(eventData);
          break;

        case 'tripCompleted':
          setActiveTrip(null);
          updateTripHistory();
          console.log('Trip completed:', eventData.tripId);
          break;

        case 'tripDiscarded':
          setActiveTrip(null);
          console.log('Trip discarded:', eventData.discardReason);
          break;

        case 'stateChanged':
          updateDetectionStatus();
          console.log(`State transition: ${eventData.previousState} → ${eventData.newState}`);
          break;
      }
    };

    TripDetectionEngine.addTripEventListener(tripEventListenerRef.current);
  };

  /**
   * Clean up event listener to prevent memory leaks
   */
  const cleanupTripEventListener = () => {
    if (tripEventListenerRef.current) {
      TripDetectionEngine.removeTripEventListener(tripEventListenerRef.current);
    }
  };

  /**
   * Update detection status from the engine
   * Provides current state and statistics for display
   */
  const updateDetectionStatus = () => {
    const status = TripDetectionEngine.getTripDetectionStatus();
    setDetectionStatus(status);
  };

  /**
   * Update trip history from the engine
   * Refreshes the list of completed trips for display
   */
  const updateTripHistory = () => {
    const history = TripDetectionEngine.getTripHistory(10); // Get last 10 trips
    setTripHistory(history);
  };

  /**
   * Initialize and start trip detection system
   * Demonstrates the complete startup sequence with error handling
   */
  const startTripDetection = async () => {
    try {
      setIsInitializing(true);

      // Ensure location tracking is active first
      console.log('Checking location tracking status...');
      const locationStatus = LocationTrackingService.getTrackingStatus();

      if (!locationStatus.isTracking) {
        Alert.alert(
          'Location Tracking Required',
          'Trip detection requires active location tracking. Start location tracking first.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Initialize trip detection engine
      console.log('Initializing trip detection engine...');
      const initResult = await TripDetectionEngine.initializeTripDetection();

      if (!initResult.success) {
        Alert.alert(
          'Initialization Failed',
          initResult.message,
          [{ text: 'OK' }]
        );
        return;
      }

      // Update status and trip history
      updateDetectionStatus();
      updateTripHistory();

      Alert.alert(
        'Trip Detection Started',
        'The trip detection engine is now monitoring location data for automatic trip detection. Start moving to see it in action!',
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('Error starting trip detection:', error);
      Alert.alert(
        'Error',
        `Failed to start trip detection: ${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsInitializing(false);
    }
  };

  /**
   * Stop trip detection and clean up
   */
  const stopTripDetection = () => {
    TripDetectionEngine.dispose();
    setDetectionStatus(null);
    setActiveTrip(null);
    setRecentEvents([]);

    Alert.alert(
      'Trip Detection Stopped',
      'Trip detection has been stopped. Any active trip will be finalized.',
      [{ text: 'OK' }]
    );
  };

  /**
   * Toggle debug mode for detailed logging
   */
  const toggleDebugMode = () => {
    const newDebugMode = !debugMode;
    setDebugMode(newDebugMode);
    TripDetectionEngine.setDebugMode(newDebugMode);

    Alert.alert(
      'Debug Mode',
      `Debug mode ${newDebugMode ? 'enabled' : 'disabled'}. ${newDebugMode ? 'Check console for detailed logging.' : ''}`,
      [{ text: 'OK' }]
    );
  };

  /**
   * Clear recent events and trip history for fresh testing
   */
  const clearHistory = () => {
    setRecentEvents([]);
    setTripHistory([]);

    Alert.alert('History Cleared', 'Event history cleared for fresh testing.');
  };

  /**
   * Format duration for display
   */
  const formatDuration = (durationMs) => {
    if (!durationMs) return 'Unknown';

    const totalSeconds = Math.floor(durationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  /**
   * Format distance for display
   */
  const formatDistance = (distanceM) => {
    if (!distanceM) return '0 m';

    if (distanceM >= 1000) {
      return `${(distanceM / 1000).toFixed(2)} km`;
    } else {
      return `${distanceM.toFixed(0)} m`;
    }
  };

  /**
   * Get state-specific description and styling
   */
  const getStateInfo = (state) => {
    switch (state) {
      case 'idle':
        return {
          description: 'Waiting for movement that indicates trip start',
          color: '#666',
          backgroundColor: '#f0f0f0'
        };
      case 'trip_starting':
        return {
          description: 'Monitoring movement to confirm trip initiation',
          color: '#ff9800',
          backgroundColor: '#fff3e0'
        };
      case 'actively_traveling':
        return {
          description: 'Trip in progress, monitoring for completion',
          color: '#4caf50',
          backgroundColor: '#e8f5e8'
        };
      case 'trip_ending':
        return {
          description: 'Stationary period detected, checking for trip end',
          color: '#2196f3',
          backgroundColor: '#e3f2fd'
        };
      default:
        return {
          description: 'Unknown state',
          color: '#f44336',
          backgroundColor: '#ffebee'
        };
    }
  };

  /**
   * Format event data for display
   */
  const formatEventData = (event) => {
    switch (event.type) {
      case 'stateChanged':
        return `${event.data.previousState} → ${event.data.newState}: ${event.data.reason}`;
      case 'tripStarted':
        return `Trip ${event.data.tripId} started`;
      case 'tripProgress':
        return `Trip progress: ${formatDistance(event.data.totalDistance)}`;
      case 'tripCompleted':
        return `Trip completed: ${formatDistance(event.data.totalDistance)} in ${formatDuration(event.data.durationMs)}`;
      case 'tripDiscarded':
        return `Trip discarded: ${event.data.discardReason}`;
      default:
        return `${event.type}: ${JSON.stringify(event.data).slice(0, 50)}...`;
    }
  };

  // FIXED: Ensure all JSX is properly formatted without stray whitespace
  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={() => {
            updateDetectionStatus();
            updateTripHistory();
          }}
        />
      }
    >
      <View style={styles.content}>
        <Text style={styles.title}>Trip Detection Test</Text>
        <Text style={styles.subtitle}>
          Test automatic trip detection and monitoring
        </Text>
        {/* Control Panel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Control Panel</Text>
          <View style={styles.controlsContainer}>
            {!detectionStatus?.isActive ? (
              <TouchableOpacity
                style={[styles.button, styles.startButton]}
                onPress={startTripDetection}
                disabled={isInitializing}
              >
                <Text style={styles.buttonText}>
                  {isInitializing ? 'Starting...' : 'Start Trip Detection'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.stopButton]}
                onPress={stopTripDetection}
              >
                <Text style={styles.buttonText}>
                  Stop Trip Detection
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, debugMode ? styles.debugActiveButton : styles.debugButton]}
              onPress={toggleDebugMode}
            >
              <Text style={styles.buttonText}>
                {debugMode ? 'Debug Mode: ON' : 'Debug Mode: OFF'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.clearButton]}
              onPress={clearHistory}
            >
              <Text style={styles.buttonText}>Clear History</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Current Status */}
        {detectionStatus && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Status</Text>
            {(() => {
              const stateInfo = getStateInfo(detectionStatus.currentState);
              return (
                <View style={[styles.statusContainer, { backgroundColor: stateInfo.backgroundColor }]}>
                  <Text style={[styles.statusState, { color: stateInfo.color }]}>
                    State: {detectionStatus.currentState.toUpperCase()}
                  </Text>
                  <Text style={styles.statusDescription}>
                    {stateInfo.description}
                  </Text>
                  {detectionStatus.timeInCurrentState && (
                    <Text style={styles.statusText}>
                      Time in state: {formatDuration(detectionStatus.timeInCurrentState)}
                    </Text>
                  )}
                  {lastEventTime && (
                    <Text style={styles.statusText}>
                      Last event: {lastEventTime}
                    </Text>
                  )}
                </View>
              );
            })()}
          </View>
        )}
        {/* Active Trip */}
        {activeTrip && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Trip</Text>
            <View style={styles.tripContainer}>
              <Text style={styles.tripId}>Trip ID: {activeTrip.tripId}</Text>
              <Text style={styles.tripText}>
                Started: {new Date(activeTrip.startTime).toLocaleTimeString()}
              </Text>
              <Text style={styles.tripText}>
                Distance: {formatDistance(activeTrip.totalDistance)}
              </Text>
              <Text style={styles.tripText}>
                Max Speed: {activeTrip.maxSpeed.toFixed(1)} km/h
              </Text>
              <Text style={styles.tripText}>
                Route Points: {activeTrip.routePoints.length}
              </Text>
              <Text style={styles.tripText}>
                Duration: {formatDuration(Date.now() - activeTrip.startTime)}
              </Text>
            </View>
          </View>
        )}
        {/* Recent Events */}
        {recentEvents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Recent Events ({recentEvents.length})
            </Text>
            {recentEvents.slice(0, 10).map((event, index) => (
              <View key={`${event.timestamp}-${index}`} style={styles.eventItem}>
                <Text style={styles.eventTime}>{event.timeString}</Text>
                <Text style={styles.eventType}>{event.type}</Text>
                <Text style={styles.eventDescription}>
                  {formatEventData(event)}
                </Text>
              </View>
            ))}
          </View>
        )}
        {/* Trip History */}
        {tripHistory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Trip History ({tripHistory.length} trips)
            </Text>
            {tripHistory.map((trip, index) => (
              <View key={trip.tripId} style={styles.historyItem}>
                <Text style={styles.historyTitle}>
                  Trip #{tripHistory.length - index}
                </Text>
                <Text style={styles.historyText}>
                  {formatDistance(trip.totalDistance)} • {formatDuration(trip.durationMs)}
                </Text>
                <Text style={styles.historyText}>
                  Avg Speed: {trip.averageSpeed.toFixed(1)} km/h • Max: {trip.maxSpeed.toFixed(1)} km/h
                </Text>
                <Text style={styles.historyTime}>
                  {new Date(trip.startTime).toLocaleString()} - {new Date(trip.endTime).toLocaleString()}
                </Text>
                <Text style={styles.historyStatus}>
                  Status: {trip.tripStatus} • Method: {trip.detectionMethod}
                </Text>
              </View>
            ))}
          </View>
        )}
        {/* System Information */}
        {detectionStatus && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>System Information</Text>
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                Total Completed Trips: {detectionStatus.completedTrips}
              </Text>
              <Text style={styles.infoText}>
                Total Distance Tracked: {formatDistance(detectionStatus.totalDistanceTracked)}
              </Text>
              <Text style={styles.infoText}>
                Recent State Transitions: {detectionStatus.recentStateTransitions.length}
              </Text>
            </View>
          </View>
        )}
        {/* Testing Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Testing Instructions</Text>
          <Text style={styles.instructionText}>
            1. Ensure location tracking is active before starting trip detection
          </Text>
          <Text style={styles.instructionText}>
            2. Start trip detection and observe the current state (should be "idle")
          </Text>
          <Text style={styles.instructionText}>
            3. Begin moving at driving speeds (8+ km/h) to trigger trip start detection
          </Text>
          <Text style={styles.instructionText}>
            4. Continue moving to see trip confirmation and active travel monitoring
          </Text>
          <Text style={styles.instructionText}>
            5. Stop for different durations to test trip end detection logic
          </Text>
          <Text style={styles.instructionText}>
            6. Enable debug mode for detailed console logging of detection logic
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
  debugButton: {
    backgroundColor: '#9C27B0',
  },
  debugActiveButton: {
    backgroundColor: '#E91E63',
  },
  clearButton: {
    backgroundColor: '#607D8B',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusContainer: {
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  statusState: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  tripContainer: {
    padding: 12,
    backgroundColor: '#e8f5e8',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  tripId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 8,
  },
  tripText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  eventItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
    marginBottom: 8,
  },
  eventTime: {
    fontSize: 12,
    color: '#999',
  },
  eventType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  eventDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
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
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  historyTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  historyStatus: {
    fontSize: 12,
    color: '#2196f3',
    marginTop: 2,
  },
  infoContainer: {
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
});