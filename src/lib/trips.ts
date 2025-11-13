import type { TripSerialized } from "../types";

const TRIPS_KEY = "my-trips-v1";

export function loadTrips(): TripSerialized[] {
  try {
    const raw = localStorage.getItem(TRIPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTrips(list: TripSerialized[]): void {
  localStorage.setItem(TRIPS_KEY, JSON.stringify(list));
}

export function findTrip(id: string): TripSerialized | undefined {
  return loadTrips().find((t) => t.id === id);
}