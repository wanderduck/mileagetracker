// screens/WeeklyStatsScreen.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
import {
  LineChart,
  BarChart,
  StackedBarChart,
  ProgressChart,
} from 'react-native-chart-kit';
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, getISOWeek } from 'date-fns';

const screenWidth = Dimensions.get('window').width;

export default function WeeklyStatsScreen({ locationTracker }) {
  const [loading, setLoading] = useState(true);
  const [selectedWeekStart, setSelectedWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [weeklyStats, setWeeklyStats] = useState({
    totalMiles: 0,
    totalCost: 0,
    totalTrips: 0,
    averageDailyMiles: 0,
    averageDailyCost: 0,
    dailyData: []
  });

  // Chart configuration with a professional blue theme
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
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

  // Combined chart configuration for miles and cost
  const combinedChartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16
    }
  };

  useEffect(() => {
    loadWeeklyData();
  }, [selectedWeekStart]);

  const loadWeeklyData = async () => {
    try {
      setLoading(true);

      const storage = locationTracker.getTripStorage();

      // Calculate the week's start and end dates
      const weekEnd = endOfWeek(selectedWeekStart, { weekStartsOn: 0 });

      // Get all trips for the week
      const weekTrips = await storage.getTripsInRange(selectedWeekStart, weekEnd);

      // Calculate week statistics
      const totalMiles = weekTrips.reduce((sum, trip) => sum + trip.distanceMiles, 0);
      const totalCost = weekTrips.reduce((sum, trip) => sum + trip.cost, 0);

      // Generate daily breakdown
      const daysInWeek = eachDayOfInterval({ start: selectedWeekStart, end: weekEnd });

      const dailyData = daysInWeek.map(day => {
        const dayTrips = weekTrips.filter(trip => {
          const tripDate = new Date(trip.startTime);
          return tripDate.getDate() === day.getDate() &&
                 tripDate.getMonth() === day.getMonth() &&
                 tripDate.getFullYear() === day.getFullYear();
        });

        const dayMiles = dayTrips.reduce((sum, trip) => sum + trip.distanceMiles, 0);
        const dayCost = dayTrips.reduce((sum, trip) => sum + trip.cost, 0);

        return {
          date: day,
          dayOfWeek: format(day, 'E'), // Mon, Tue, etc.
          day: format(day, 'd'),
          month: format(day, 'MMM'),
          miles: parseFloat(dayMiles.toFixed(2)),
          cost: parseFloat(dayCost.toFixed(2)),
          trips: dayTrips.length
        };
      });

      setWeeklyStats({
        totalMiles: parseFloat(totalMiles.toFixed(2)),
        totalCost: parseFloat(totalCost.toFixed(2)),
        totalTrips: weekTrips.length,
        averageDailyMiles: parseFloat((totalMiles / 7).toFixed(2)),
        averageDailyCost: parseFloat((totalCost / 7).toFixed(2)),
        dailyData
      });

      setLoading(false);
    } catch (error) {
      console.error('Error loading weekly data:', error);
      setLoading(false);
    }
  };

  // Navigate to previous week
  const goToPreviousWeek = () => {
    setSelectedWeekStart(prev => subWeeks(prev, 1));
  };

  // Navigate to next week
  const goToNextWeek = () => {
    setSelectedWeekStart(prev => addWeeks(prev, 1));
  };

  // Prepare data for the daily miles and cost combined chart
  const prepareCombinedChartData = () => {
    // Only show days that have activity for cleaner visualization
    const activeDays = weeklyStats.dailyData.filter(day => day.miles > 0 || day.cost > 0);

    if (activeDays.length === 0) {
      return null;
    }

    return {
      labels: activeDays.map(day => day.dayOfWeek),
      datasets: [
        {
          data: activeDays.map(day => day.miles),
          color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`, // Blue for miles
          strokeWidth: 3
        },
        {
          data: activeDays.map(day => day.cost),
          color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`, // Green for cost
          strokeWidth: 3
        }
      ],
      legend: ["Miles", "Cost ($)"]
    };
  };

  // Prepare stacked bar chart data showing miles and cost together
  const prepareStackedChartData = () => {
    const activeDays = weeklyStats.dailyData.filter(day => day.miles > 0 || day.cost > 0);

    if (activeDays.length === 0) {
      return null;
    }

    return {
      labels: activeDays.map(day => day.dayOfWeek),
      data: activeDays.map(day => [day.miles, day.cost * 10]), // Scale cost by 10 to make it visible alongside miles
      barColors: ["#2196F3", "#4CAF50"], // Blue for miles, green for cost
      legend: ["Miles", "Cost ($×10)"]
    };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text>Loading weekly statistics...</Text>
      </View>
    );
  }

  const combinedChartData = prepareCombinedChartData();
  const stackedChartData = prepareStackedChartData();

  return (
    <ScrollView style={styles.container}>
      {/* Week Navigation Header */}
      <View style={styles.dateSelector}>
        <TouchableOpacity style={styles.navButton} onPress={goToPreviousWeek}>
          <Text style={styles.navButtonText}>◀ Prev</Text>
        </TouchableOpacity>
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>
            Week {getISOWeek(selectedWeekStart)}, {format(selectedWeekStart, 'yyyy')}
          </Text>
          <Text style={styles.dateRange}>
            {format(selectedWeekStart, 'MMM d')} - {format(endOfWeek(selectedWeekStart, { weekStartsOn: 0 }), 'MMM d')}
          </Text>
        </View>
        <TouchableOpacity style={styles.navButton} onPress={goToNextWeek}>
          <Text style={styles.navButtonText}>Next ▶</Text>
        </TouchableOpacity>
      </View>

      {/* Weekly Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{weeklyStats.totalTrips}</Text>
          <Text style={styles.summaryLabel}>Trips</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{weeklyStats.totalMiles}</Text>
          <Text style={styles.summaryLabel}>Miles</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>${weeklyStats.totalCost.toFixed(2)}</Text>
          <Text style={styles.summaryLabel}>Cost</Text>
        </View>
      </View>

      {/* Average Stats */}
      <View style={styles.averageContainer}>
        <View style={styles.averageItem}>
          <Text style={styles.averageValue}>{weeklyStats.averageDailyMiles}</Text>
          <Text style={styles.averageLabel}>Avg Miles/Day</Text>
        </View>
        <View style={styles.averageItem}>
          <Text style={styles.averageValue}>${weeklyStats.averageDailyCost.toFixed(2)}</Text>
          <Text style={styles.averageLabel}>Avg Cost/Day</Text>
        </View>
      </View>

      {weeklyStats.totalTrips === 0 ? (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No trips recorded for this week</Text>
          <Text style={styles.noDataSubtext}>
            Start tracking trips to see your weekly travel patterns
          </Text>
        </View>
      ) : (
        <>
          {/* Combined Line Chart for Miles and Cost */}
          {combinedChartData && (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Daily Miles & Cost Trends</Text>
              <LineChart
                data={combinedChartData}
                width={screenWidth - 32}
                height={250}
                chartConfig={combinedChartConfig}
                style={styles.chart}
                withDots={true}
                withInnerLines={false}
                withOuterLines={true}
                withVerticalLines={false}
                withHorizontalLines={true}
              />
              <View style={styles.legendContainer}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: '#2196F3' }]} />
                  <Text style={styles.legendText}>Miles</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
                  <Text style={styles.legendText}>Cost ($)</Text>
                </View>
              </View>
            </View>
          )}

          {/* Stacked Bar Chart */}
          {stackedChartData && (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Daily Miles vs Cost Comparison</Text>
              <StackedBarChart
                data={stackedChartData}
                width={screenWidth - 32}
                height={220}
                chartConfig={chartConfig}
                style={styles.chart}
              />
              <Text style={styles.chartNote}>
                * Cost values are multiplied by 10 for better visualization
              </Text>
            </View>
          )}

          {/* Daily Breakdown Table */}
          <View style={styles.dailyBreakdownContainer}>
            <Text style={styles.sectionTitle}>Daily Breakdown</Text>
            {weeklyStats.dailyData.map((day, index) => (
              <View key={index} style={[
                styles.dayItem,
                day.trips === 0 ? styles.dayItemInactive : styles.dayItemActive
              ]}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayName}>{day.dayOfWeek}</Text>
                  <Text style={styles.dayDate}>{day.month} {day.day}</Text>
                </View>
                <View style={styles.dayStats}>
                  <View style={styles.dayStatItem}>
                    <Text style={styles.dayStatLabel}>Trips</Text>
                    <Text style={styles.dayStatValue}>{day.trips}</Text>
                  </View>
                  <View style={styles.dayStatItem}>
                    <Text style={styles.dayStatLabel}>Miles</Text>
                    <Text style={styles.dayStatValue}>{day.miles}</Text>
                  </View>
                  <View style={styles.dayStatItem}>
                    <Text style={styles.dayStatLabel}>Cost</Text>
                    <Text style={styles.dayStatValue}>${day.cost.toFixed(2)}</Text>
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
  dateContainer: {
    alignItems: 'center',
    flex: 1,
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
  },
  dateRange: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginTop: 4,
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
  averageContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#e8f5e9',
    justifyContent: 'space-around',
  },
  averageItem: {
    alignItems: 'center',
    flex: 1,
  },
  averageValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  averageLabel: {
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
  chartNote: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 14,
    color: '#333',
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
  dailyBreakdownContainer: {
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  dayItem: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  dayItemActive: {
    backgroundColor: '#fff',
  },
  dayItemInactive: {
    backgroundColor: '#f9f9f9',
    opacity: 0.7,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  dayDate: {
    fontSize: 14,
    color: '#757575',
  },
  dayStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  dayStatLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  dayStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
});