// screens/BluetoothPermissionsTestScreen.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BluetoothPermissionManager from '../services/BluetoothPermissionManager';

/**
 * BluetoothPermissionsTestScreen
 *
 * This screen allows us to test our bluetooth permission management system
 * before integrating it into the main application. It provides a user interface
 * for checking permission status, requesting permissions, and understanding
 * what's happening behind the scenes.
 *
 * This is a temporary testing interface that helps us validate our permission
 * system works correctly across different Android devices and versions.
 */
export default function BluetoothPermissionsTestScreen() {
  // State to track the current permission status and testing progress
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [lastStatusCheck, setLastStatusCheck] = useState(null);
  const [detailedStatus, setDetailedStatus] = useState(null);

  // Check permission status when the screen loads
  useEffect(() => {
    checkCurrentPermissionStatus();
  }, []);

  /**
   * Check the current status of all bluetooth permissions
   * This demonstrates how other parts of your app will check permission status
   */
  const checkCurrentPermissionStatus = async () => {
    try {
      setIsChecking(true);

      // Get comprehensive permission status (now returns detailed object)
      const permissionResult = await BluetoothPermissionManager.hasAllBluetoothPermissions();

      // Get detailed, human-readable status
      const detailedStatus = await BluetoothPermissionManager.getPermissionStatus();

      // Update our state with the results
      setPermissionStatus(permissionResult.granted);
      setDetailedStatus(detailedStatus);
      setLastStatusCheck(new Date().toLocaleTimeString());

      console.log('Permission check results:', {
        permissionResult,
        detailedStatus
      });

    } catch (error) {
      console.error('Error checking permission status:', error);
      Alert.alert('Error', 'Failed to check permission status');
    } finally {
      setIsChecking(false);
    }
  };

  /**
   * Request bluetooth permissions from the user
   * This demonstrates the complete permission request flow
   */
  const requestBluetoothPermissions = async () => {
    try {
      setIsRequesting(true);

      // Request all necessary permissions
      const result = await BluetoothPermissionManager.requestBluetoothPermissions();

      console.log('Permission request results:', result);

      if (result.granted) {
        Alert.alert(
          'Success!',
          'All bluetooth permissions have been granted. Automatic trip tracking is now available.',
          [{ text: 'OK', onPress: checkCurrentPermissionStatus }]
        );
      } else {
        // Handle different types of issues with appropriate guidance
        if (result.reason === 'environment_limitation') {
          await BluetoothPermissionManager.handlePermissionIssue('environment_limitation', result);
        } else {
          await BluetoothPermissionManager.handlePermissionIssue('permission_denied', result);
        }

        // Check status again to reflect any changes
        await checkCurrentPermissionStatus();
      }

    } catch (error) {
      console.error('Error requesting permissions:', error);
      Alert.alert('Error', 'Failed to request permissions');
    } finally {
      setIsRequesting(false);
    }
  };

  /**
   * Test individual permission components
   * This helps us debug issues by checking each permission separately
   */
  const testIndividualPermissions = async () => {
    try {
      setIsChecking(true);

      const bluetoothOk = await BluetoothPermissionManager.checkBluetoothPermission();
      const locationOk = await BluetoothPermissionManager.checkLocationPermission();

      const message = `Individual Permission Status:
      
Bluetooth: ${bluetoothOk ? '✅ Granted' : '❌ Not Granted'}
Location: ${locationOk ? '✅ Granted' : '❌ Not Granted'}

Both permissions are required for automatic trip tracking.`;

      Alert.alert('Individual Permission Results', message);

    } catch (error) {
      console.error('Error testing individual permissions:', error);
      Alert.alert('Error', 'Failed to test individual permissions');
    } finally {
      setIsChecking(false);
    }
  };

  /**
   * Clear the permission cache for testing purposes
   * This forces fresh permission checks from the system
   */
  const clearPermissionCache = () => {
    BluetoothPermissionManager.clearPermissionCache();
    Alert.alert(
      'Cache Cleared',
      'Permission cache has been cleared. The next permission check will query the system directly.',
      [{ text: 'OK', onPress: checkCurrentPermissionStatus }]
    );
  };

  /**
   * Get the appropriate icon for the current permission status
   */
  const getStatusIcon = () => {
    if (permissionStatus === null) return 'help-circle-outline';
    return permissionStatus ? 'checkmark-circle' : 'close-circle';
  };

  /**
   * Get the appropriate color for the current permission status
   */
  const getStatusColor = () => {
    if (permissionStatus === null) return '#757575';
    return permissionStatus ? '#4CAF50' : '#F44336';
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bluetooth Permissions Test</Text>
        <Text style={styles.headerSubtitle}>
          Test bluetooth permission management before integrating with trip tracking
        </Text>
      </View>

      {/* Current Status Display */}
      <View style={styles.statusContainer}>
        <View style={styles.statusHeader}>
          <Ionicons
            name={getStatusIcon()}
            size={32}
            color={getStatusColor()}
          />
          <Text style={styles.statusTitle}>Current Permission Status</Text>
        </View>

        {permissionStatus !== null && (
          <View style={styles.statusDetails}>
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {permissionStatus ? 'All Required Permissions Granted' : 'Permissions Required'}
            </Text>

            {detailedStatus && (
              <Text style={styles.statusMessage}>
                {detailedStatus.message}
              </Text>
            )}

            {lastStatusCheck && (
              <Text style={styles.lastChecked}>
                Last checked: {lastStatusCheck}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Permission Management Actions</Text>

        {/* Check Current Status Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={checkCurrentPermissionStatus}
          disabled={isChecking}
        >
          {isChecking ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="refresh" size={20} color="#fff" />
          )}
          <Text style={styles.actionButtonText}>
            {isChecking ? 'Checking...' : 'Check Permission Status'}
          </Text>
        </TouchableOpacity>

        {/* Request Permissions Button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={requestBluetoothPermissions}
          disabled={isRequesting || permissionStatus === true}
        >
          {isRequesting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="key" size={20} color="#fff" />
          )}
          <Text style={styles.actionButtonText}>
            {isRequesting ? 'Requesting...' :
             permissionStatus === true ? 'Permissions Already Granted' : 'Request Bluetooth Permissions'}
          </Text>
        </TouchableOpacity>

        {/* Test Individual Permissions Button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={testIndividualPermissions}
          disabled={isChecking}
        >
          <Ionicons name="list" size={20} color="#2196F3" />
          <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
            Test Individual Permissions
          </Text>
        </TouchableOpacity>

        {/* Clear Cache Button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.warningButton]}
          onPress={clearPermissionCache}
        >
          <Ionicons name="trash" size={20} color="#FF9800" />
          <Text style={[styles.actionButtonText, styles.warningButtonText]}>
            Clear Permission Cache
          </Text>
        </TouchableOpacity>
      </View>

      {/* Information Section */}
      <View style={styles.infoContainer}>
        <Text style={styles.sectionTitle}>Understanding Bluetooth Permissions</Text>

        <View style={styles.infoItem}>
          <Ionicons name="bluetooth" size={24} color="#2196F3" />
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>Bluetooth Access</Text>
            <Text style={styles.infoDescription}>
              Required to discover and connect to bluetooth devices like your car's audio system.
            </Text>
          </View>
        </View>

        <View style={styles.infoItem}>
          <Ionicons name="location" size={24} color="#4CAF50" />
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>Location Access</Text>
            <Text style={styles.infoDescription}>
              Required by Android for bluetooth scanning because device patterns can reveal location.
            </Text>
          </View>
        </View>

        <View style={styles.infoItem}>
          <Ionicons name="shield-checkmark" size={24} color="#9C27B0" />
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>Privacy Protection</Text>
            <Text style={styles.infoDescription}>
              We only monitor connections to devices you specifically select as your car.
            </Text>
          </View>
        </View>
      </View>

      {/* Development Notes */}
      <View style={styles.developmentContainer}>
        <Text style={styles.sectionTitle}>Development Notes</Text>
        <Text style={styles.developmentText}>
          This screen is for testing permission management during development.
          In the final app, permission requests will be integrated seamlessly
          into the main user interface.
        </Text>
        <Text style={styles.developmentText}>
          Use this screen to verify that permissions work correctly on your
          specific Android device before implementing the full bluetooth functionality.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  statusContainer: {
    margin: 16,
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
  statusDetails: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  lastChecked: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  actionsContainer: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#2196F3',
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  warningButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: '#2196F3',
  },
  warningButtonText: {
    color: '#FF9800',
  },
  infoContainer: {
    margin: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  developmentContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  developmentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
    marginBottom: 8,
  },
});