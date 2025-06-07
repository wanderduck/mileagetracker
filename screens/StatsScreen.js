// StatsScreen.js - Enhanced Analytics with Automatic Detection Insights
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Dimensions,
  Alert
} from 'react-native';

const { width } = Dimensions.get('window');

/**
 * Enhanced StatsScreen Component
 *
 * This component provides comprehensive analytics that combine traditional trip
 * statistics with insights from automatic trip detection. Think of this as the
 * analytics dashboard for your mileage tracking system - it shows not just what
 * happened, but how well the system performed in detecting and recording trips.
 *
 * The enhanced analytics help users understand:
 * - Traditional metrics like total trips, miles, and costs
 * - Automatic detection performance and data quality
 * - Trip patterns and trends over time
 * - System reliability and accuracy insights
 */
export default function StatsScreen({ locationTracker, integratedTripManager }) {
  // State management for comprehensive analytics data
  const [statistics, setStatistics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load statistics when component mounts or dependencies change
  useEffect(() => {
    loadStatistics();
  }, [locationTracker, integratedTripManager]);

  /**
   * Load Comprehensive Statistics
   *
   * This method loads both traditional trip statistics and enhanced insights
   * from automatic detection analysis. It gracefully handles cases where the
   * integrated system isn't available and falls back to basic statistics.
   */
  const loadStatistics = async () => {
    try {
      setIsLoading(true);

      let stats;

      // Try to get enhanced statistics from the integrated system first
      if (integratedTripManager) {
        console.log('Loading enhanced statistics with automatic detection insights...');
        stats = await integratedTripManager.getEnhancedTripStatistics();

        // Add additional analysis for the stats display
        stats = await enhanceStatisticsWithAnalysis(stats);
      } else if (locationTracker) {
        console.log('Loading basic statistics from existing system...');
        stats = await loadBasicStatistics();
      } else {
        throw new Error('No tracking system available');
      }

      setStatistics(stats);
      setLastUpdated(new Date());

      console.log('Statistics loaded successfully:', {
        totalTrips: stats.totalTrips,
        automaticTrips: stats.automaticTripsCount || 0,
        dataQuality: stats.dataQualityPercentage || 0
      });

    } catch (error) {
      console.error('Error loading statistics:', error);
      Alert.alert(
        'Statistics Error',
        'Failed to load trip statistics. Please try again.'
      );
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Enhance Statistics with Additional Analysis
   *
   * This method adds derived metrics and insights that help users understand
   * their trip patterns and the performance of automatic detection systems.
   * Now with comprehensive null checking to prevent undefined errors.
   */
  const enhanceStatisticsWithAnalysis = async (baseStats) => {
    try {
      // Get raw trip data for additional analysis
      const storage = locationTracker.getTripStorage();
      const allTrips = await storage.getAllTrips();

      // Ensure all trips have required fields with defaults
      const normalizedTrips = allTrips.map(trip => ({
        ...trip,
        distanceMiles: parseFloat(trip.distanceMiles) || 0,
        cost: parseFloat(trip.cost) || 0,
        duration: parseInt(trip.duration) || (parseInt(trip.durationMinutes) || 0) * 60,
        startTime: trip.startTime || new Date().toISOString()
      }));

      // Calculate time-based analytics
      const timeAnalytics = calculateTimeBasedAnalytics(normalizedTrips);

      // Calculate efficiency and pattern metrics
      const efficiencyMetrics = calculateEfficiencyMetrics(normalizedTrips);

      // Calculate detection performance metrics
      const detectionMetrics = calculateDetectionMetrics(normalizedTrips);

      return {
        ...baseStats,
        ...timeAnalytics,
        ...efficiencyMetrics,
        ...detectionMetrics,

        // Add summary insights
        insights: generateInsights({
          ...baseStats,
          ...timeAnalytics,
          ...efficiencyMetrics,
          ...detectionMetrics
        }, normalizedTrips)
      };

    } catch (error) {
      console.error('Error enhancing statistics:', error);
      // Return base stats with default insights if enhancement fails
      return {
        ...baseStats,
        insights: ['Basic statistics loaded. Some advanced analytics may be unavailable.']
      };
    }
  };

  /**
   * Calculate Time-Based Analytics
   *
   * This method analyzes trip patterns over different time periods to identify
   * trends and usage patterns that help users understand their travel behavior.
   * Enhanced with proper null checking for all calculations.
   */
  const calculateTimeBasedAnalytics = (trips) => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const thisWeekTrips = trips.filter(trip => new Date(trip.startTime) > oneWeekAgo);
    const thisMonthTrips = trips.filter(trip => new Date(trip.startTime) > oneMonthAgo);
    const lastThreeMonthsTrips = trips.filter(trip => new Date(trip.startTime) > threeMonthsAgo);

    // Helper function to safely sum miles with null checking
    const sumMiles = (tripArray) => {
      return tripArray.reduce((sum, trip) => {
        const miles = parseFloat(trip.distanceMiles) || 0;
        return sum + miles;
      }, 0);
    };

    return {
      // Trip counts by time period
      tripsThisWeek: thisWeekTrips.length,
      tripsThisMonth: thisMonthTrips.length,
      tripsLastThreeMonths: lastThreeMonthsTrips.length,

      // Mileage by time period with proper null handling
      milesThisWeek: sumMiles(thisWeekTrips),
      milesThisMonth: sumMiles(thisMonthTrips),
      milesLastThreeMonths: sumMiles(lastThreeMonthsTrips),

      // Average trips per week (based on last 3 months)
      averageTripsPerWeek: lastThreeMonthsTrips.length > 0 ?
        parseFloat((lastThreeMonthsTrips.length / 12).toFixed(1)) : 0,

      // Activity trend
      activityTrend: calculateActivityTrend(trips)
    };
  };

  /**
   * Calculate Efficiency and Pattern Metrics
   *
   * This method analyzes trip characteristics to provide insights about
   * travel efficiency, patterns, and cost-effectiveness.
   * Enhanced with comprehensive null checking and data validation.
   */
  const calculateEfficiencyMetrics = (trips) => {
    if (trips.length === 0) {
      return {
        averageTripDistance: 0,
        averageTripDuration: 0,
        averageSpeed: 0,
        shortTripsPercentage: 0,
        longTripsPercentage: 0,
        costPerMile: 0
      };
    }

    // Safely calculate totals with null checking
    const totalDistance = trips.reduce((sum, trip) => {
      const miles = parseFloat(trip.distanceMiles) || 0;
      return sum + miles;
    }, 0);

    const totalDuration = trips.reduce((sum, trip) => {
      const duration = parseInt(trip.duration) || (parseInt(trip.durationMinutes) || 0) * 60;
      return sum + duration;
    }, 0);

    const totalCost = trips.reduce((sum, trip) => {
      const cost = parseFloat(trip.cost) || 0;
      return sum + cost;
    }, 0);

    const shortTrips = trips.filter(trip => (parseFloat(trip.distanceMiles) || 0) < 5);
    const longTrips = trips.filter(trip => (parseFloat(trip.distanceMiles) || 0) > 50);

    // Calculate average speed with proper validation
    let averageSpeed = 0;
    if (totalDuration > 0 && totalDistance > 0) {
      averageSpeed = totalDistance / (totalDuration / 3600); // miles per hour
    }

    return {
      averageTripDistance: totalDistance > 0 ? parseFloat((totalDistance / trips.length).toFixed(2)) : 0,
      averageTripDuration: trips.length > 0 ? Math.round(totalDuration / trips.length) : 0,
      averageSpeed: parseFloat(averageSpeed.toFixed(1)),
      shortTripsPercentage: trips.length > 0 ? parseFloat(((shortTrips.length / trips.length) * 100).toFixed(1)) : 0,
      longTripsPercentage: trips.length > 0 ? parseFloat(((longTrips.length / trips.length) * 100).toFixed(1)) : 0,
      costPerMile: totalDistance > 0 ? parseFloat((totalCost / totalDistance).toFixed(3)) : 0
    };
  };

  /**
   * Calculate Detection Performance Metrics
   *
   * This method analyzes the performance of automatic trip detection to provide
   * insights about system reliability and data quality.
   */
  const calculateDetectionMetrics = (trips) => {
    const automaticTrips = trips.filter(trip =>
      trip.source === 'integrated_automatic_detection'
    );

    if (automaticTrips.length === 0) {
      return {
        detectionReliability: 0,
        averageConfidence: 0,
        highQualityTripsPercentage: 0,
        systemMaturity: 'Getting Started'
      };
    }

    const tripsWithQuality = automaticTrips.filter(trip => trip.qualityScore !== undefined);
    const tripsWithConfidence = automaticTrips.filter(trip => trip.detectionConfidence !== undefined);
    const highQualityTrips = automaticTrips.filter(trip => (trip.qualityScore || 0) > 0.8);

    const averageQuality = tripsWithQuality.length > 0 ?
      tripsWithQuality.reduce((sum, trip) => sum + (trip.qualityScore || 0), 0) / tripsWithQuality.length : 0;

    const averageConfidence = tripsWithConfidence.length > 0 ?
      tripsWithConfidence.reduce((sum, trip) => sum + (trip.detectionConfidence || 0), 0) / tripsWithConfidence.length : 0;

    return {
      detectionReliability: parseFloat((averageQuality * 100).toFixed(1)),
      averageConfidence: parseFloat((averageConfidence * 100).toFixed(1)),
      highQualityTripsPercentage: automaticTrips.length > 0 ?
        parseFloat(((highQualityTrips.length / automaticTrips.length) * 100).toFixed(1)) : 0,
      systemMaturity: determineSystemMaturity(automaticTrips.length, averageQuality)
    };
  };

  /**
   * Calculate Activity Trend
   *
   * This method analyzes whether trip activity is increasing, decreasing, or stable
   * by comparing recent activity to historical patterns.
   */
  const calculateActivityTrend = (trips) => {
    if (trips.length < 4) return 'Insufficient Data';

    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    const recentTrips = trips.filter(trip =>
      new Date(trip.startTime) > twoWeeksAgo
    ).length;

    const previousTrips = trips.filter(trip => {
      const tripDate = new Date(trip.startTime);
      return tripDate > fourWeeksAgo && tripDate <= twoWeeksAgo;
    }).length;

    if (previousTrips === 0) return 'New User';

    const changeRatio = recentTrips / previousTrips;

    if (changeRatio > 1.2) return 'Increasing';
    if (changeRatio < 0.8) return 'Decreasing';
    return 'Stable';
  };

  /**
   * Determine System Maturity Level
   *
   * This method evaluates how mature the automatic detection system is based
   * on the number of trips analyzed and the quality of detection results.
   */
  const determineSystemMaturity = (tripCount, averageQuality) => {
    if (tripCount < 5) return 'Learning';
    if (tripCount < 20) return 'Developing';
    if (averageQuality > 0.85) return 'Excellent';
    if (averageQuality > 0.7) return 'Good';
    return 'Improving';
  };

  /**
   * Generate Insights
   *
   * This method creates human-readable insights based on the statistical analysis
   * that help users understand their travel patterns and system performance.
   * Enhanced with comprehensive null checking for all values.
   */
  const generateInsights = (stats, trips) => {
    const insights = [];

    // Activity insights with proper null checking
    if (stats.tripsThisWeek > 0 && stats.milesThisWeek !== undefined) {
      const miles = parseFloat(stats.milesThisWeek) || 0;
      insights.push(`You've taken ${stats.tripsThisWeek} trips this week, covering ${miles.toFixed(1)} miles.`);
    } else if (stats.tripsThisWeek === 0) {
      insights.push('No trips recorded this week yet. Start tracking to see your travel patterns!');
    }

    // Detection quality insights with null checking
    if (stats.automaticTripsCount > 0) {
      const qualityPercentage = parseFloat(stats.dataQualityPercentage) || 0;
      if (qualityPercentage > 90) {
        insights.push('Excellent automatic detection quality - the system is working very reliably.');
      } else if (qualityPercentage > 70) {
        insights.push('Good automatic detection quality - most trips are being tracked accurately.');
      } else {
        insights.push('Detection quality is improving - consider checking location permission settings.');
      }
    }

    // Efficiency insights with null checking
    if (stats.averageTripDistance !== undefined && stats.averageTripDistance > 0) {
      if (stats.averageTripDistance < 3) {
        insights.push('Many short trips detected - perfect for tracking local business activities.');
      } else if (stats.averageTripDistance > 50) {
        insights.push('Mostly longer trips detected - great for tracking business travel and commuting.');
      }
    }

    // Cost efficiency insights
    if (stats.costPerMile !== undefined && stats.costPerMile > 0) {
      insights.push(`Your average cost per mile is $${stats.costPerMile.toFixed(2)}.`);
    }

    // Trend insights
    if (stats.activityTrend === 'Increasing') {
      insights.push('Your trip activity has been increasing recently - great job staying active!');
    } else if (stats.activityTrend === 'Decreasing') {
      insights.push('Your trip activity has decreased recently.');
    }

    // Add default insight if no others were generated
    if (insights.length === 0) {
      insights.push('Keep tracking your trips to see detailed analytics and patterns!');
    }

    return insights;
  };

  /**
   * Load Basic Statistics
   *
   * This fallback method loads traditional statistics when the integrated
   * automatic detection system isn't available.
   */
  const loadBasicStatistics = async () => {
    const storage = locationTracker.getTripStorage();
    const allTrips = await storage.getAllTrips();

    const totalTrips = allTrips.length;
    const totalMiles = allTrips.reduce((sum, trip) => sum + (parseFloat(trip.distanceMiles) || 0), 0);
    const totalCost = allTrips.reduce((sum, trip) => sum + (parseFloat(trip.cost) || 0), 0);

    return {
      totalTrips,
      totalMiles: parseFloat(totalMiles.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      automaticTripsCount: 0,
      dataQualityPercentage: 0,
      insights: ['Basic trip tracking active. Enable automatic detection for enhanced analytics.']
    };
  };

  /**
   * Handle Pull-to-Refresh
   *
   * This method provides a smooth user experience for refreshing statistics
   * data when users want to see the latest information.
   */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadStatistics();
  }, []);

  // Show loading state during initial data load
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Trip Analytics</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading comprehensive analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state if statistics couldn't be loaded
  if (!statistics) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Trip Analytics</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load trip statistics</Text>
          <Text style={styles.errorSubtext}>Please check your data and try again</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Main statistics display with comprehensive analytics
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trip Analytics</Text>
        {lastUpdated && (
          <Text style={styles.headerSubtitle}>
            Updated {lastUpdated.toLocaleTimeString()}
          </Text>
        )}
      </View>

      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Overview Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trip Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{statistics.totalTrips || 0}</Text>
              <Text style={styles.statLabel}>Total Trips</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{statistics.totalMiles || 0}</Text>
              <Text style={styles.statLabel}>Total Miles</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>${(statistics.totalCost || 0).toFixed(2)}</Text>
              <Text style={styles.statLabel}>Total Cost</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {statistics.averageTripDistance ? statistics.averageTripDistance.toFixed(1) : '0'}
              </Text>
              <Text style={styles.statLabel}>Avg Distance</Text>
            </View>
          </View>
        </View>

        {/* Automatic Detection Analytics */}
        {statistics.automaticTripsCount > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Automatic Detection Performance</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{statistics.automaticTripsCount || 0}</Text>
                <Text style={styles.statLabel}>Auto-Detected</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {statistics.dataQualityPercentage ? statistics.dataQualityPercentage.toFixed(0) : 0}%
                </Text>
                <Text style={styles.statLabel}>Data Quality</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {statistics.detectionReliability ? statistics.detectionReliability.toFixed(0) : 0}%
                </Text>
                <Text style={styles.statLabel}>Reliability</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{statistics.systemMaturity || 'Learning'}</Text>
                <Text style={styles.statLabel}>System Status</Text>
              </View>
            </View>
          </View>
        )}

        {/* Time-Based Analytics */}
        {statistics.tripsThisWeek !== undefined && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{statistics.tripsThisWeek || 0}</Text>
                <Text style={styles.statLabel}>This Week</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{statistics.tripsThisMonth || 0}</Text>
                <Text style={styles.statLabel}>This Month</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {statistics.milesThisWeek ? statistics.milesThisWeek.toFixed(1) : 0}
                </Text>
                <Text style={styles.statLabel}>Miles This Week</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{statistics.activityTrend || 'Stable'}</Text>
                <Text style={styles.statLabel}>Trend</Text>
              </View>
            </View>
          </View>
        )}

        {/* Efficiency Metrics */}
        {statistics.averageSpeed !== undefined && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Efficiency Metrics</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {statistics.averageSpeed ? statistics.averageSpeed.toFixed(1) : 0} mph
                </Text>
                <Text style={styles.statLabel}>Avg Speed</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {statistics.costPerMile ? '$' + statistics.costPerMile.toFixed(2) : '$0.00'}
                </Text>
                <Text style={styles.statLabel}>Cost/Mile</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {statistics.shortTripsPercentage ? statistics.shortTripsPercentage.toFixed(0) : 0}%
                </Text>
                <Text style={styles.statLabel}>Short Trips</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {statistics.longTripsPercentage ? statistics.longTripsPercentage.toFixed(0) : 0}%
                </Text>
                <Text style={styles.statLabel}>Long Trips</Text>
              </View>
            </View>
          </View>
        )}

        {/* Insights Section */}
        {statistics.insights && statistics.insights.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Insights</Text>
            <View style={styles.insightsContainer}>
              {statistics.insights.map((insight, index) => (
                <View key={index} style={styles.insightCard}>
                  <Text style={styles.insightText}>{insight}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f44336',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    margin: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 48) / 2 - 8,
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  insightsContainer: {
    marginTop: 8,
  },
  insightCard: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  insightText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});