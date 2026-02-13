import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import type { Location as LocationType } from '@/types';

interface UseLocationReturn {
  location: LocationType | null;
  errorMsg: string | null;
  isLoading: boolean;
  permissionStatus: Location.PermissionStatus | null;
  requestPermission: () => Promise<boolean>;
  refreshLocation: () => Promise<void>;
}

export function useLocation(): UseLocationReturn {
  const [location, setLocation] = useState<LocationType | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] =
    useState<Location.PermissionStatus | null>(null);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);

      if (status !== 'granted') {
        setErrorMsg('Location permission was denied');
        return false;
      }

      return true;
    } catch (error) {
      setErrorMsg('Failed to request location permission');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshLocation = useCallback(async (): Promise<void> => {
    if (permissionStatus !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
    } catch (error) {
      setErrorMsg('Failed to get current location');
    } finally {
      setIsLoading(false);
    }
  }, [permissionStatus, requestPermission]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(status);
    })();
  }, []);

  return {
    location,
    errorMsg,
    isLoading,
    permissionStatus,
    requestPermission,
    refreshLocation,
  };
}
