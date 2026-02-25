import { create } from 'zustand';

interface CourierLocation {
  courierId: string;
  courierName: string;
  latitude: number;
  longitude: number;
  vehicleType?: string;
  lastUpdate?: string;
}

interface LocationState {
  courierLocations: CourierLocation[];
  myLocation: {
    latitude: number | null;
    longitude: number | null;
  };
  isTracking: boolean;
  updateCourierLocation: (location: CourierLocation) => void;
  setCourierLocations: (locations: CourierLocation[]) => void;
  setMyLocation: (latitude: number, longitude: number) => void;
  setIsTracking: (isTracking: boolean) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  courierLocations: [],
  myLocation: {
    latitude: null,
    longitude: null
  },
  isTracking: false,

  updateCourierLocation: (location: CourierLocation) => {
    set((state) => {
      const existing = state.courierLocations.find(
        (c) => c.courierId === location.courierId
      );

      if (existing) {
        return {
          courierLocations: state.courierLocations.map((c) =>
            c.courierId === location.courierId ? location : c
          )
        };
      } else {
        return {
          courierLocations: [...state.courierLocations, location]
        };
      }
    });
  },

  setCourierLocations: (locations: CourierLocation[]) => {
    set({ courierLocations: locations });
  },

  setMyLocation: (latitude: number, longitude: number) => {
    set({
      myLocation: { latitude, longitude }
    });
  },

  setIsTracking: (isTracking: boolean) => {
    set({ isTracking });
  }
}));
