// App.js - Fully Integrated System with Automatic Trip Detection
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Switch, SafeAreaView, StatusBar, Alert, Button } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Import existing services and screens
import LocationTrackerService from './services/locationTracker';
import StatsScreen from './screens/StatsScreen';
import TripHistoryScreen from './screens/TripHistoryScreen';
import BluetoothPermissionsTestScreen from './screens/BluetoothPermissionsTestScreen';

// Import new integrated services
import IntegratedTripManager from './services/IntegratedTripManager';

// Import individual test screens for diagnostic purposes
import LocationTrackingTestScreen from './screens/LocationTrackingTestScreen';
import TripDetectionTestScreen from './screens/TripDetectionTestScreen';

const Tab = createBottomTabNavigator();

// Enhanced tracking screen that uses the integrated automatic detection system
function TrackingScreen({
  integratedTripManager,
  isConnected,
  isTracking,
  tripStats,
  handleConnectionToggle,
  handleResetAllTrips,
  trackingStatus
}) {
  return (
    <SafeAreaView style={styles.trackerContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mileage Tracker</Text>
        <Text style={styles.headerSubtitle}>
          {isTracking ? 'Automatic Detection Active' : 'Ready for Trip Detection'}
        </Text>
      </View>

      {/* Enhanced stats overview with automatic detection insights */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Trip Statistics</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{tripStats.totalTrips}</Text>
            <Text style={styles.statLabel}>Total Trips</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{tripStats.totalMiles}</Text>
            <Text style={styles.statLabel}>Total Miles</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>${tripStats.totalCost.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Total Cost</Text>
          </View>
        </View>

        {/* Show enhanced statistics when automatic detection is available */}
        {tripStats.automaticTripsCount > 0 && (
          <View style={styles.enhancedStatsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{tripStats.automaticTripsCount}</Text>
              <Text style={styles.statLabel}>Auto-Detected</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{(tripStats.dataQualityPercentage || 0).toFixed(0)}%</Text>
              <Text style={styles.statLabel}>Data Quality</Text>
            </View>
          </View>
        )}
      </View>

      {/* Bluetooth simulation controls - now enhanced with automatic detection */}
      <View style={styles.simulationContainer}>
        <Text style={styles.simulationText}>
          Car Bluetooth Connection
        </Text>
        <Text style={styles.simulationSubtext}>
          {isTracking ? 'Automatic trip detection is running' : 'Toggle to start intelligent tracking'}
        </Text>
        <Switch
          value={isConnected}
          onValueChange={handleConnectionToggle}
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={isConnected ? "#4caf50" : "#f4f3f4"}
        />
        <Text style={styles.connectionStatus}>
          {isConnected ? 'Connected - AI Tracking Active' : 'Disconnected'}
        </Text>
      </View>

      {/* Enhanced tracking status with automatic detection details */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Tracking Status:</Text>
        <Text style={isTracking ? styles.statusActive : styles.statusInactive}>
          {isTracking ? 'Intelligent Tracking Active' : 'Not Tracking'}
        </Text>

        {isTracking && trackingStatus && (
          <View style={styles.trackingDetails}>
            <Text style={styles.trackingDetailText}>
              Location Points: {trackingStatus.locationPointsCollected}
            </Text>
            <Text style={styles.trackingDetailText}>
              Current Distance: {trackingStatus.currentDistance.toFixed(2)} miles
            </Text>
            <Text style={styles.trackingDetailText}>
              Services: Location {trackingStatus.servicesActive.locationTracking ? '✓' : '✗'},
              Detection {trackingStatus.servicesActive.tripDetection ? '✓' : '✗'}
            </Text>
          </View>
        )}

        <Text style={styles.description}>
          {isTracking
            ? 'AI-powered trip detection is analyzing your movement patterns in real-time'
            : 'Toggle the switch above to start intelligent automatic trip tracking'}
        </Text>
      </View>

      {/* Reset functionality for testing */}
      <View style={styles.resetContainer}>
        <Button
          title="Reset All Trip Data"
          onPress={handleResetAllTrips}
          color="#f44336"
        />
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  // Enhanced application state management with integrated trip detection
  const [locationTracker, setLocationTracker] = useState(null);
  const [integratedTripManager, setIntegratedTripManager] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [tripStats, setTripStats] = useState({
    totalTrips: 0,
    totalMiles: 0,
    totalCost: 0,
    automaticTripsCount: 0,
    dataQualityPercentage: 0
  });
  const [trackingStatus, setTrackingStatus] = useState(null);

  // Initialize services and load existing data
  useEffect(() => {
    initializeApplication();
  }, []);

  // Set up periodic status updates when tracking is active
  useEffect(() => {
    let statusInterval;

    if (isTracking && integratedTripManager) {
      statusInterval = setInterval(() => {
        const status = integratedTripManager.getIntegrationStatus();
        setTrackingStatus(status);
      }, 2000); // Update every 2 seconds
    } else {
      setTrackingStatus(null);
    }

    return () => {
      if (statusInterval) {
        clearInterval(statusInterval);
      }
    };
  }, [isTracking, integratedTripManager]);

  /**
   * Initialize the complete integrated application system
   *
   * This method sets up both your existing LocationTrackerService and our new
   * IntegratedTripManager, creating a hybrid system that combines the reliability
   * of your existing infrastructure with the intelligence of automatic detection.
   */
  const initializeApplication = async () => {
    try {
      console.log('Initializing integrated mileage tracking system...');

      // Create and initialize your existing location tracker
      const tracker = new LocationTrackerService();
      setLocationTracker(tracker);

      // Create the integrated trip manager that bridges old and new systems
      const integrationManager = new IntegratedTripManager(tracker);
      setIntegratedTripManager(integrationManager);

      // Check if tracking is already active (app restart scenarios)
      const trackingActive = await tracker.isTrackingActive();
      setIsTracking(trackingActive);
      setIsConnected(trackingActive);

      // Load enhanced statistics that include automatic detection insights
      await loadEnhancedTripStats(integrationManager);

      setInitialized(true);
      console.log('Integrated system initialization complete');

    } catch (error) {
      console.error('Error initializing integrated application:', error);
      Alert.alert(
        'Initialization Error',
        'Failed to initialize the enhanced trip tracking system. Please restart the app.'
      );
    }
  };

  /**
   * Load enhanced trip statistics that combine your existing data
   * with insights from automatic trip detection analysis
   */
  const loadEnhancedTripStats = async (integrationManager) => {
    try {
      // Get enhanced statistics from the integrated system
      const enhancedStats = await integrationManager.getEnhancedTripStatistics();

      setTripStats({
        totalTrips: enhancedStats.totalTrips,
        totalMiles: parseFloat(enhancedStats.totalMiles.toFixed(2)),
        totalCost: parseFloat(enhancedStats.totalCost.toFixed(2)),
        automaticTripsCount: enhancedStats.automaticTripsCount,
        dataQualityPercentage: enhancedStats.dataQualityPercentage,
        averageQualityScore: enhancedStats.averageQualityScore,
        averageDetectionConfidence: enhancedStats.averageDetectionConfidence
      });

      console.log('Enhanced trip statistics loaded:', {
        totalTrips: enhancedStats.totalTrips,
        automaticTrips: enhancedStats.automaticTripsCount,
        dataQuality: enhancedStats.dataQualityPercentage.toFixed(1) + '%'
      });

    } catch (error) {
      console.error('Error loading enhanced trip statistics:', error);

      // Fall back to basic statistics if enhanced stats fail
      await loadBasicTripStats();
    }
  };

  /**
   * Load basic trip statistics as a fallback when enhanced statistics aren't available
   */
  const loadBasicTripStats = async () => {
    try {
      if (!locationTracker) return;

      const storage = locationTracker.getTripStorage();
      const allTrips = await storage.getAllTrips();

      const totalTrips = allTrips.length;
      const totalMiles = allTrips.reduce((sum, trip) => sum + trip.distanceMiles, 0);
      const totalCost = allTrips.reduce((sum, trip) => sum + trip.cost, 0);

      setTripStats({
        totalTrips,
        totalMiles: parseFloat(totalMiles.toFixed(2)),
        totalCost: parseFloat(totalCost.toFixed(2)),
        automaticTripsCount: 0,
        dataQualityPercentage: 0
      });

    } catch (error) {
      console.error('Error loading basic trip statistics:', error);
    }
  };

  /**
   * Handle the Bluetooth connection toggle with integrated automatic detection
   *
   * This method now triggers our sophisticated automatic trip detection system
   * instead of simple location tracking, while preserving the same user interface
   * and behavior patterns that users are familiar with.
   */
/**
 * Handle the Bluetooth connection toggle with integrated automatic detection
 * Now enforces that ALL services must start successfully
 */
const handleConnectionToggle = async (value) => {
  if (!integratedTripManager) {
    Alert.alert('System Error', 'Integrated trip manager is not available');
    return;
  }

  // Optimistically update the UI
  setIsConnected(value);

  if (value) {
    // Starting integrated tracking with automatic detection
    console.log('Starting integrated automatic trip tracking...');

    const success = await integratedTripManager.startIntegratedTracking();

    if (success) {
      setIsTracking(true);
      Alert.alert(
        'Intelligent Tracking Started',
        'All systems operational. AI-powered trip detection is now analyzing your movement patterns automatically.'
      );
    } else {
      // Revert UI state since startup failed
      setIsConnected(false);
      Alert.alert(
        'Tracking Failed',
        'Unable to start all required services. Please ensure:\n\n' +
        '• Location permissions are granted\n' +
        '• GPS is enabled on your device\n' +
        '• The app has necessary permissions\n\n' +
        'All services must be operational for tracking to begin.',
        [
          { text: 'Settings', onPress: () => Linking.openSettings() },
          { text: 'OK', style: 'cancel' }
        ]
      );
    }
  } else {
    // Stopping integrated tracking and processing trip data
    console.log('Stopping integrated tracking and processing trip...');

    const success = await integratedTripManager.stopIntegratedTracking();

    if (success) {
      setIsTracking(false);
      setTrackingStatus(null);

      // Refresh statistics to include the just-completed trip
      await loadEnhancedTripStats(integratedTripManager);

      // Check if we actually recorded a trip
      const status = integratedTripManager.getIntegrationStatus();
      if (status.locationPointsCollected > 0) {
        Alert.alert(
          'Trip Completed',
          `Your trip has been analyzed and saved.\n\n` +
          `Distance: ${status.currentDistance.toFixed(2)} km\n` +
          `Points collected: ${status.locationPointsCollected}`
        );
      } else {
        Alert.alert(
          'Tracking Stopped',
          'No trip data was recorded.'
        );
      }
    } else {
      // Keep the UI state as OFF even if stop failed
      // This prevents the UI from being stuck in an ON state
      setIsTracking(false);
      setTrackingStatus(null);

      Alert.alert(
        'Stop Warning',
        'There was an issue stopping some services. The app will attempt to clean up in the background.',
        [{ text: 'OK' }]
      );
    }
  }
};

  /**
   * Handle resetting all trip data with enhanced cleanup
   *
   * This method now ensures that both your existing trip data and any
   * automatic detection data are properly cleaned up during reset operations.
   */
  const handleResetAllTrips = async () => {
    if (!locationTracker || !integratedTripManager) return;

    Alert.alert(
      'Reset All Data',
      'This will permanently delete all trip history, statistics, automatic detection data, and map information. This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              // Stop any active tracking before resetting
              if (isTracking) {
                await integratedTripManager.stopIntegratedTracking();
                setIsTracking(false);
                setIsConnected(false);
                setTrackingStatus(null);
              }

              // Delete all trip data using your existing system
              const storage = locationTracker.getTripStorage();
              await storage.deleteAllTrips();

              // Refresh statistics to show empty state
              await loadEnhancedTripStats(integratedTripManager);

              Alert.alert(
                'Reset Complete',
                'All trip data and automatic detection history has been permanently deleted'
              );

            } catch (error) {
              console.error('Error resetting integrated trip data:', error);
              Alert.alert(
                'Reset Error',
                'Failed to completely reset all trip data. Some data may remain.'
              );
            }
          }
        }
      ]
    );
  };

  // Show loading state during initialization
  if (!initialized) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Initializing Intelligent Mileage Tracker...</Text>
        <Text style={styles.loadingSubtext}>
          Setting up location services, automatic detection, and data storage
        </Text>
      </SafeAreaView>
    );
  }

  // Main application navigation structure with integrated system
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          // Define icons for each tab based on route name
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            switch (route.name) {
              case 'Track':
                iconName = focused ? 'speedometer' : 'speedometer-outline';
                break;
              case 'History':
                iconName = focused ? 'map' : 'map-outline';
                break;
              case 'Stats':
                iconName = focused ? 'bar-chart' : 'bar-chart-outline';
                break;
              case 'Bluetooth':
                iconName = focused ? 'bluetooth' : 'bluetooth-outline';
                break;
              case 'Location Test':
                iconName = focused ? 'location' : 'location-outline';
                break;
              case 'Trip Detection':
                iconName = focused ? 'car-sport' : 'car-sport-outline';
                break;
              default:
                iconName = 'help-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          // Consistent styling across the application
          tabBarActiveTintColor: '#2196F3',
          tabBarInactiveTintColor: 'gray',
          headerShown: false, // Individual screens handle their own headers
        })}
      >
        {/* Main tracking screen with integrated automatic detection */}
        <Tab.Screen name="Track" options={{ title: 'Smart Track' }}>
          {props => (
            <TrackingScreen
              {...props}
              integratedTripManager={integratedTripManager}
              isConnected={isConnected}
              isTracking={isTracking}
              tripStats={tripStats}
              trackingStatus={trackingStatus}
              handleConnectionToggle={handleConnectionToggle}
              handleResetAllTrips={handleResetAllTrips}
            />
          )}
        </Tab.Screen>

        {/* Trip history with enhanced automatic detection data */}
        <Tab.Screen name="History" options={{ title: 'Trip History' }}>
          {props => (
            <TripHistoryScreen
              {...props}
              locationTracker={locationTracker}
              integratedTripManager={integratedTripManager}
            />
          )}
        </Tab.Screen>

        {/* Enhanced statistics with automatic detection insights */}
        <Tab.Screen name="Stats" options={{ title: 'Analytics' }}>
          {props => (
            <StatsScreen
              {...props}
              locationTracker={locationTracker}
              integratedTripManager={integratedTripManager}
            />
          )}
        </Tab.Screen>

        {/* Existing bluetooth testing tab - for permission validation */}
        <Tab.Screen name="Bluetooth" options={{ title: 'BT Test' }}>
          {props => <BluetoothPermissionsTestScreen {...props} />}
        </Tab.Screen>

        {/* Location tracking test screen - for GPS diagnostic testing */}
        <Tab.Screen name="Location Test" options={{ title: 'GPS Test' }}>
          {props => <LocationTrackingTestScreen {...props} />}
        </Tab.Screen>

        {/* Trip detection test screen - for algorithm diagnostic testing */}
        <Tab.Screen name="Trip Detection" options={{ title: 'AI Test' }}>
          {props => <TripDetectionTestScreen {...props} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// Enhanced styles with support for new automatic detection UI elements
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
  trackerContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statsContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#333',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  enhancedStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#bbdefb',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 12,
    color: '#616161',
    marginTop: 4,
  },
  simulationContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    margin: 16,
    borderRadius: 8,
  },
  simulationText: {
    fontSize: 16,
    marginBottom: 4,
    textAlign: 'center',
    color: '#333',
    fontWeight: 'bold',
  },
  simulationSubtext: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
    color: '#666',
  },
  connectionStatus: {
    marginTop: 12,
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  statusContainer: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  statusLabel: {
    fontSize: 16,
    color: '#757575',
  },
  statusActive: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4caf50',
    marginVertical: 8,
  },
  statusInactive: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#9e9e9e',
    marginVertical: 8,
  },
  trackingDetails: {
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 6,
    marginVertical: 8,
  },
  trackingDetailText: {
    fontSize: 12,
    color: '#2e7d32',
    lineHeight: 16,
  },
  description: {
    color: '#757575',
    lineHeight: 18,
  },
  resetContainer: {
    margin: 16,
  },
});