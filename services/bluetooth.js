// services/bluetooth.js
import BluetoothSerial from 'react-native-bluetooth-serial';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants for storage keys
const CAR_BLUETOOTH_DEVICE_KEY = 'car_bluetooth_device';

export default class BluetoothService {
  constructor(onConnectCallback, onDisconnectCallback) {
    this.onConnectCallback = onConnectCallback;
    this.onDisconnectCallback = onDisconnectCallback;
    this.carDevice = null;
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.isCarConnected = false;
  }

  // Initialize the service
  async initialize() {
    try {
      // Enable Bluetooth if it's not already enabled
      const isEnabled = await BluetoothSerial.isEnabled();
      if (!isEnabled) {
        await BluetoothSerial.enable();
      }

      // Load saved car Bluetooth device info
      const savedDeviceJson = await AsyncStorage.getItem(CAR_BLUETOOTH_DEVICE_KEY);
      if (savedDeviceJson) {
        this.carDevice = JSON.parse(savedDeviceJson);
        console.log('Loaded saved car Bluetooth device:', this.carDevice.name);
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize Bluetooth service:', error);
      return false;
    }
  }

  // Start monitoring for car Bluetooth connection
  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    // Check connection status every 10 seconds
    this.monitoringInterval = setInterval(async () => {
      try {
        if (!this.carDevice) return;

        // Get list of connected devices
        const connectedDevices = await BluetoothSerial.list();

        // Check if car device is connected
        const isCarConnected = connectedDevices.some(
          device => device.id === this.carDevice.id
        );

        // If connection status changed
        if (isCarConnected && !this.isCarConnected) {
          // Car just connected
          this.isCarConnected = true;
          this.onConnectCallback();
        } else if (!isCarConnected && this.isCarConnected) {
          // Car just disconnected
          this.isCarConnected = false;
          this.onDisconnectCallback();
        }
      } catch (error) {
        console.error('Error checking Bluetooth status:', error);
      }
    }, 10000); // Check every 10 seconds
  }

  // Stop monitoring
  stopMonitoring() {
    if (!this.isMonitoring) return;

    clearInterval(this.monitoringInterval);
    this.monitoringInterval = null;
    this.isMonitoring = false;
  }

  // Save selected car Bluetooth device
  async saveCarDevice(device) {
    try {
      this.carDevice = device;
      await AsyncStorage.setItem(CAR_BLUETOOTH_DEVICE_KEY, JSON.stringify(device));
      return true;
    } catch (error) {
      console.error('Failed to save car device:', error);
      return false;
    }
  }

  // Get list of available Bluetooth devices
  async scanForDevices() {
    try {
      // Get list of paired devices
      const pairedDevices = await BluetoothSerial.list();

      // Get list of unpaired devices
      await BluetoothSerial.discoverUnpairedDevices();
      const unpaired = await BluetoothSerial.listUnpaired();

      // Combine lists
      const allDevices = [...pairedDevices, ...unpaired];

      return allDevices;
    } catch (error) {
      console.error('Failed to scan for Bluetooth devices:', error);
      return [];
    }
  }
}