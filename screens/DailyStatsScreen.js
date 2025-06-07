// screens/DailyStatsScreen.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
import {
  LineChart,
  BarChart,
  PieChart,
  ProgressChart,
  ContributionGraph,
  StackedBarChart
} from 'react-native-chart-kit';
import { format, addDays, subDays, startOfDay, endOfDay } from 'date-fns';

// Get screen dimensions for responsive charts
const screenWidth = Dimensions.get('window').width;

export default function DailyStatsScreen({ locationTracker }) {
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [trips, setTrips] = useState([]);
  const [dailyStats, setDailyStats] = useState({
    totalMiles: 0,
    totalCost: 0,
    totalTrips: 0,
    hourlyData: []
  });

  // Chart configuration for consistent styling
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 1, // Number of decimal places for values
    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`, // Blue color
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#2196F3'
    }
  };

  // Cost chart configuration (green theme)
  const costChartConfig = {
    ...chartConfig,
    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`, // Green color
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#4CAF50'
    }
  };

  // Load trip data for the selected date
  useEffect(() => {
    loadDailyData();
  }, [selectedDate]);

  const loadDailyData = async () => {
    try {
      setLoading(true);

      const storage = locationTracker.getTripStorage();

      // Get trips for the selected date
      const dateTrips = await storage.getTripsForDate(selectedDate);
      setTrips(dateTrips);

      // Calculate daily statistics
      const totalMiles = dateTrips.reduce((sum, trip) => sum + trip.distanceMiles, 0);
      const totalCost = dateTrips.reduce((sum, trip) => sum + trip.cost, 0);

      // Group trips by hour for charts
      const hourlyData = [];
      for (let hour = 0; hour < 24; hour++) {
        const hourTrips = dateTrips.filter(trip => {
          const tripHour = new Date(trip.startTime).getHours();
          return tripHour === hour;
        });

        hourlyData.push({
          hour,
          displayHour: hour === 0 ? '12am' : hour === 12 ? '12pm' : hour < 12 ? `${hour}am` : `${hour-12}pm`,
          miles: hourTrips.reduce((sum, trip) => sum + trip.distanceMiles, 0),
          cost: hourTrips.reduce((sum, trip) => sum + trip.cost, 0),
          trips: hourTrips.length
        });
      }

      setDailyStats({
        totalMiles: parseFloat(totalMiles.toFixed(2)),
        totalCost: parseFloat(totalCost.toFixed(2)),
        totalTrips: dateTrips.length,
        hourlyData
      });

      setLoading(false);
    } catch (error) {
      console.error('Error loading daily data:', error);
      setLoading(false);
    }
  };

  // Navigate to previous day
  const goToPreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  // Navigate to next day
  const goToNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  // Prepare chart data for hourly miles
  const prepareHourlyMilesData = () => {
    // Filter out hours with no activity for cleaner charts
    const activeHours = dailyStats.hourlyData.filter(d => d.miles > 0);

    if (activeHours.length === 0) {
      return null;
    }

    return {
      labels: activeHours.map(d => d.hour < 12 ? (d.hour === 0 ? '12a' : `${d.hour}a`) : (d.hour === 12 ? '12p' : `${d.hour-12}p`)),
      datasets: [
        {
          data: activeHours.map(d => d.miles),
          color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`, // Blue
          strokeWidth: 2
        }
      ]
    };
  };

  // Prepare chart data for hourly costs
  const prepareHourlyCostData = () => {
    const activeHours = dailyStats.hourlyData.filter(d => d.cost > 0);

    if (activeHours.length === 0) {
      return null;
    }

    return {
      labels: activeHours.map(d => d.hour < 12 ? (d.hour === 0 ? '12a' : `${d.hour}a`) : (d.hour === 12 ? '12p' : `${d.hour-12}p`)),
      datasets: [
        {
          data: activeHours.map(d => d.cost),
          color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`, // Green
          strokeWidth: 2
        }
      ]
    };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text>Loading daily statistics...</Text>
      </View>
    );
  }

  // Prepare chart data
  const hourlyMilesData = prepareHourlyMilesData();
  const hourlyCostData = prepareHourlyCostData();

  return (
    <ScrollView style={styles.container}>
      {/* Date Navigation Header */}
      <View style={styles.dateSelector}>
        <TouchableOpacity style={styles.navButton} onPress={goToPreviousDay}>
          <Text style={styles.navButtonText}>◀ Prev</Text>
        </TouchableOpacity>
        <Text style={styles.dateText}>
          {format(selectedDate, 'EEEE, MMMM d, yyyy')}
        </Text>
        <TouchableOpacity style={styles.navButton} onPress={goToNextDay}>
          <Text style={styles.navButtonText}>Next ▶</Text>
        </TouchableOpacity>
      </View>

      {/* Daily Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{dailyStats.totalTrips}</Text>
          <Text style={styles.summaryLabel}>Trips</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{dailyStats.totalMiles}</Text>
          <Text style={styles.summaryLabel}>Miles</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>${dailyStats.totalCost.toFixed(2)}</Text>
          <Text style={styles.summaryLabel}>Cost</Text>
        </View>
      </View>

      {/* Show message if no trips */}
      {dailyStats.totalTrips === 0 ? (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No trips recorded for this day</Text>
          <Text style={styles.noDataSubtext}>
            Connect to your car's Bluetooth to start tracking trips automatically
          </Text>
        </View>
      ) : (
        <>
          {/* Hourly Miles Chart */}
          {hourlyMilesData && (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Hourly Miles Distribution</Text>
              <BarChart
                data={hourlyMilesData}
                width={screenWidth - 32} // Account for padding
                height={220}
                chartConfig={chartConfig}
                verticalLabelRotation={0}
                style={styles.chart}
                showValuesOnTopOfBars={true}
              />
            </View>
          )}

          {/* Hourly Cost Chart */}
          {hourlyCostData && (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Hourly Cost Distribution</Text>
              <LineChart
                data={hourlyCostData}
                width={screenWidth - 32}
                height={220}
                chartConfig={costChartConfig}
                style={styles.chart}
                withDots={true}
                withInnerLines={false}
                withOuterLines={true}
                withVerticalLines={false}
                withHorizontalLines={true}
              />
            </View>
          )}

          {/* Trip Details List */}
          <View style={styles.tripsContainer}>
            <Text style={styles.sectionTitle}>Trip Details</Text>
            {trips.map((trip, index) => (
              <View key={trip.id} style={styles.tripItem}>
                <View style={styles.tripHeader}>
                  <Text style={styles.tripTime}>
                    {format(new Date(trip.startTime), 'h:mm a')} - {format(new Date(trip.endTime || trip.startTime), 'h:mm a')}
                  </Text>
                  <Text style={styles.tripIndex}>Trip #{index + 1}</Text>
                </View>
                <View style={styles.tripDetails}>
                  <View style={styles.tripDetailItem}>
                    <Text style={styles.tripDetailLabel}>Distance</Text>
                    <Text style={styles.tripDetailValue}>{trip.distanceMiles.toFixed(2)} mi</Text>
                  </View>
                  <View style={styles.tripDetailItem}>
                    <Text style={styles.tripDetailLabel}>Cost</Text>
                    <Text style={styles.tripDetailValue}>${trip.cost.toFixed(2)}</Text>
                  </View>
                  <View style={styles.tripDetailItem}>
                    <Text style={styles.tripDetailLabel}>Duration</Text>
                    <Text style={styles.tripDetailValue}>{trip.durationMinutes} min</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
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
  },
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  navButton: {
    padding: 8,
  },
  navButtonText: {
    color: '#2196F3',
    fontWeight: 'bold',
    fontSize: 16,
  },
  dateText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#e3f2fd',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  chartContainer: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#333',
  },
  chart: {
    borderRadius: 16,
  },
  noDataContainer: {
    padding: 32,
    alignItems: 'center',
    margin: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  noDataText: {
    fontSize: 18,
    color: '#757575',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#9e9e9e',
    textAlign: 'center',
    lineHeight: 20,
  },
  tripsContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  tripItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tripTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  tripIndex: {
    fontSize: 14,
    color: '#757575',
    fontStyle: 'italic',
  },
  tripDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tripDetailItem: {
    alignItems: 'center',
    flex: 1,
  },
  tripDetailLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  tripDetailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
});