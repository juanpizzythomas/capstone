export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface DistanceResult {
  distance: number;
  isInRange: boolean;
  canCheckIn: boolean;
  message: string;
  status: 'in-office' | 'near-office' | 'far-office' | 'outside-city';
}

const OFFICE_LAT = -6.241977;
const OFFICE_LON = 106.978994;
const CHECK_IN_RADIUS = 100;
const NOTIFICATION_RADIUS = 500;
const CITY_RADIUS = 50000;

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371000;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const geolocationService = {
  getCurrentLocation: (): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          });
        },
        (error) => {
          let message = 'Unable to get your location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location permission denied. Please enable location access.';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              message = 'Location request timed out.';
              break;
          }
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  },

  watchLocation: (callback: (location: LocationData) => void): number => {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported');
    }

    return navigator.geolocation.watchPosition(
      (position) => {
        callback({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        console.error('Watch position error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  },

  clearWatch: (watchId: number): void => {
    navigator.geolocation.clearWatch(watchId);
  },

  calculateDistance: (lat: number, lon: number): DistanceResult => {
    const distance = haversineDistance(lat, lon, OFFICE_LAT, OFFICE_LON);

    let status: DistanceResult['status'];
    let message: string;
    let canCheckIn: boolean;
    let isInRange: boolean;

    if (distance <= CHECK_IN_RADIUS) {
      status = 'in-office';
      message = `Anda berada di dalam area kantor (${Math.round(distance)}m)`;
      canCheckIn = true;
      isInRange = true;
    } else if (distance <= NOTIFICATION_RADIUS) {
      status = 'near-office';
      message = `Anda berada ${Math.round(distance)}m dari kantor. Jarak minimum untuk absen: ${CHECK_IN_RADIUS}m`;
      canCheckIn = false;
      isInRange = true;
    } else if (distance <= CITY_RADIUS) {
      status = 'far-office';
      const km = (distance / 1000).toFixed(1);
      message = `Anda berada ${km} km dari kantor. Harap mendekat untuk melakukan absen.`;
      canCheckIn = false;
      isInRange = false;
    } else {
      status = 'outside-city';
      const km = (distance / 1000).toFixed(1);
      message = `Anda berada di luar area kota (${km} km dari kantor)`;
      canCheckIn = false;
      isInRange = false;
    }

    return {
      distance: Math.round(distance),
      isInRange,
      canCheckIn,
      message,
      status,
    };
  },

  getOfficeLocation: () => ({
    latitude: OFFICE_LAT,
    longitude: OFFICE_LON,
  }),

  formatDistance: (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} meter`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  },
};
