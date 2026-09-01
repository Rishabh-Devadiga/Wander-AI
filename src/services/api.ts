import {
  HealthStatus,
  Destination,
  Hotel,
  Activity,
  TransportOption,
  Trip,
  TripPreference,
  AIChatResponse,
  PossibleOptionItem,
} from '../types/tourflow';

const API_BASE = '/api';

export const TourFlowApi = {
  // Health & Diagnostics
  async getHealth(): Promise<HealthStatus> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) {
      throw new Error(`Health check failed with status ${res.status}`);
    }
    return await res.json();
  },

  // Destinations
  async getDestinations(featuredOnly = false): Promise<Destination[]> {
    const url = featuredOnly ? `${API_BASE}/destinations?featured_only=true` : `${API_BASE}/destinations`;
    const res = await fetch(url);
    if (!res.ok) {
      return [];
    }
    return await res.json();
  },

  async getDestinationById(idOrSlug: string): Promise<Destination> {
    const res = await fetch(`${API_BASE}/destinations/${idOrSlug}`);
    if (!res.ok) {
      throw new Error(`Destination not found: ${idOrSlug}`);
    }
    return await res.json();
  },

  // Catalog items
  async getHotels(destinationId?: string, category?: string): Promise<Hotel[]> {
    const params = new URLSearchParams();
    if (destinationId) params.set('destination_id', destinationId);
    if (category) params.set('category', category);
    const res = await fetch(`${API_BASE}/hotels?${params.toString()}`);
    if (!res.ok) {
      return [];
    }
    return await res.json();
  },

  async getActivities(destinationId?: string, category?: string): Promise<Activity[]> {
    const params = new URLSearchParams();
    if (destinationId) params.set('destination_id', destinationId);
    if (category) params.set('category', category);
    const res = await fetch(`${API_BASE}/activities?${params.toString()}`);
    if (!res.ok) {
      return [];
    }
    return await res.json();
  },

  async getTransport(destinationId?: string, type?: string): Promise<TransportOption[]> {
    const params = new URLSearchParams();
    if (destinationId) params.set('destination_id', destinationId);
    if (type) params.set('type', type);
    const res = await fetch(`${API_BASE}/transport?${params.toString()}`);
    if (!res.ok) {
      return [];
    }
    return await res.json();
  },

  // Trips (Central Entity)
  async createTrip(payload: {
    title?: string;
    destination_name?: string;
    destination_id?: string;
    destination?: Destination;
    duration_days?: number;
    total_budget?: number;
    traveler_count?: number;
    travel_type?: 'solo' | 'couple' | 'family' | 'friends';
    origin?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    formatted_dates?: string | null;
    pace?: 'relaxed' | 'balanced' | 'packed';
    preferences?: Partial<TripPreference>;
  }): Promise<Trip> {
    const res = await fetch(`${API_BASE}/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create trip' }));
      throw new Error(err.detail || 'Failed to create trip');
    }
    return await res.json();
  },

  async changeTransport(tripId: string, transportId: string): Promise<Trip> {
    const res = await fetch(`${API_BASE}/trips/${tripId}/change-transport`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transport_id: transportId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update transport' }));
      throw new Error(err.detail || 'Failed to update transport');
    }
    return await res.json();
  },

  async changeAccommodation(tripId: string, accommodationId: string): Promise<Trip> {
    const res = await fetch(`${API_BASE}/trips/${tripId}/change-accommodation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accommodation_id: accommodationId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update accommodation' }));
      throw new Error(err.detail || 'Failed to update accommodation');
    }
    return await res.json();
  },

  async changeDailyAccommodation(tripId: string, dayNumber: number, accommodationId: string): Promise<Trip> {
    const res = await fetch(`${API_BASE}/trips/${tripId}/change-daily-accommodation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ day_number: dayNumber, accommodation_id: accommodationId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update day accommodation' }));
      throw new Error(err.detail || 'Failed to update day accommodation');
    }
    return await res.json();
  },

  async getTrip(tripId: string): Promise<Trip> {
    const res = await fetch(`${API_BASE}/trips/${tripId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Trip not found' }));
      throw new Error(err.detail || `Trip not found with id: ${tripId}`);
    }
    return await res.json();
  },

  async updateTrip(tripId: string, payload: Partial<Trip>): Promise<Trip> {
    const res = await fetch(`${API_BASE}/trips/${tripId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update trip' }));
      throw new Error(err.detail || 'Failed to update trip');
    }
    return await res.json();
  },

  async getTripPreferences(tripId: string): Promise<TripPreference> {
    const res = await fetch(`${API_BASE}/trips/${tripId}/preferences`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Preferences not found' }));
      throw new Error(err.detail || 'Failed to get trip preferences');
    }
    return await res.json();
  },

  async updateTripPreferences(tripId: string, preferences: Partial<TripPreference>): Promise<TripPreference> {
    const res = await fetch(`${API_BASE}/trips/${tripId}/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preferences),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update preferences' }));
      throw new Error(err.detail || 'Failed to update trip preferences');
    }
    return await res.json();
  },

  async getTrips(filters?: { status?: string; search?: string; operator_id?: string }): Promise<Trip[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.operator_id) params.append('operator_id', filters.operator_id);
      const res = await fetch(`${API_BASE}/trips?${params.toString()}`);
      if (res.ok) return await res.json();
    } catch {
      // Return empty array on network or server failure
    }
    return [];
  },

  async triggerDisruption(tripId: string): Promise<{ success: boolean; trip: Trip }> {
    const res = await fetch(`${API_BASE}/trips/${tripId}/trigger-disruption`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to trigger disruption' }));
      throw new Error(err.detail || 'Failed to trigger disruption');
    }
    return await res.json();
  },

  async getImpactAnalysis(tripId: string, disruption?: any): Promise<any> {
    const res = await fetch(`${API_BASE}/trips/${tripId}/impact-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disruption }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to compute impact analysis' }));
      throw new Error(err.detail || 'Failed to compute impact analysis');
    }
    return await res.json();
  },

  async getAiReplanOptions(tripId: string, disruption?: any): Promise<any> {
    const res = await fetch(`${API_BASE}/trips/${tripId}/ai-replan-options`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disruption }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch replan alternatives' }));
      throw new Error(err.detail || 'Failed to fetch replan alternatives');
    }
    return await res.json();
  },

  async applyReplan(tripId: string, alternativeId: string, notes?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/trips/${tripId}/apply-replan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alternative_id: alternativeId, notes }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to apply replan' }));
      throw new Error(err.detail || 'Failed to apply replan');
    }
    return await res.json();
  },

  async acceptTripRequest(tripId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/trips/${tripId}/accept-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to accept trip request' }));
      throw new Error(err.detail || 'Failed to accept trip request');
    }
    return await res.json();
  },

  async declineTripRequest(tripId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/trips/${tripId}/decline-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to decline trip request' }));
      throw new Error(err.detail || 'Failed to decline trip request');
    }
    return await res.json();
  },

  async getOperatorDashboard(): Promise<any> {
    const res = await fetch(`${API_BASE}/operator/dashboard`);
    if (!res.ok) {
      return null;
    }
    return await res.json();
  },

  async getOperatorVendors(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/operator/vendors`);
    if (!res.ok) {
      return [];
    }
    return await res.json();
  },

  async toggleVendor(vendorId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/operator/vendors/${vendorId}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to toggle vendor status' }));
      throw new Error(err.detail || 'Failed to toggle vendor status');
    }
    return await res.json();
  },

  async getOperatorBookings(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/operator/bookings`);
    if (!res.ok) {
      return [];
    }
    return await res.json();
  },

  async updateBookingAction(bookingId: string, action: 'confirm' | 'cancel' | 'rebook'): Promise<any> {
    const res = await fetch(`${API_BASE}/operator/bookings/${bookingId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update booking' }));
      throw new Error(err.detail || 'Failed to update booking');
    }
    return await res.json();
  },

  async getOperatorAlerts(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/operator/alerts`);
    if (!res.ok) {
      return [];
    }
    return await res.json();
  },

  async resolveAlert(alertId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/operator/alerts/${alertId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to resolve alert' }));
      throw new Error(err.detail || 'Failed to resolve alert');
    }
    return await res.json();
  },

  async getOperatorAnalytics(): Promise<any> {
    const res = await fetch(`${API_BASE}/operator/analytics`);
    if (!res.ok) {
      return null;
    }
    return await res.json();
  },

  async getSyncVersion(): Promise<{ version: number; timestamp: string; trips_count: number }> {
    const res = await fetch(`${API_BASE}/sync/version`);
    if (!res.ok) {
      return { version: 0, timestamp: new Date().toISOString(), trips_count: 0 };
    }
    return await res.json();
  },

  async operatorLogin(email: string, password: string): Promise<{ success: boolean; user: any; detail?: string }> {
    const res = await fetch(`${API_BASE}/auth/operator-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Authentication failed' }));
      throw new Error(err.detail || 'Invalid operator credentials');
    }
    return await res.json();
  },

  async operatorAiAssistant(message: string, contextTripId?: string): Promise<{ reply: string; timestamp: string; suggested_actions: string[] }> {
    const res = await fetch(`${API_BASE}/operator/ai-assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context_trip_id: contextTripId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'AI Operations Assistant error' }));
      throw new Error(err.detail || 'AI Operations Assistant error');
    }
    return await res.json();
  },

  // AI Services
  async aiChat(
    message: string, 
    context?: Record<string, any>, 
    currentTrip?: Trip | null,
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<AIChatResponse> {
    const res = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message, 
        session_context: context, 
        current_trip: currentTrip,
        history: history || []
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to process AI chat message' }));
      throw new Error(err.detail || 'Failed to process AI chat message');
    }
    return await res.json();
  },

  async aiExtractPreferences(textPrompt: string): Promise<Record<string, any>> {
    const res = await fetch(`${API_BASE}/ai/extract-preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text_prompt: textPrompt }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to extract preferences' }));
      throw new Error(err.detail || 'Failed to extract preferences');
    }
    return await res.json();
  },

  async aiReplan(tripId: string, triggerEvent: { type: string; severity: string; title: string; description: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/ai/replan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trip_id: tripId, trigger_event: triggerEvent }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to generate replan' }));
      throw new Error(err.detail || 'Failed to generate replan');
    }
    return await res.json();
  },

  // Itinerary Activity Real-Time Modification Handlers
  async addItineraryActivity(tripId: string, activityData: {
    day_number: number;
    title: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    cost?: number;
    location?: string;
    item_type?: string;
    image_url?: string;
    duration?: string;
    walking_intensity?: 'none' | 'light' | 'moderate' | 'high';
    rest_buffer_minutes?: number;
  }): Promise<Trip> {
    const res = await fetch(`${API_BASE}/trips/${tripId}/add-activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activityData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to add itinerary activity' }));
      throw new Error(err.detail || 'Failed to add itinerary activity');
    }
    return await res.json();
  },

  async deleteItineraryActivity(tripId: string, itemId: string): Promise<Trip> {
    const res = await fetch(`${API_BASE}/trips/${tripId}/delete-activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to delete itinerary activity' }));
      throw new Error(err.detail || 'Failed to delete itinerary activity');
    }
    return await res.json();
  },

  async deleteItineraryItem(tripId: string, itemId: string): Promise<Trip> {
    return await this.deleteItineraryActivity(tripId, itemId);
  },

  async deleteTrip(tripId: string): Promise<{ success: boolean; message?: string }> {
    const res = await fetch(`${API_BASE}/trips/${tripId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      if (res.status === 404) return { success: true };
      const err = await res.json().catch(() => ({ detail: 'Failed to delete trip' }));
      throw new Error(err.detail || 'Failed to delete trip');
    }
    return await res.json();
  },

  async deleteItinerary(itineraryId: string): Promise<{ success: boolean; message?: string }> {
    return await this.deleteTrip(itineraryId);
  },

  async swapItineraryActivity(tripId: string, params: {
    item_id: string;
    new_title: string;
    new_description?: string;
    new_cost?: number;
    new_image_url?: string;
  }): Promise<Trip> {
    const res = await fetch(`${API_BASE}/trips/${tripId}/swap-activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to swap itinerary activity' }));
      throw new Error(err.detail || 'Failed to swap itinerary activity');
    }
    return await res.json();
  },

  async editItineraryActivity(tripId: string, params: {
    item_id: string;
    title?: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    cost?: number;
  }): Promise<Trip> {
    const res = await fetch(`${API_BASE}/trips/${tripId}/edit-activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to edit itinerary activity' }));
      throw new Error(err.detail || 'Failed to edit itinerary activity');
    }
    return await res.json();
  },

  async getPossibleOptions(destName: string, tripId?: string): Promise<PossibleOptionItem[]> {
    try {
      const q = new URLSearchParams({ destination: destName });
      if (tripId) q.append('trip_id', tripId);
      const res = await fetch(`${API_BASE}/possible-options?${q.toString()}`);
      if (res.ok) return await res.json();
    } catch {
      // return empty array on failure
    }
    return [];
  },

  async toggleItineraryActivity(tripId: string, itemId: string): Promise<Trip> {
    const res = await fetch(`${API_BASE}/trips/${tripId}/toggle-activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to toggle itinerary activity' }));
      throw new Error(err.detail || 'Failed to toggle itinerary activity');
    }
    return await res.json();
  },

  async addDayLeg(tripId: string): Promise<Trip> {
    const res = await fetch(`${API_BASE}/trips/${tripId}/add-day-leg`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to add day leg' }));
      throw new Error(err.detail || 'Failed to add day leg');
    }
    return await res.json();
  },

  async removeDayLeg(tripId: string, dayNumber: number): Promise<Trip> {
    const res = await fetch(`${API_BASE}/trips/${tripId}/remove-day-leg`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ day_number: dayNumber }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to remove day leg' }));
      throw new Error(err.detail || 'Failed to remove day leg');
    }
    return await res.json();
  },

  async changeTripTransport(tripId: string, transportId: string): Promise<Trip> {
    const res = await fetch(`${API_BASE}/trips/${tripId}/change-transport`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transport_id: transportId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to change transport' }));
      throw new Error(err.detail || 'Failed to change transport');
    }
    return await res.json();
  },

  async changeTripAccommodation(tripId: string, accommodationId: string): Promise<Trip> {
    const res = await fetch(`${API_BASE}/trips/${tripId}/change-accommodation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accommodation_id: accommodationId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to change accommodation' }));
      throw new Error(err.detail || 'Failed to change accommodation');
    }
    return await res.json();
  },

  async changeDayAccommodation(tripId: string, dayNumber: number, accommodationId: string): Promise<Trip> {
    const res = await fetch(`${API_BASE}/trips/${tripId}/change-day-accommodation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ day_number: dayNumber, accommodation_id: accommodationId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to change day accommodation' }));
      throw new Error(err.detail || 'Failed to change day accommodation');
    }
    return await res.json();
  },

  // Lock Booking Choice
  async lockBookingChoice(tripId: string, params: {
    item_type: string;
    item_id?: string;
    booking_mode: 'ai_guide' | 'self_booking';
    details: {
      title: string;
      amount: number;
      provider?: string;
      external_url?: string;
    };
  }): Promise<{ success: boolean; booking: any; trip: Trip }> {
    const res = await fetch(`${API_BASE}/trips/${tripId}/lock-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to lock in booking choice' }));
      throw new Error(err.detail || 'Failed to lock in booking choice');
    }
    return await res.json();
  },

  // User Abstract Preferences Storage Logic
  getUserPreferences(): { tags: string[]; updated_at: string } | null {
    try {
      const raw = localStorage.getItem('user_preferences');
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return null;
  },

  saveAbstractUserPreferences(tags: string[]): void {
    try {
      if (!tags || tags.length === 0) return;
      const existing = TourFlowApi.getUserPreferences()?.tags || [];
      const combined = Array.from(new Set([...existing, ...tags]));
      localStorage.setItem(
        'user_preferences',
        JSON.stringify({ tags: combined, updated_at: new Date().toISOString() })
      );
    } catch {
      // ignore
    }
  },

  clearActiveSession(): void {
    try {
      sessionStorage.clear();
    } catch {
      // ignore
    }
  },
};
