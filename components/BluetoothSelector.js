// components/BluetoothSelector.js
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';

const BluetoothSelector = ({ bluetoothService, onDeviceSelected }) => {
  const [devices, setDevices] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);

  useEffect(() => {
    // Load saved device on component mount
    if (bluetoothService.carDevice) {
      setSelectedDevice(bluetoothService.carDevice);
    }
  }, []);

  const scanForDevices = async () => {
    setScanning(true);
    setDevices([]);

    try {
      const foundDevices = await bluetoothService.scanForDevices();
      setDevices(foundDevices);
    } catch (error) {
      Alert.alert('Error', 'Failed to scan for Bluetooth devices');
    } finally {
      setScanning(false);
    }
  };

  const selectDevice = async (device) => {
    try {
      await bluetoothService.saveCarDevice(device);
      setSelectedDevice(device);

      if (onDeviceSelected) {
        onDeviceSelected(device);
      }

      Alert.alert('Success', `Selected "${device.name}" as your car's Bluetooth device`);
    } catch (error) {
      Alert.alert('Error', 'Failed to save selected device');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Your Car's Bluetooth</Text>

      {selectedDevice && (
        <View style={styles.selectedDevice}>
          <Text style={styles.selectedDeviceLabel}>Currently selected:</Text>
          <Text style={styles.selectedDeviceName}>{selectedDevice.name}</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.scanButton}
        onPress={scanForDevices}
        disabled={scanning}
      >
        <Text style={styles.scanButtonText}>
          {scanning ? 'Scanning...' : 'Scan for Bluetooth Devices'}
        </Text>
        {scanning && <ActivityIndicator color="#fff" style={styles.spinner} />}
      </TouchableOpacity>

      {devices.length > 0 && (
        <FlatList
          data={devices}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.deviceItem}
              onPress={() => selectDevice(item)}
            >
              <Text style={styles.deviceName}>{item.name || 'Unknown Device'}</Text>
              <Text style={styles.deviceId}>{item.id}</Text>
            </TouchableOpacity>
          )}
          style={styles.deviceList}
        />
      )}

      {!scanning && devices.length === 0 && (
        <Text style={styles.noDevices}>
          No devices found. Make sure Bluetooth is enabled and click 'Scan'.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  scanButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  scanButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  spinner: {
    marginLeft: 8,
  },
  deviceList: {
    maxHeight: 300,
  },
  deviceItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  deviceId: {
    fontSize: 12,
    color: '#666',
  },
  noDevices: {
    textAlign: 'center',
    color: '#666',
    marginTop: 16,
  },
  selectedDevice: {
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  selectedDeviceLabel: {
    fontSize: 14,
    color: '#388e3c',
  },
  selectedDeviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#388e3c',
  },
});

export default BluetoothSelector;