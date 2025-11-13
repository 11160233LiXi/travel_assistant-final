export interface PlaceItem {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  placeId?: string;
  durationMinutes: number;
  day?: number; // 新增 day 屬性（使用者選擇第幾天）

}

export interface DayItemSerialized {
  start: string; // ISO
  end: string; // ISO
  place: PlaceItem;
  travelMinutesBefore: number;
  distanceText?: string;
}

export interface DayBlockSerialized {
  date: string; // ISO
  items: DayItemSerialized[];
}

export interface TripSerialized {
  id: string;
  name: string;
  createdAt: string; // ISO
  startDate: string; // 'yyyy-MM-dd'
  days: number;
  dayStartTime: string; // 'HH:mm'
  dayEndTime: string; // 'HH:mm'
  places: PlaceItem[];
  schedule: DayBlockSerialized[]; // 允許 []
}

/* runtime (UI) types */
export interface ScheduleItem {
  start: Date;
  end: Date;
  place: PlaceItem;
  travelMinutesBefore: number;
  distanceText?: string;
}

export interface DayBlock {
  date: Date;
  items: ScheduleItem[];
}


export interface PlaceSuggestion {
  name: string;
  reason: string;
  stayMinutes: number;
}