// services/BluetoothPermissionManager.js
import { Alert, Linking, Platform, PermissionsAndroid } from 'react-native';
import * as Location from 'expo-location';

/**
 * Modern BluetoothPermissionManager
 *
 * This updated service uses modern React Native and Expo APIs for permission management.
 * It handles the complexity of Android's evolving bluetooth permission model while providing
 * clear feedback about what's working and what might require a development build.
 *
 * Key Changes from Previous Version:
 * - Uses PermissionsAndroid directly for bluetooth permissions (modern RN approach)
 * - Uses expo-location for location permissions (modern Expo approach)
 * - Provides better error handling for Expo Go limitations
 * - Includes detection of development environment capabilities
 */
export class BluetoothPermissionManager {
  constructor() {
    // Track the current permission state to avoid unnecessary permission checks
    this.permissionCache = {
      bluetooth: null,
      location: null,
      lastChecked: null,
      environmentSupported: null
    };

    // Cache duration in milliseconds (5 minutes)
    this.cacheTimeout = 5 * 60 * 1000;

    // Track whether we're in an environment that supports bluetooth permissions
    this.environmentChecked = false;
  }

  /**
   * Check if the current development environment supports bluetooth permissions
   * This helps distinguish between permission issues and environment limitations
   */
  async checkEnvironmentSupport() {
    if (this.environmentChecked) {
      return this.permissionCache.environmentSupported;
    }

    try {
      // First check if we're on Android at all
      if (Platform.OS !== 'android') {
        console.log('Environment check: Not Android platform');
        this.permissionCache.environmentSupported = false;
        this.environmentChecked = true;
        return false;
      }

      // Check if we can access the PermissionsAndroid API
      if (!PermissionsAndroid || typeof PermissionsAndroid.check !== 'function') {
        console.log('Environment check: PermissionsAndroid API not available');
        this.permissionCache.environmentSupported = false;
        this.environmentChecked = true;
        return false;
      }

      // Test if bluetooth permission constants are available and functional
      let hasWorkingBluetoothAPI = false;

      try {
        // Try to check a basic bluetooth permission to see if the API works
        if (PermissionsAndroid.PERMISSIONS.BLUETOOTH) {
          await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH);
          hasWorkingBluetoothAPI = true;
          console.log('Environment check: Basic bluetooth API appears functional');
        } else {
          console.log('Environment check: Bluetooth permission constants not available');
        }
      } catch (apiError) {
        console.log('Environment check: Bluetooth API test failed:', apiError.message);
        hasWorkingBluetoothAPI = false;
      }

      // Additional check for newer permissions on supported versions
      if (hasWorkingBluetoothAPI && Platform.Version >= 31) {
        try {
          if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN) {
            await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
            console.log('Environment check: Modern bluetooth API (Android 12+) appears functional');
          }
        } catch (modernApiError) {
          console.log('Environment check: Modern bluetooth API limited:', modernApiError.message);
          // Don't fail completely - basic bluetooth might still work
        }
      }

      this.permissionCache.environmentSupported = hasWorkingBluetoothAPI;
      this.environmentChecked = true;

      console.log('Environment check result:', hasWorkingBluetoothAPI ? 'Supported' : 'Limited/Unsupported');
      return hasWorkingBluetoothAPI;

    } catch (error) {
      console.log('Environment check failed (normal in Expo Go):', error.message);
      this.permissionCache.environmentSupported = false;
      this.environmentChecked = true;
      return false;
    }
  }

  /**
   * Check if all required bluetooth permissions are currently granted
   * This method adapts to the current environment's capabilities
   */
  async hasAllBluetoothPermissions() {
    try {
      // First check if our environment supports bluetooth permissions
      const environmentSupported = await this.checkEnvironmentSupport();

      if (!environmentSupported) {
        return {
          granted: false,
          reason: 'environment_limitation',
          message: 'Bluetooth permissions require a development build for testing'
        };
      }

      // Check cache first to avoid unnecessary system calls
      if (this.isPermissionCacheValid()) {
        return {
          granted: this.permissionCache.bluetooth && this.permissionCache.location,
          reason: 'cached_result'
        };
      }

      // Check each required permission
      const bluetoothStatus = await this.checkBluetoothPermissions();
      const locationStatus = await this.checkLocationPermissions();

      // Update cache with current status
      this.updatePermissionCache(bluetoothStatus, locationStatus);

      return {
        granted: bluetoothStatus && locationStatus,
        reason: 'fresh_check',
        details: { bluetooth: bluetoothStatus, location: locationStatus }
      };
    } catch (error) {
      console.error('Error checking bluetooth permissions:', error);
      return {
        granted: false,
        reason: 'check_error',
        error: error.message
      };
    }
  }

  /**
   * Request all necessary bluetooth permissions from the user
   * Provides detailed feedback about what succeeded and what failed
   */
  async requestBluetoothPermissions() {
    try {
      // First check environment support
      const environmentSupported = await this.checkEnvironmentSupport();

      if (!environmentSupported) {
        return {
          granted: false,
          reason: 'environment_limitation',
          message: 'Bluetooth permissions require a development build. You can still test location permissions.',
          suggestion: 'create_development_build'
        };
      }

      // Show explanation to user
      const userWantsToGrant = await this.showPermissionExplanation();

      if (!userWantsToGrant) {
        return {
          granted: false,
          reason: 'user_declined_explanation',
          message: 'User chose not to grant permissions'
        };
      }

      // Request location permission first (using expo-location)
      const locationResult = await this.requestLocationPermissions();

      if (!locationResult.granted) {
        return {
          granted: false,
          reason: 'location_denied',
          message: 'Location permission was denied (required for bluetooth scanning)',
          details: locationResult
        };
      }

      // Request bluetooth permissions (using PermissionsAndroid)
      const bluetoothResult = await this.requestBluetoothPermissions_Internal();

      if (!bluetoothResult.granted) {
        return {
          granted: false,
          reason: 'bluetooth_denied',
          message: 'Bluetooth permission was denied',
          details: bluetoothResult
        };
      }

      // Clear cache since we just updated permissions
      this.clearPermissionCache();

      return {
        granted: true,
        reason: 'all_granted',
        message: 'All bluetooth permissions granted successfully'
      };

    } catch (error) {
      console.error('Error requesting bluetooth permissions:', error);
      return {
        granted: false,
        reason: 'request_error',
        message: 'Error occurred while requesting permissions',
        error: error.message
      };
    }
  }

  /**
   * Check bluetooth-specific permissions using modern Android APIs
   * Adapts to different Android versions automatically
   */
  async checkBluetoothPermissions() {
    try {
      if (Platform.OS !== 'android') {
        return false;
      }

      // For Android 12+ (API level 31+), check new granular permissions
      if (Platform.Version >= 31) {
        const scanGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
        );
        const connectGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
        );

        return scanGranted && connectGranted;
      } else {
        // For older Android versions, check legacy permissions
        const bluetoothGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH
        );
        const bluetoothAdminGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADMIN
        );

        return bluetoothGranted && bluetoothAdminGranted;
      }
    } catch (error) {
      console.error('Error checking bluetooth permissions:', error);
      return false;
    }
  }

  /**
   * Check location permissions using expo-location
   * This is required for bluetooth scanning on Android
   */
  async checkLocationPermissions() {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking location permissions:', error);
      return false;
    }
  }

  /**
   * Request bluetooth permissions using PermissionsAndroid
   * Handles different Android versions appropriately
   */
  async requestBluetoothPermissions_Internal() {
    try {
      if (Platform.OS !== 'android') {
        return { granted: false, reason: 'not_android' };
      }

      // For Android 12+, request granular permissions
      if (Platform.Version >= 31) {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
        ];

        const results = await PermissionsAndroid.requestMultiple(permissions);

        const scanGranted = results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === 'granted';
        const connectGranted = results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === 'granted';

        return {
          granted: scanGranted && connectGranted,
          details: { scan: scanGranted, connect: connectGranted }
        };
      } else {
        // For older Android, request legacy permissions
        const permissions = [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADMIN
        ];

        const results = await PermissionsAndroid.requestMultiple(permissions);

        const bluetoothGranted = results[PermissionsAndroid.PERMISSIONS.BLUETOOTH] === 'granted';
        const bluetoothAdminGranted = results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADMIN] === 'granted';

        return {
          granted: bluetoothGranted && bluetoothAdminGranted,
          details: { bluetooth: bluetoothGranted, bluetoothAdmin: bluetoothAdminGranted }
        };
      }
    } catch (error) {
      console.error('Error requesting bluetooth permissions:', error);
      return { granted: false, error: error.message };
    }
  }

  /**
   * Request location permissions using expo-location
   * This is the modern, recommended approach for location permissions
   */
  async requestLocationPermissions() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return {
        granted: status === 'granted',
        status: status
      };
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return { granted: false, error: error.message };
    }
  }

  /**
   * Show explanation about why bluetooth permissions are needed
   * Updated to address potential development environment limitations
   */
  async showPermissionExplanation() {
    const environmentSupported = await this.checkEnvironmentSupport();

    let message = 'To automatically track your trips, this app needs permission to:\n\n' +
                 '• Scan for nearby bluetooth devices\n' +
                 '• Connect to your car\'s bluetooth system\n' +
                 '• Access location data (required by Android for bluetooth scanning)\n\n' +
                 'Your privacy is protected - we only monitor connections to devices you specify as your car.';

    if (!environmentSupported) {
      message += '\n\nNote: Full bluetooth testing requires a development build. ' +
                'We can test location permissions in the current environment.';
    }

    return new Promise((resolve) => {
      Alert.alert(
        'Bluetooth Access Required',
        message,
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => resolve(false)
          },
          {
            text: 'Grant Permissions',
            onPress: () => resolve(true)
          }
        ]
      );
    });
  }

  /**
   * Handle cases where permissions were denied or environment is limited
   * Provides helpful guidance based on the specific situation
   */
  async handlePermissionIssue(issueType, details) {
    let title, message, actions;

    switch (issueType) {
      case 'environment_limitation':
        title = 'Development Environment Limitation';
        message = 'Bluetooth permissions require a development build for testing.\n\n' +
                 'You can:\n' +
                 '• Continue with manual trip tracking\n' +
                 '• Create a development build for full bluetooth testing\n' +
                 '• Test location permissions (which work in Expo Go)';
        actions = [
          { text: 'Continue Manual', onPress: () => Promise.resolve('manual') },
          { text: 'Learn About Dev Builds', onPress: () => Promise.resolve('learn_dev_build') }
        ];
        break;

      case 'permission_denied':
        title = 'Permissions Required';
        message = `${details.message}\n\n` +
                 'Without these permissions, automatic trip tracking won\'t work. ' +
                 'You can still use manual trip tracking.\n\n' +
                 'To enable automatic tracking later, go to Settings > Apps > Mileage Tracker > Permissions.';
        actions = [
          { text: 'Use Manual Tracking', onPress: () => Promise.resolve('manual') },
          { text: 'Open Settings', onPress: () => { Linking.openSettings(); return Promise.resolve('settings'); } }
        ];
        break;

      default:
        title = 'Bluetooth Access Issue';
        message = 'There was an issue with bluetooth permissions. You can still use manual trip tracking.';
        actions = [
          { text: 'Continue', onPress: () => Promise.resolve('continue') }
        ];
    }

    return new Promise((resolve) => {
      Alert.alert(title, message, actions.map(action => ({
        text: action.text,
        onPress: () => resolve(action.onPress())
      })));
    });
  }

  /**
   * Get detailed, human-readable status of current bluetooth permissions
   * Includes environment capability information
   */
  async getPermissionStatus() {
    try {
      const environmentSupported = await this.checkEnvironmentSupport();

      if (!environmentSupported) {
        // Check if location permissions work even if bluetooth doesn't
        let locationWorks = false;
        try {
          const locationStatus = await this.checkLocationPermissions();
          locationWorks = true;
          console.log('Location permission check succeeded, bluetooth API limited');
        } catch (locationError) {
          console.log('Both location and bluetooth APIs appear limited');
        }

        if (locationWorks) {
          return {
            status: 'environment_partial',
            message: 'Location permissions work but bluetooth permissions require a development build. This is normal in Expo Go.',
            suggestion: 'You can test location functionality now and create a development build for full bluetooth testing.'
          };
        } else {
          return {
            status: 'environment_limited',
            message: 'Both bluetooth and location permissions require a development build for testing.',
            suggestion: 'Consider creating a development build for full native functionality testing.'
          };
        }
      }

      const permissionResult = await this.hasAllBluetoothPermissions();

      if (permissionResult.granted) {
        return {
          status: 'granted',
          message: 'All bluetooth permissions are granted. Automatic tracking is available.'
        };
      }

      if (permissionResult.reason === 'fresh_check' && permissionResult.details) {
        const { bluetooth, location } = permissionResult.details;

        if (!bluetooth && !location) {
          return {
            status: 'none_granted',
            message: 'Bluetooth and location permissions need to be requested for automatic tracking.'
          };
        } else if (!bluetooth) {
          return {
            status: 'bluetooth_needed',
            message: 'Bluetooth permission is needed for automatic tracking. Location permission is available.'
          };
        } else if (!location) {
          return {
            status: 'location_needed',
            message: 'Location permission is needed for bluetooth scanning. Bluetooth permission is available.'
          };
        }
      }

      return {
        status: 'unknown',
        message: 'Permission status could not be determined clearly.',
        details: permissionResult
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Error checking permission status.',
        error: error.message
      };
    }
  }

  /**
   * Cache management methods - unchanged from previous version
   */
  isPermissionCacheValid() {
    if (!this.permissionCache.lastChecked) return false;

    const now = Date.now();
    const elapsed = now - this.permissionCache.lastChecked;

    return elapsed < this.cacheTimeout;
  }

  updatePermissionCache(bluetooth, location) {
    this.permissionCache = {
      ...this.permissionCache,
      bluetooth,
      location,
      lastChecked: Date.now()
    };
  }

  clearPermissionCache() {
    this.permissionCache = {
      bluetooth: null,
      location: null,
      lastChecked: null,
      environmentSupported: this.permissionCache.environmentSupported
    };
  }
}

// Export singleton instance
export default new BluetoothPermissionManager();