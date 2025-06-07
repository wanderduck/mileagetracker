// components/TripTracker.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const TripTracker = ({ locationService }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [timer, setTimer] = useState(null);

  useEffect(() => {
    // Update tracking status when the component mounts
    setIsTracking(locationService.isTracking);
    setCurrentTrip(locationService.currentTrip);

    // Start timer if tracking
    if (locationService.isTracking && locationService.currentTrip) {
      startTimer();
    }

    // Clean up timer on unmount
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, []);

  // Update when tracking status changes
  useEffect(() => {
    if (isTracking) {
      startTimer();
    } else if (timer) {
      clearInterval(timer);
      setTimer(null);
    }
  }, [isTracking]);

  const startTimer = () => {
    if (timer) {
      clearInterval(timer);
    }

    const newTimer = setInterval(() => {
      if (currentTrip && currentTrip.startTime) {
        const start = new Date(currentTrip.startTime);
        const now = new Date();
        setElapsed(Math.floor((now - start) / 1000));
      }
    }, 1000);

    setTimer(newTimer);
  };

  // Format elapsed time as HH:MM:SS
  const formatElapsedTime = () => {
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;

    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0')
    ].join(':');
  };

  if (!isTracking) {
    return (
      <View style={styles.container}>
        <Text style={styles.statusInactive}>Not Tracking</Text>
        <Text style={styles.description}>
          Tracking will start automatically when you connect to your car's Bluetooth
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.statusActive}>Currently Tracking</Text>
      <Text style={styles.timer}>{formatElapsedTime()}</Text>
      <Text style={styles.description}>
        Tracking will stop automatically when you disconnect from your car's Bluetooth
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  statusActive: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4caf50',
    textAlign: 'center',
  },
  statusInactive: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#9e9e9e',
    textAlign: 'center',
  },
  timer: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 12,
    fontFamily: 'monospace',
  },
  description: {
    textAlign: 'center',
    color: '#757575',
  },
});

export default TripTracker;