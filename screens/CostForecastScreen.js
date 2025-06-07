// screens/MonthlyStatsScreen.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
import {
  LineChart,
  BarChart,
  PieChart,
  ProgressChart,
} from 'react-native-chart-kit';
import { format, addMonths, subMonths, getDaysInMonth, getMonth, getYear } from 'date-fns';

const screenWidth = Dimensions.get('window').width;

export default function MonthlyStatsScreen({ locationTracker }) {
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [monthlyStats, setMonthlyStats] = useState({
    totalMiles: 0,
    totalCost: 0,
    totalTrips: 0,
    dailyData: {},
    weekdayData: [],
    averageDailyMiles: 0,
    averageDailyCost: 0
  });

  // Chart configuration - this creates a consistent visual theme across all charts
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 1, // Shows one decimal place for precision without clutter
    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`, // Professional blue theme
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16 // Rounded corners for modern appearance
    },
    propsForDots: {
      r: '6', // Dot radius for line charts
      strokeWidth: '2',
      stroke: '#2196F3'
    }
  };

  // Load monthly data whenever the selected month changes
  useEffect(() => {
    loadMonthlyData();
  }, [selectedMonth]);

  const loadMonthlyData = async () => {
    try {
      setLoading(true);

      const storage = locationTracker.getTripStorage();

      // Extract year and month for database query
      const monthYear = getYear(selectedMonth);
      const monthNum = getMonth(selectedMonth) + 1; // JavaScript months are 0-indexed, convert to 1-12

      // Fetch the month summary from our storage system
      const monthSummary = await storage.getMonthSummary(monthYear, monthNum);

      // Handle case where no data exists for this month
      if (!monthSummary) {
        setMonthlyStats({
          totalMiles: 0,
          totalCost: 0,
          totalTrips: 0,
          dailyData: {},
          weekdayData: [],
          averageDailyMiles: 0,
          averageDailyCost: 0
        });
        setLoading(false);
        return;
      }

      // Calculate how many days are in this month for accurate averages
      const numDays = getDaysInMonth(selectedMonth);

      // Calculate weekday distribution to show travel patterns
      // This helps users understand if they drive more on certain days of the week
      const weekdayTotals = [0, 0, 0, 0, 0, 0, 0]; // Sunday through Saturday

      // Process each trip to accumulate weekday data
      monthSummary.trips.forEach(trip => {
        const weekday = new Date(trip.startTime).getDay(); // 0 = Sunday, 6 = Saturday
        weekdayTotals[weekday] += trip.distanceMiles;
      });

      // Convert weekday data to chart-friendly format with readable labels
      const weekdayData = [
        { name: 'Sun', population: weekdayTotals[0], color: '#FF6B6B', legendFontColor: '#7F7F7F', legendFontSize: 12 },
        { name: 'Mon', population: weekdayTotals[1], color: '#4ECDC4', legendFontColor: '#7F7F7F', legendFontSize: 12 },
        { name: 'Tue', population: weekdayTotals[2], color: '#45B7D1', legendFontColor: '#7F7F7F', legendFontSize: 12 },
        { name: 'Wed', population: weekdayTotals[3], color: '#96CEB4', legendFontColor: '#7F7F7F', legendFontSize: 12 },
        { name: 'Thu', population: weekdayTotals[4], color: '#FFEAA7', legendFontColor: '#7F7F7F', legendFontSize: 12 },
        { name: 'Fri', population: weekdayTotals[5], color: '#DDA0DD', legendFontColor: '#7F7F7F', legendFontSize: 12 },
        { name: 'Sat', population: weekdayTotals[6], color: '#98D8C8', legendFontColor: '#7F7F7F', legendFontSize: 12 }
      ].filter(day => day.population > 0); // Only show days with activity

      // Update state with all calculated statistics
      setMonthlyStats({
        totalMiles: monthSummary.totalMiles,
        totalCost: monthSummary.totalCost,
        totalTrips: monthSummary.totalTrips,
        averageDailyMiles: parseFloat((monthSummary.totalMiles / numDays).toFixed(2)),
        averageDailyCost: parseFloat((monthSummary.totalCost / numDays).toFixed(2)),
        dailyData: monthSummary.dailyData,
        weekdayData
      });

      setLoading(false);
    } catch (error) {
      console.error('Error loading monthly data:', error);
      setLoading(false);
    }
  };

  // Navigation functions for moving between months
  const goToPreviousMonth = () => {
    setSelectedMonth(prev => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setSelectedMonth(prev => addMonths(prev, 1));
  };

  // Prepare daily trend data for line chart visualization
  // This function transforms our daily data into the format expected by react-native-chart-kit
  const prepareDailyTrendData = () => {
    const numDays = getDaysInMonth(selectedMonth);
    const dailyMiles = [];
    const labels = [];

    // Create data points for each day of the month
    for (let day = 1; day <= numDays; day++) {
      const dayData = monthlyStats.dailyData[day] || { miles: 0, cost: 0, tripCount: 0 };
      dailyMiles.push(dayData.miles);

      // Only show labels for certain days to avoid crowding the x-axis
      if (day === 1 || day === 15 || day === numDays || day % 5 === 0) {
        labels.push(day.toString());
      } else {
        labels.push(''); // Empty string creates space without label
      }
    }

    // Return null if no data exists to avoid rendering empty charts
    if (dailyMiles.every(miles => miles === 0)) {
      return null;
    }

    return {
      labels,
      datasets: [
        {
          data: dailyMiles,
          color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`, // Blue line
          strokeWidth: 3 // Thick line for better visibility
        }
      ]
    };
  };

  // Prepare cost trend data - similar to miles but for cost tracking
  const prepareCostTrendData = () => {
    const numDays = getDaysInMonth(selectedMonth);
    const dailyCosts = [];
    const labels = [];

    for (let day = 1; day <= numDays; day++) {
      const dayData = monthlyStats.dailyData[day] || { miles: 0, cost: 0, tripCount: 0 };
      dailyCosts.push(dayData.cost);

      if (day === 1 || day === 15 || day === numDays || day % 5 === 0) {
        labels.push(day.toString());
      } else {
        labels.push('');
      }
    }

    if (dailyCosts.every(cost => cost === 0)) {
      return null;
    }

    return {
      labels,
      datasets: [
        {
          data: dailyCosts,
          color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`, // Green line for cost
          strokeWidth: 3
        }
      ]
    };
  };

  // Show loading spinner while data is being fetched
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading monthly statistics...</Text>
      </View>
    );
  }

  // Prepare chart data once loading is complete
  const dailyTrendData = prepareDailyTrendData();
  const costTrendData = prepareCostTrendData();

  return (
    <ScrollView style={styles.container}>
      {/* Month Navigation Header */}
      <View style={styles.dateSelector}>
        <TouchableOpacity style={styles.navButton} onPress={goToPreviousMonth}>
          <Text style={styles.navButtonText}>◀ Prev</Text>
        </TouchableOpacity>
        <Text style={styles.dateText}>
          {format(selectedMonth, 'MMMM yyyy')}
        </Text>
        <TouchableOpacity style={styles.navButton} onPress={goToNextMonth}>
          <Text style={styles.navButtonText}>Next ▶</Text>
        </TouchableOpacity>
      </View>

      {/* Monthly Summary Statistics */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{monthlyStats.totalTrips}</Text>
          <Text style={styles.summaryLabel}>Trips</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{monthlyStats.totalMiles}</Text>
          <Text style={styles.summaryLabel}>Miles</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>${monthlyStats.totalCost?.toFixed(2)}</Text>
          <Text style={styles.summaryLabel}>Cost</Text>
        </View>
      </View>

      {/* Average Daily Statistics */}
      <View style={styles.averageContainer}>
        <View style={styles.averageItem}>
          <Text style={styles.averageValue}>{monthlyStats.averageDailyMiles}</Text>
          <Text style={styles.averageLabel}>Avg Miles/Day</Text>
        </View>
        <View style={styles.averageItem}>
          <Text style={styles.averageValue}>${monthlyStats.averageDailyCost?.toFixed(2)}</Text>
          <Text style={styles.averageLabel}>Avg Cost/Day</Text>
        </View>
      </View>

      {/* Handle empty data state with helpful message */}
      {monthlyStats.totalTrips === 0 ? (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No trips recorded for this month</Text>
          <Text style={styles.noDataSubtext}>
            Start tracking trips to see monthly patterns and trends
          </Text>
        </View>
      ) : (
        <>
          {/* Daily Miles Trend Chart - shows patterns over the month */}
          {dailyTrendData && (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Daily Miles Trend</Text>
              <LineChart
                data={dailyTrendData}
                width={screenWidth - 32} // Responsive width
                height={220}
                chartConfig={chartConfig}
                style={styles.chart}
                withDots={true} // Show data points
                withInnerLines={false} // Clean appearance
                withOuterLines={true}
                withVerticalLines={false} // Reduces clutter
                withHorizontalLines={true} // Helps read values
              />
              <Text style={styles.chartDescription}>
                Track your daily driving patterns to identify busy and quiet periods
              </Text>
            </View>
          )}

          {/* Daily Cost Trend Chart - shows spending patterns */}
          {costTrendData && (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Daily Cost Trend</Text>
              <LineChart
                data={costTrendData}
                width={screenWidth - 32}
                height={220}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`, // Green theme for cost
                  propsForDots: {
                    r: '6',
                    strokeWidth: '2',
                    stroke: '#4CAF50'
                  }
                }}
                style={styles.chart}
                withDots={true}
                withInnerLines={false}
                withOuterLines={true}
                withVerticalLines={false}
                withHorizontalLines={true}
              />
              <Text style={styles.chartDescription}>
                Monitor daily expenses to stay within your monthly budget
              </Text>
            </View>
          )}

          {/* Weekday Distribution Pie Chart - shows which days you drive most */}
          {monthlyStats.weekdayData.length > 0 && (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Miles by Day of Week</Text>
              <PieChart
                data={monthlyStats.weekdayData}
                width={screenWidth - 32}
                height={220}
                chartConfig={chartConfig}
                accessor="population" // Which field contains the values
                backgroundColor="transparent"
                paddingLeft="15"
                style={styles.chart}
              />
              <Text style={styles.chartDescription}>
                Understand your weekly driving patterns and plan accordingly
              </Text>
            </View>
          )}

          {/* Monthly Summary Text Analysis */}
          <View style={styles.monthSummary}>
            <Text style={styles.sectionTitle}>Monthly Analysis</Text>
            <Text style={styles.summaryText}>
              This month you drove {monthlyStats.totalMiles} miles across {monthlyStats.totalTrips} trips,
              costing a total of ${monthlyStats.totalCost?.toFixed(2)}.
            </Text>
            <Text style={styles.summaryText}>
              Your average daily distance was {monthlyStats.averageDailyMiles} miles at a cost of
              ${monthlyStats.averageDailyCost?.toFixed(2)} per day.
            </Text>
            {monthlyStats.weekdayData.length > 0 && (
              <Text style={styles.summaryText}>
                Your busiest day of the week was {monthlyStats.weekdayData
                  .reduce((max, day) => day.population > max.population ? day : max)
                  .name}day with {monthlyStats.weekdayData
                  .reduce((max, day) => day.population > max.population ? day : max)
                  .population.toFixed(1)} miles.
              </Text>
            )}
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
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#757575',
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
    minWidth: 60,
  },
  navButtonText: {
    color: '#2196F3',
    fontWeight: 'bold',
    fontSize: 16,
  },
  dateText: {
    fontSize: 18,
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
  chartDescription: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    fontStyle: 'italic',
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
  monthSummary: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    color: '#555',
  },
});