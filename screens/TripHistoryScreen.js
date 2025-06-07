// screens/TripHistoryScreen.js - Expo Go Compatible Version
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isYesterday, differenceInDays } from 'date-fns';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function TripHistoryScreen({ locationTracker }) {
  // State management for the complex interface
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState([]); // All trip data
  const [selectedTrip, setSelectedTrip] = useState(null); // Currently selected trip for detail view
  const [viewMode, setViewMode] = useState('list'); // 'list', 'map', or 'detail'
  const [mapData, setMapData] = useState(null); // Processed data for map rendering

  // Refs for controlling WebView behavior
  const webViewRef = useRef(null);

  // Initialize the screen by loading trip data
  useEffect(() => {
    loadTripHistory();
  }, []);

  /**
   * Load all trip data and prepare it for map visualization
   * This demonstrates how to process location data for web-based mapping
   */
  const loadTripHistory = async () => {
    try {
      setLoading(true);

      const storage = locationTracker.getTripStorage();

      // Get all trips sorted by most recent first
      const allTrips = await storage.getAllTrips();
      const sortedTrips = allTrips.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

      // Process trips to ensure they have valid coordinate data for mapping
      const processedTrips = sortedTrips.map((trip, index) => ({
        ...trip,
        // Add display properties for better UI
        displayIndex: index + 1,
        formattedDate: formatTripDate(new Date(trip.startTime)),
        // Ensure coordinates are valid numbers (sometimes GPS data can be corrupted)
        coordinates: trip.coordinates ? trip.coordinates.filter(coord =>
          coord.latitude && coord.longitude &&
          !isNaN(coord.latitude) && !isNaN(coord.longitude) &&
          Math.abs(coord.latitude) <= 90 && Math.abs(coord.longitude) <= 180
        ) : [],
        // Generate color for this trip route
        color: getTripColor(index)
      }));

      // Filter out trips without valid coordinate data
      const tripsWithCoordinates = processedTrips.filter(trip =>
        trip.coordinates && trip.coordinates.length >= 2
      );

      setTrips(processedTrips);

      // Prepare map data for WebView rendering
      if (tripsWithCoordinates.length > 0) {
        const mapDataForWebView = {
          trips: tripsWithCoordinates.map(trip => ({
            id: trip.id,
            coordinates: trip.coordinates,
            color: trip.color,
            startTime: trip.startTime,
            endTime: trip.endTime,
            distance: trip.distanceMiles,
            cost: trip.cost,
            formattedDate: trip.formattedDate
          })),
          bounds: calculateOverallBounds(tripsWithCoordinates)
        };
        setMapData(mapDataForWebView);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading trip history:', error);
      Alert.alert('Error', 'Failed to load trip history');
      setLoading(false);
    }
  };

  /**
   * Calculate the overall geographical bounds for all trips
   * This helps us set an appropriate initial view for the map
   */
  const calculateOverallBounds = (trips) => {
    const allCoordinates = trips.flatMap(trip => trip.coordinates || []);

    if (allCoordinates.length === 0) return null;

    let minLat = allCoordinates[0].latitude;
    let maxLat = allCoordinates[0].latitude;
    let minLng = allCoordinates[0].longitude;
    let maxLng = allCoordinates[0].longitude;

    allCoordinates.forEach(coord => {
      minLat = Math.min(minLat, coord.latitude);
      maxLat = Math.max(maxLat, coord.latitude);
      minLng = Math.min(minLng, coord.longitude);
      maxLng = Math.max(maxLng, coord.longitude);
    });

    return {
      north: maxLat,
      south: minLat,
      east: maxLng,
      west: minLng,
      center: {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2
      }
    };
  };

  /**
   * Format trip dates in a user-friendly way
   * This creates familiar date references like "Today", "Yesterday", etc.
   */
  const formatTripDate = (date) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';

    const daysAgo = differenceInDays(new Date(), date);
    if (daysAgo < 7) return `${daysAgo} days ago`;

    return format(date, 'MMM d, yyyy');
  };

  /**
   * Handle trip selection for detailed view
   * This demonstrates how to communicate between React Native and WebView
   */
  const handleTripSelect = (trip) => {
    setSelectedTrip(trip);
    setViewMode('detail');

    // Send message to WebView to focus on this specific trip
    if (webViewRef.current && trip.coordinates && trip.coordinates.length > 0) {
      const message = JSON.stringify({
        type: 'focusTrip',
        tripId: trip.id,
        coordinates: trip.coordinates
      });
      webViewRef.current.postMessage(message);
    }
  };

  /**
   * Generate colors for trip routes to distinguish between different trips
   * This uses a carefully chosen color palette for good contrast
   */
  const getTripColor = (tripIndex) => {
    const colors = [
      '#2196F3', // Blue
      '#4CAF50', // Green
      '#FF9800', // Orange
      '#9C27B0', // Purple
      '#F44336', // Red
      '#00BCD4', // Cyan
      '#FFEB3B', // Yellow
      '#795548', // Brown
    ];
    return colors[tripIndex % colors.length];
  };

  /**
   * Generate the HTML content for the WebView map
   * This demonstrates how to create hybrid web-native interfaces
   */
  const generateMapHTML = () => {
    if (!mapData) return '<html><body><p>Loading map...</p></body></html>';

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Trip History Map</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
            #map { height: 100vh; width: 100%; }
            .trip-popup {
                font-size: 14px;
                line-height: 1.4;
            }
            .trip-popup h3 {
                margin: 0 0 8px 0;
                color: #333;
                font-size: 16px;
            }
            .trip-popup p {
                margin: 4px 0;
                color: #666;
            }
            .loading {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                z-index: 1000;
            }
        </style>
    </head>
    <body>
        <div id="loading" class="loading">Loading map...</div>
        <div id="map"></div>
        
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
            // Initialize the map
            const map = L.map('map');
            
            // Add OpenStreetMap tiles (free and doesn't require API keys)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 18
            }).addTo(map);
            
            // Store trip data
            const tripData = ${JSON.stringify(mapData)};
            
            // Function to create popup content for trips
            function createTripPopup(trip) {
                const startDate = new Date(trip.startTime).toLocaleDateString();
                const startTime = new Date(trip.startTime).toLocaleTimeString();
                
                return \`
                <div class="trip-popup">
                    <h3>Trip Details</h3>
                    <p><strong>Date:</strong> \${trip.formattedDate}</p>
                    <p><strong>Time:</strong> \${startTime}</p>
                    <p><strong>Distance:</strong> \${trip.distance.toFixed(2)} miles</p>
                    <p><strong>Cost:</strong> $\${trip.cost.toFixed(2)}</p>
                </div>
                \`;
            }
            
            // Add trip routes to the map
            const tripLayers = [];
            
            if (tripData && tripData.trips) {
                tripData.trips.forEach((trip, index) => {
                    if (trip.coordinates && trip.coordinates.length >= 2) {
                        // Create the route line
                        const route = L.polyline(
                            trip.coordinates.map(coord => [coord.latitude, coord.longitude]),
                            {
                                color: trip.color,
                                weight: 3,
                                opacity: 0.8
                            }
                        ).addTo(map);
                        
                        // Add popup with trip details
                        route.bindPopup(createTripPopup(trip));
                        
                        // Add start marker
                        L.marker([trip.coordinates[0].latitude, trip.coordinates[0].longitude])
                            .addTo(map)
                            .bindPopup('Trip Start<br>' + trip.formattedDate);
                        
                        // Add end marker
                        const lastCoord = trip.coordinates[trip.coordinates.length - 1];
                        L.marker([lastCoord.latitude, lastCoord.longitude])
                            .addTo(map)
                            .bindPopup('Trip End<br>' + trip.formattedDate);
                        
                        tripLayers.push(route);
                    }
                });
                
                // Fit map to show all trips
                if (tripLayers.length > 0) {
                    const group = new L.featureGroup(tripLayers);
                    map.fitBounds(group.getBounds().pad(0.1));
                }
            }
            
            // Hide loading indicator
            document.getElementById('loading').style.display = 'none';
            
            // Listen for messages from React Native
            window.addEventListener('message', function(event) {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.type === 'focusTrip') {
                        // Find and focus on specific trip
                        const trip = tripData.trips.find(t => t.id === data.tripId);
                        if (trip && trip.coordinates.length > 0) {
                            const bounds = L.latLngBounds(
                                trip.coordinates.map(coord => [coord.latitude, coord.longitude])
                            );
                            map.fitBounds(bounds.pad(0.2));
                        }
                    }
                } catch (error) {
                    console.error('Error processing message:', error);
                }
            });
            
            // Send ready message to React Native
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'mapReady',
                    tripCount: tripData.trips.length
                }));
            }
        </script>
    </body>
    </html>
    `;
  };

  // Show loading state while data is being processed
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading trip history...</Text>
      </View>
    );
  }

  // Handle empty state when no trips exist
  if (trips.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="map-outline" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>No Trips Yet</Text>
        <Text style={styles.emptySubtitle}>
          Start tracking your trips to see them visualized on the map
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with view mode controls */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trip History</Text>
        <View style={styles.headerControls}>
          <TouchableOpacity
            style={[styles.controlButton, viewMode === 'list' && styles.controlButtonActive]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons name="list" size={20} color={viewMode === 'list' ? '#fff' : '#2196F3'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlButton, viewMode === 'map' && styles.controlButtonActive]}
            onPress={() => setViewMode('map')}
          >
            <Ionicons name="map" size={20} color={viewMode === 'map' ? '#fff' : '#2196F3'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main content area - changes based on view mode */}
      {viewMode === 'list' ? (
        // List view with trip summaries
        <ScrollView style={styles.listContainer}>
          <Text style={styles.listNote}>
            Tap any trip to view detailed route information
          </Text>
          {trips.map((trip, index) => (
            <TouchableOpacity
              key={trip.id}
              style={styles.tripItem}
              onPress={() => handleTripSelect(trip)}
            >
              <View style={styles.tripHeader}>
                <View style={styles.tripInfo}>
                  <Text style={styles.tripDate}>{trip.formattedDate}</Text>
                  <Text style={styles.tripTime}>
                    {format(new Date(trip.startTime), 'h:mm a')}
                  </Text>
                </View>
                <View style={styles.tripStats}>
                  <Text style={styles.tripDistance}>{trip.distanceMiles.toFixed(1)} mi</Text>
                  <Text style={styles.tripCost}>${trip.cost.toFixed(2)}</Text>
                </View>
              </View>

              {/* Trip summary information */}
              <View style={styles.tripSummary}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Duration</Text>
                  <Text style={styles.summaryValue}>{trip.durationMinutes} min</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Coordinates</Text>
                  <Text style={styles.summaryValue}>
                    {trip.coordinates ? trip.coordinates.length : 0} points
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Route Color</Text>
                  <View style={[styles.colorIndicator, { backgroundColor: trip.color }]} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : viewMode === 'map' ? (
        // Full-screen map view using WebView
        <View style={styles.mapContainer}>
          {mapData ? (
            <WebView
              ref={webViewRef}
              source={{ html: generateMapHTML() }}
              style={styles.webMap}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              onMessage={(event) => {
                try {
                  const data = JSON.parse(event.nativeEvent.data);
                  if (data.type === 'mapReady') {
                    console.log('Map loaded with', data.tripCount, 'trips');
                  }
                } catch (error) {
                  console.error('Error processing WebView message:', error);
                }
              }}
            />
          ) : (
            <View style={styles.mapLoadingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={styles.mapLoadingText}>Preparing map data...</Text>
            </View>
          )}
        </View>
      ) : (
        // Detail view for selected trip
        <Modal
          visible={viewMode === 'detail'}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setViewMode('list')}
        >
          <View style={styles.detailContainer}>
            <View style={styles.detailHeader}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setViewMode('list')}
              >
                <Ionicons name="arrow-back" size={24} color="#2196F3" />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
              <Text style={styles.detailTitle}>Trip Details</Text>
            </View>

            {selectedTrip && (
              <>
                {/* Trip statistics */}
                <View style={styles.detailStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Date</Text>
                    <Text style={styles.statValue}>{selectedTrip.formattedDate}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Duration</Text>
                    <Text style={styles.statValue}>{selectedTrip.durationMinutes} min</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Distance</Text>
                    <Text style={styles.statValue}>{selectedTrip.distanceMiles.toFixed(2)} mi</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Cost</Text>
                    <Text style={styles.statValue}>${selectedTrip.cost.toFixed(2)}</Text>
                  </View>
                </View>

                {/* Detailed map view for this specific trip */}
                {selectedTrip.coordinates && selectedTrip.coordinates.length > 0 && (
                  <View style={styles.detailMapContainer}>
                    <WebView
                      ref={webViewRef}
                      source={{
                        html: generateMapHTML()
                      }}
                      style={styles.detailMap}
                      javaScriptEnabled={true}
                      domStorageEnabled={true}
                    />
                  </View>
                )}

                {/* Additional trip information */}
                <View style={styles.tripMetadata}>
                  <Text style={styles.metadataTitle}>Trip Metadata</Text>
                  <Text style={styles.metadataItem}>
                    Start Time: {format(new Date(selectedTrip.startTime), 'MMM d, yyyy h:mm a')}
                  </Text>
                  {selectedTrip.endTime && (
                    <Text style={styles.metadataItem}>
                      End Time: {format(new Date(selectedTrip.endTime), 'MMM d, yyyy h:mm a')}
                    </Text>
                  )}
                  <Text style={styles.metadataItem}>
                    GPS Points Recorded: {selectedTrip.coordinates ? selectedTrip.coordinates.length : 0}
                  </Text>
                  <Text style={styles.metadataItem}>
                    Route Color: {selectedTrip.color}
                  </Text>
                </View>
              </>
            )}
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#757575',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    lineHeight: 22,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerControls: {
    flexDirection: 'row',
  },
  controlButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  controlButtonActive: {
    backgroundColor: '#2196F3',
  },
  listContainer: {
    flex: 1,
  },
  listNote: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    padding: 16,
    backgroundColor: '#f9f9f9',
    fontStyle: 'italic',
  },
  tripItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  tripInfo: {
    flex: 1,
  },
  tripDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  tripTime: {
    fontSize: 14,
    color: '#757575',
  },
  tripStats: {
    alignItems: 'flex-end',
  },
  tripDistance: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  tripCost: {
    fontSize: 14,
    color: '#4CAF50',
  },
  tripSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 8,
    paddingTop: 12,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  colorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  mapContainer: {
    flex: 1,
  },
  webMap: {
    flex: 1,
  },
  mapLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapLoadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#757575',
  },
  detailContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#2196F3',
    fontSize: 16,
    marginLeft: 4,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 16,
  },
  detailStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  statItem: {
    width: '50%',
    marginBottom: 16,
  },
  statLabel: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  detailMapContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  detailMap: {
    flex: 1,
  },
  tripMetadata: {
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  metadataTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  metadataItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
});