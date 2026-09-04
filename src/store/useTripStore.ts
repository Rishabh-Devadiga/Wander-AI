import { create } from 'zustand';
import { Trip, ItineraryItem, PossibleOptionItem, TransportBookingOption, AccommodationOption, CostBreakdown } from '../types/tourflow';
import { TourFlowApi } from '../services/api';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  suggestions?: string[];
  intent?: any;
}

interface TripState {
  currentTrip: Trip | null;
  workspaceState: 'planning' | 'generated';
  mobileTab: 'chat' | 'trip';
  activeTripTab: 'overview' | 'map' | 'itinerary' | 'options' | 'packing';
  activeRanking: 'budget' | 'speed' | 'rating' | 'distance';
  selectedDayForMap: number | null;
  selectedDayForHotelChange: number | null;
  tripUpdateToast: string | null;
  possibleOptions: PossibleOptionItem[];
  isLoadingOptions: boolean;
  isSyncing: boolean;
  messages: ChatMessage[];

  // Action setters
  setCurrentTrip: (trip: Trip | null) => void;
  setWorkspaceState: (state: 'planning' | 'generated') => void;
  setMobileTab: (tab: 'chat' | 'trip') => void;
  setActiveTripTab: (tab: 'overview' | 'map' | 'itinerary' | 'options' | 'packing') => void;
  setActiveRanking: (ranking: 'budget' | 'speed' | 'rating' | 'distance') => void;
  setSelectedDayForMap: (day: number | null) => void;
  setSelectedDayForHotelChange: (day: number | null) => void;
  setTripUpdateToast: (msg: string | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (msg: ChatMessage) => void;

  // Real-Time Trip Customization Operations
  fetchPossibleOptions: (destName: string, tripId?: string) => Promise<void>;
  toggleActivity: (itemId: string) => Promise<void>;
  deleteActivity: (itemId: string, title?: string, dayNumber?: number) => Promise<void>;
  deleteItineraryItem: (dayId: number | string, itemId: string, itemTitle?: string) => Promise<void>;
  deleteItinerary: (itineraryId: string) => Promise<void>;
  swapActivity: (itemId: string, newOption: Partial<PossibleOptionItem> | { title: string; description?: string; cost?: number; image_url?: string }) => Promise<void>;
  addActivity: (dayNumber: number, itemData: {
    title: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    cost?: number;
    location?: string;
    item_type?: string;
    image_url?: string;
  }) => Promise<void>;
  editActivity: (itemId: string, itemData: {
    title?: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    cost?: number;
  }) => Promise<void>;
  addDayLeg: () => Promise<void>;
  removeDayLeg: (dayNumber: number) => Promise<void>;
  changeTransport: (transportId: string) => Promise<void>;
  changeAccommodation: (accommodationId: string, dayNumber?: number) => Promise<void>;
}

export const useTripStore = create<TripState>((set, get) => ({
  currentTrip: null,
  workspaceState: 'planning',
  mobileTab: 'chat',
  activeTripTab: 'overview',
  activeRanking: 'budget',
  selectedDayForMap: null,
  selectedDayForHotelChange: null,
  tripUpdateToast: null,
  possibleOptions: [],
  isLoadingOptions: false,
  isSyncing: false,
  messages: [],

  setCurrentTrip: (trip) => {
    set({ currentTrip: trip });
    if (trip) {
      get().fetchPossibleOptions(trip.destination?.name || 'Darjeeling', trip.id);
    }
  },

  setWorkspaceState: (workspaceState) => set({ workspaceState }),
  setMobileTab: (mobileTab) => set({ mobileTab }),
  setActiveTripTab: (activeTripTab) => set({ activeTripTab }),
  setActiveRanking: (activeRanking) => set({ activeRanking }),
  setSelectedDayForMap: (selectedDayForMap) => set({ selectedDayForMap }),
  setSelectedDayForHotelChange: (selectedDayForHotelChange) => set({ selectedDayForHotelChange }),
  setTripUpdateToast: (tripUpdateToast) => {
    set({ tripUpdateToast });
    if (tripUpdateToast) {
      setTimeout(() => {
        if (get().tripUpdateToast === tripUpdateToast) {
          set({ tripUpdateToast: null });
        }
      }, 4000);
    }
  },
  setMessages: (messages) => set({ messages }),
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),

  fetchPossibleOptions: async (destName: string, tripId?: string) => {
    set({ isLoadingOptions: true });
    try {
      const options = await TourFlowApi.getPossibleOptions(destName, tripId);
      set({ possibleOptions: options, isLoadingOptions: false });
    } catch {
      set({ isLoadingOptions: false });
    }
  },

  toggleActivity: async (itemId: string) => {
    const trip = get().currentTrip;
    if (!trip) return;

    // Optimistic UI update
    const updatedItinerary = trip.itinerary.map((item) => {
      if (item.id === itemId) {
        const isCurrentlyDisabled = item.is_disabled || item.status === 'skipped';
        return {
          ...item,
          is_disabled: !isCurrentlyDisabled,
          status: (!isCurrentlyDisabled ? 'skipped' : 'confirmed') as any,
        };
      }
      return item;
    });

    // Recalculate local costs optimistically
    const activeItems = updatedItinerary.filter((i) => !i.is_disabled && i.status !== 'skipped');
    const actCost = activeItems
      .filter((i) => ['activity', 'sightseeing', 'leisure', 'meal'].includes(i.item_type) && (i.cost || 0) > 0)
      .reduce((sum, i) => sum + (i.cost || 0), 0);

    const transportCost = trip.selected_transport?.total_price || 0;
    const accomCost = trip.selected_accommodation?.total_price || 0;
    const foodCost = trip.cost_breakdown?.food_and_other || 4000;
    const totalCost = transportCost + accomCost + actCost + foodCost;

    const optimisticTrip: Trip = {
      ...trip,
      itinerary: updatedItinerary,
      cost_breakdown: {
        ...(trip.cost_breakdown || {
          transport: transportCost,
          accommodation: accomCost,
          activities: actCost,
          food_and_other: foodCost,
          total: totalCost,
          target_budget: trip.total_budget,
          remaining_budget: Math.max(0, trip.total_budget - totalCost),
          is_under_budget: true,
        }),
        activities: actCost,
        total: totalCost,
        remaining_budget: Math.max(0, trip.total_budget - totalCost),
      },
      total_cost: totalCost,
    };

    set({ currentTrip: optimisticTrip });

    try {
      const serverUpdatedTrip = await TourFlowApi.toggleItineraryActivity(trip.id, itemId);
      set({ currentTrip: serverUpdatedTrip });
      const targetItem = serverUpdatedTrip.itinerary.find((i) => i.id === itemId);
      const isNowSkipped = targetItem?.is_disabled || targetItem?.status === 'skipped';
      get().setTripUpdateToast(
        isNowSkipped
          ? `Deselected "${targetItem?.title || 'item'}". Budget & schedule adjusted.`
          : `Re-enabled "${targetItem?.title || 'item'}". Added back to route & budget.`
      );
    } catch {
      // Revert on failure
      set({ currentTrip: trip });
    }
  },

  deleteActivity: async (itemId: string, title?: string, dayNumber?: number) => {
    return get().deleteItineraryItem(dayNumber || 1, itemId, title);
  },

  deleteItineraryItem: async (dayId: number | string, itemId: string, itemTitle?: string) => {
    const trip = get().currentTrip;
    if (!trip) return;

    // Optimistic UI state update
    const targetDay = Number(dayId) || 1;
    const filteredItinerary = (trip.itinerary || []).filter((item) => item.id !== itemId);
    
    // Re-index daily timeline
    const dayItems = filteredItinerary.filter((i) => i.day_number === targetDay);
    let currentH = 9;
    let currentM = 0;
    dayItems.forEach((item, idx) => {
      item.order_index = idx + 1;
      if (!item.is_disabled && item.status !== 'skipped') {
        const startH12 = currentH % 12 === 0 ? 12 : currentH % 12;
        const period = currentH >= 12 ? 'PM' : 'AM';
        item.start_time = `${startH12.toString().padStart(2, '0')}:${currentM.toString().padStart(2, '0')} ${period}`;
        
        const dur = (item.item_type as string) === 'meal' ? 90 : ((item.item_type as string) === 'sightseeing' ? 120 : (item.item_type === 'hotel' ? 60 : 150));
        const endTotal = currentH * 60 + currentM + dur;
        const endH24 = Math.floor(endTotal / 60);
        const endMMin = endTotal % 60;
        const endH12 = endH24 % 12 === 0 ? 12 : endH24 % 12;
        const endPeriod = endH24 >= 12 ? 'PM' : 'AM';
        item.end_time = `${endH12.toString().padStart(2, '0')}:${endMMin.toString().padStart(2, '0')} ${endPeriod}`;

        const nextStart = endTotal + (idx === 1 ? 45 : 30);
        currentH = Math.floor(nextStart / 60);
        currentM = nextStart % 60;
      }
    });

    // Recompute 4-category cost breakdown optimistically
    const activeActItems = filteredItinerary.filter((i) => !i.is_disabled && i.status !== 'skipped');
    const actCost = activeActItems
      .filter((i) => ['activity', 'sightseeing', 'leisure', 'meal'].includes(i.item_type) && (i.cost || 0) > 0)
      .reduce((sum, i) => sum + (i.cost || 0), 0);

    const transportCost = trip.selected_transport?.total_price || 0;
    const accomCost = trip.selected_accommodation?.total_price || 0;
    const foodCost = trip.cost_breakdown?.food_and_other || 4000;
    const totalCost = transportCost + accomCost + actCost + foodCost;

    const optimisticTrip: Trip = {
      ...trip,
      itinerary: filteredItinerary,
      cost_breakdown: {
        ...(trip.cost_breakdown || {
          transport: transportCost,
          accommodation: accomCost,
          activities: actCost,
          food_and_other: foodCost,
          total: totalCost,
          target_budget: trip.total_budget,
          remaining_budget: Math.max(0, trip.total_budget - totalCost),
          is_under_budget: true,
        }),
        activities: actCost,
        total: totalCost,
        remaining_budget: Math.max(0, trip.total_budget - totalCost),
      },
      total_cost: totalCost,
    };

    set({ currentTrip: optimisticTrip });

    try {
      const updatedTrip = await TourFlowApi.deleteItineraryItem(trip.id, itemId);
      set({ currentTrip: updatedTrip });
      get().setTripUpdateToast(`Deleted "${itemTitle || 'item'}". Daily timeline order & 4-category budget recomputed.`);
    } catch (e) {
      console.error('Failed to delete itinerary item', e);
      // fallback keep optimistic
    }
  },

  deleteItinerary: async (itineraryId: string) => {
    try {
      await TourFlowApi.deleteItinerary(itineraryId);
      const current = get().currentTrip;
      if (current && (current.id === itineraryId || current.id === '1024' || current.id === 'trp-manali-alpine-demo-001')) {
        set({ currentTrip: null, workspaceState: 'planning', activeTripTab: 'overview' });
      }
      get().setTripUpdateToast(`Trip itinerary deleted successfully.`);
    } catch (e) {
      console.error('Failed to delete trip itinerary', e);
      const current = get().currentTrip;
      if (current && (current.id === itineraryId || current.id === '1024' || current.id === 'trp-manali-alpine-demo-001')) {
        set({ currentTrip: null, workspaceState: 'planning' });
      }
      get().setTripUpdateToast(`Trip deleted.`);
    }
  },

  swapActivity: async (itemId: string, newOption: Partial<PossibleOptionItem> | { title: string; description?: string; cost?: number; image_url?: string }) => {
    const trip = get().currentTrip;
    if (!trip) return;

    try {
      const updatedTrip = await TourFlowApi.swapItineraryActivity(trip.id, {
        item_id: itemId,
        new_title: newOption.title || '',
        new_description: newOption.description,
        new_cost: newOption.cost,
        new_image_url: newOption.image_url,
      });
      set({ currentTrip: updatedTrip });
      get().setTripUpdateToast(`Swapped to "${newOption.title}". Recalculated timeline & total package.`);
    } catch (e) {
      console.error('Failed to swap activity', e);
    }
  },

  addActivity: async (dayNumber: number, itemData: {
    title: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    cost?: number;
    location?: string;
    item_type?: string;
    image_url?: string;
  }) => {
    const trip = get().currentTrip;
    if (!trip) return;

    try {
      const updatedTrip = await TourFlowApi.addItineraryActivity(trip.id, {
        day_number: dayNumber,
        ...itemData,
      });
      set({ currentTrip: updatedTrip });
      get().setTripUpdateToast(`Added "${itemData.title}" to Day ${dayNumber}. Recalculated sequence & budget.`);
    } catch (e) {
      console.error('Failed to add activity', e);
    }
  },

  editActivity: async (itemId: string, itemData: {
    title?: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    cost?: number;
  }) => {
    const trip = get().currentTrip;
    if (!trip) return;

    try {
      const updatedTrip = await TourFlowApi.editItineraryActivity(trip.id, {
        item_id: itemId,
        ...itemData,
      });
      set({ currentTrip: updatedTrip });
      get().setTripUpdateToast(`Updated "${itemData.title || 'activity'}".`);
    } catch (e) {
      console.error('Failed to edit activity', e);
    }
  },

  addDayLeg: async () => {
    const trip = get().currentTrip;
    if (!trip) return;

    try {
      const updatedTrip = await TourFlowApi.addDayLeg(trip.id);
      set({ currentTrip: updatedTrip });
      get().setTripUpdateToast(`Extended trip to ${updatedTrip.duration_days} Days. Added new day leg with curated sights.`);
    } catch (e) {
      console.error('Failed to add day leg', e);
    }
  },

  removeDayLeg: async (dayNumber: number) => {
    const trip = get().currentTrip;
    if (!trip || trip.duration_days <= 2) {
      get().setTripUpdateToast(`Trip must have at least 2 days.`);
      return;
    }

    try {
      const updatedTrip = await TourFlowApi.removeDayLeg(trip.id, dayNumber);
      set({ currentTrip: updatedTrip });
      get().setTripUpdateToast(`Removed Day ${dayNumber} leg. Adjusted itinerary duration to ${updatedTrip.duration_days} Days.`);
    } catch (e) {
      console.error('Failed to remove day leg', e);
    }
  },

  changeTransport: async (transportId: string) => {
    const trip = get().currentTrip;
    if (!trip) return;

    try {
      const updatedTrip = await TourFlowApi.changeTripTransport(trip.id, transportId);
      set({ currentTrip: updatedTrip });
      get().setTripUpdateToast(`Switched transport to ${updatedTrip.selected_transport?.operator}. Day 1 arrival timeline & budget synced.`);
    } catch (e) {
      console.error('Failed to change transport', e);
    }
  },

  changeAccommodation: async (accommodationId: string, dayNumber?: number) => {
    const trip = get().currentTrip;
    if (!trip) return;

    try {
      let updatedTrip: Trip;
      if (dayNumber) {
        updatedTrip = await TourFlowApi.changeDayAccommodation(trip.id, dayNumber, accommodationId);
        get().setTripUpdateToast(`Updated Day ${dayNumber} accommodation to ${updatedTrip.daily_accommodations?.find(d => d.day_number === dayNumber)?.hotel.name}.`);
      } else {
        updatedTrip = await TourFlowApi.changeTripAccommodation(trip.id, accommodationId);
        get().setTripUpdateToast(`Switched stay to ${updatedTrip.selected_accommodation?.name}. Total cost updated.`);
      }
      set({ currentTrip: updatedTrip });
    } catch (e) {
      console.error('Failed to change accommodation', e);
    }
  },
}));
