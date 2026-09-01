import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Bed,
  Plane,
  Train,
  Car,
  Navigation,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  Sparkles,
  Compass,
  Calendar,
  IndianRupee,
  Clock,
  Star,
  ExternalLink,
  ChevronRight,
  Eye,
  Info
} from 'lucide-react';
import {
  extractTripMapData,
  GeoLocationPoint,
  GeoRouteSegment,
  getDayColor
} from '../utils/geoCoordinates';
import { Trip } from '../types/tourflow';

interface TripInteractiveMapProps {
  trip: Trip;
  selectedDay?: number | null;
  onSelectDay?: (day: number | null) => void;
  className?: string;
}

export const TripInteractiveMap: React.FC<TripInteractiveMapProps> = ({
  trip,
  selectedDay = null,
  onSelectDay,
  className = ''
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);
  const dayTabsContainerRef = useRef<HTMLDivElement>(null);
  const dayTabRefs = useRef<Map<number | null, HTMLButtonElement>>(new Map());

  const [activeDayFilter, setActiveDayFilter] = useState<number | null>(selectedDay);
  const [selectedPoint, setSelectedPoint] = useState<GeoLocationPoint | null>(null);
  const [mapStyle, setMapStyle] = useState<'osm' | 'topo'>('osm');
  const [isMapReady, setIsMapReady] = useState(false);

  // Auto-center active day chip in the horizontal carousel
  const scrollToActiveChip = (dayNum: number | null) => {
    const btn = dayTabRefs.current.get(dayNum);
    if (btn) {
      btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  // Sync external day selection
  useEffect(() => {
    if (selectedDay !== undefined) {
      setActiveDayFilter(selectedDay);
      scrollToActiveChip(selectedDay);
    }
  }, [selectedDay]);

  // Extract canonical map data directly from TripState
  const mapData = useMemo(() => {
    return extractTripMapData(trip);
  }, [trip]);

  // Filtered points based on selected day
  const filteredPoints = useMemo(() => {
    if (activeDayFilter === null) return mapData.points;
    return mapData.points.filter((pt) => {
      if (pt.category === 'destination' || pt.category === 'hotel') return true;
      return pt.dayNumber === activeDayFilter;
    });
  }, [mapData.points, activeDayFilter]);

  // Filtered routes based on selected day
  const filteredRoutes = useMemo(() => {
    if (activeDayFilter === null) return mapData.routes;
    return mapData.routes.filter((rt) => {
      if (activeDayFilter === 1 && rt.dayNumber === 0) return true; // show arrival transfer on day 1
      return rt.dayNumber === activeDayFilter;
    });
  }, [mapData.routes, activeDayFilter]);

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter = mapData.center || [27.0410, 88.2663];
    const initialZoom = 12;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: true
    });

    // OpenStreetMap standard tile layer
    const tileLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }
    );
    tileLayer.addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    const routesGroup = L.layerGroup().addTo(map);

    markersLayerRef.current = markersGroup;
    routesLayerRef.current = routesGroup;
    mapInstanceRef.current = map;
    setIsMapReady(true);

    // Initial fit to destination & hotel
    if (mapData.center) {
      map.setView(mapData.center, 12);
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Style when user switches layers
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Remove existing tile layers
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    let tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    if (mapStyle === 'topo') {
      tileUrl = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="https://opentopomap.org">OpenTopoMap</a>';
    }

    L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution
    }).addTo(map);
  }, [mapStyle]);

  // Render Markers and Routes whenever TripState or day filter changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !routesLayerRef.current) return;

    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    const routesGroup = routesLayerRef.current;

    markersGroup.clearLayers();
    routesGroup.clearLayers();

    const boundsPoints: L.LatLngExpression[] = [];

    // 1. Draw Routes
    filteredRoutes.forEach((route) => {
      if (!route.coordinates || route.coordinates.length < 2) return;

      const latLngs: L.LatLngExpression[] = route.coordinates.map((c) => [c[0], c[1]]);
      latLngs.forEach((ll) => boundsPoints.push(ll));

      const polyline = L.polyline(latLngs, {
        color: route.color || '#7065F0',
        weight: route.mode === 'flight' ? 3 : 4,
        dashArray: route.isDashed ? '6, 8' : undefined,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round'
      });

      polyline.bindTooltip(
        `<b>${route.fromName}</b> → <b>${route.toName}</b>${route.duration ? ` (${route.duration})` : ''}`,
        { sticky: true, className: 'map-route-tooltip' }
      );

      polyline.addTo(routesGroup);
    });

    // 2. Draw Interactive Markers
    filteredPoints.forEach((point, idx) => {
      boundsPoints.push([point.lat, point.lng]);

      const isSelected = selectedPoint?.id === point.id;
      const iconHtml = createMarkerIconHtml(point, isSelected);

      const customIcon = L.divIcon({
        className: 'custom-map-div-icon',
        html: iconHtml,
        iconSize: [36, 42],
        iconAnchor: [18, 42],
        popupAnchor: [0, -42]
      });

      const marker = L.marker([point.lat, point.lng], { icon: customIcon });

      marker.on('click', () => {
        setSelectedPoint(point);
        map.panTo([point.lat, point.lng], { animate: true });
      });

      marker.addTo(markersGroup);
    });

    // Auto-fit bounds if we have points
    if (boundsPoints.length > 0) {
      if (activeDayFilter === null && boundsPoints.length > 3) {
        // If viewing all days including origin flight, focus on destination area by default for better clarity
        map.setView(mapData.center, 12, { animate: true });
      } else {
        const bounds = L.latLngBounds(boundsPoints);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: true });
      }
    }
  }, [filteredPoints, filteredRoutes, selectedPoint, activeDayFilter, mapData.center]);

  // Handler for Day Filter clicks with smooth center scrolling
  const handleDayFilterChange = (day: number | null) => {
    setActiveDayFilter(day);
    scrollToActiveChip(day);
    if (onSelectDay) {
      onSelectDay(day);
    }
  };

  // Map Controls
  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleFitFullRoute = () => {
    if (!mapInstanceRef.current || mapData.points.length === 0) return;
    const allCoords: L.LatLngExpression[] = mapData.points.map((p) => [p.lat, p.lng]);
    const bounds = L.latLngBounds(allCoords);
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], animate: true });
  };

  const handleRecenterDestination = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView(mapData.center, 13, { animate: true });
  };

  return (
    <div className={`relative w-full rounded-3xl overflow-hidden bg-stone-100 border border-stone-200/90 shadow-sm flex flex-col ${className}`}>
      
      {/* MAP HEADER / STATUS BAR */}
      <div className="p-3.5 sm:p-4 bg-white/95 backdrop-blur-md border-b border-stone-200/80 flex flex-wrap items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-purple-100 text-[#7065F0] shadow-2xs">
            <Compass className="w-4 h-4" />
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-extrabold text-stone-950 tracking-tight">
                Live Geographic Route & Places
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                Interactive
              </span>
            </div>
            <p className="text-xs text-stone-500 font-medium">
              {trip.origin || 'Mumbai'} → {trip.selected_transport?.transit_hub || 'Transit'} → {trip.destination?.name || 'Destination'}
            </p>
          </div>
        </div>

        {/* Day Filter Pills with Smooth Carousel Auto-Centering */}
        <div ref={dayTabsContainerRef} className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0 scroll-smooth no-scrollbar">
          <button
            ref={(el) => {
              if (el) dayTabRefs.current.set(null, el);
              else dayTabRefs.current.delete(null);
            }}
            onClick={() => handleDayFilterChange(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeDayFilter === null
                ? 'bg-stone-950 text-white shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            All Route ({mapData.points.length} stops)
          </button>
          {mapData.availableDays.map((dayNum) => (
            <button
              key={dayNum}
              ref={(el) => {
                if (el) dayTabRefs.current.set(dayNum, el);
                else dayTabRefs.current.delete(dayNum);
              }}
              onClick={() => handleDayFilterChange(dayNum)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                activeDayFilter === dayNum
                  ? 'bg-stone-950 text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getDayColor(dayNum) }}
              />
              <span>Day {dayNum}</span>
            </button>
          ))}
        </div>
      </div>

      {/* MAP VIEWPORT CANVAS */}
      <div className="relative w-full h-[420px] sm:h-[480px] bg-stone-100">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* FLOATING MAP CONTROLS (RIGHT TOP) */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 shadow-md rounded-2xl bg-white/95 backdrop-blur-md p-1.5 border border-stone-200/90">
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-xl hover:bg-stone-100 text-stone-700 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-xl hover:bg-stone-100 text-stone-700 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="w-full h-[1px] bg-stone-200 my-0.5" />
          <button
            onClick={handleRecenterDestination}
            className="p-2 rounded-xl hover:bg-stone-100 text-stone-700 transition-colors cursor-pointer"
            title="Recenter on Destination"
          >
            <Navigation className="w-4 h-4 text-[#7065F0]" />
          </button>
          <button
            onClick={handleFitFullRoute}
            className="p-2 rounded-xl hover:bg-stone-100 text-stone-700 transition-colors cursor-pointer"
            title="Fit Full Route (Origin to Destination)"
          >
            <Maximize2 className="w-4 h-4 text-emerald-600" />
          </button>
        </div>

        {/* FLOATING LAYER SWITCHER (LEFT TOP) */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-md p-1 rounded-2xl border border-stone-200/90 shadow-sm">
          <button
            onClick={() => setMapStyle('osm')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              mapStyle === 'osm' ? 'bg-[#7065F0] text-white shadow-2xs' : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            OpenStreetMap
          </button>
          <button
            onClick={() => setMapStyle('topo')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              mapStyle === 'topo' ? 'bg-[#7065F0] text-white shadow-2xs' : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            Topography
          </button>
        </div>

        {/* SELECTED POINT POPUP CARD (BOTTOM OVERLAY) */}
        {selectedPoint && (
          <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-30 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-stone-200/90 shadow-xl space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-stone-100 text-stone-800">
                    {getCategoryIcon(selectedPoint.category)}
                  </span>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500 block">
                      {selectedPoint.badge || selectedPoint.category}
                    </span>
                    <h4 className="text-sm font-extrabold text-stone-950 leading-tight">
                      {selectedPoint.name}
                    </h4>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedPoint(null)}
                  className="text-xs font-bold text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {selectedPoint.description && (
                <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                  {selectedPoint.description}
                </p>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs font-semibold text-stone-700">
                {selectedPoint.timeSlot && (
                  <span className="flex items-center gap-1 text-stone-600">
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    {selectedPoint.timeSlot}
                  </span>
                )}
                {selectedPoint.rating && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    {selectedPoint.rating}
                  </span>
                )}
                {selectedPoint.price !== undefined && selectedPoint.price > 0 && (
                  <span className="font-bold text-stone-950 font-display">
                    ₹{selectedPoint.price.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ITINERARY ROUTE BREADCRUMBS & LEGEND */}
      <div className="p-3 sm:p-4 bg-stone-50/90 border-t border-stone-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap text-stone-700 font-medium">
          <span className="font-bold text-stone-900 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[#7065F0]" />
            Route Sequence:
          </span>
          <span className="bg-white px-2 py-0.5 rounded-md border border-stone-200 text-stone-800 font-semibold">
            {trip.origin || 'Mumbai'}
          </span>
          <span className="text-stone-400">✈</span>
          <span className="bg-white px-2 py-0.5 rounded-md border border-stone-200 text-stone-800 font-semibold">
            {trip.selected_transport?.transit_hub || 'Bagdogra Airport'}
          </span>
          <span className="text-stone-400">🚗</span>
          <span className="bg-white px-2 py-0.5 rounded-md border border-stone-200 text-stone-800 font-semibold">
            {trip.destination?.name || 'Darjeeling'}
          </span>
          {trip.selected_accommodation && (
            <>
              <span className="text-stone-400">🏨</span>
              <span className="bg-purple-50 text-purple-900 border border-purple-200 px-2 py-0.5 rounded-md font-bold">
                {trip.selected_accommodation.name}
              </span>
            </>
          )}
        </div>

        {/* Legend Pins */}
        <div className="flex items-center gap-3 text-[11px] text-stone-600 font-semibold flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Flight
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Transfer
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#7065F0] inline-block" /> Stay & Activities
          </span>
        </div>
      </div>
    </div>
  );
};

// Helper: Custom HTML for pins
function createMarkerIconHtml(point: GeoLocationPoint, isSelected: boolean): string {
  let bgClass = 'bg-stone-900';
  let badgeIcon = '📍';
  let pulseBorder = 'border-stone-900';

  switch (point.category) {
    case 'origin':
      bgClass = 'bg-blue-600 text-white';
      badgeIcon = '🛫';
      pulseBorder = 'border-blue-500';
      break;
    case 'airport':
      bgClass = 'bg-sky-500 text-white';
      badgeIcon = '✈';
      pulseBorder = 'border-sky-400';
      break;
    case 'station':
      bgClass = 'bg-amber-600 text-white';
      badgeIcon = '🚆';
      pulseBorder = 'border-amber-500';
      break;
    case 'destination':
      bgClass = 'bg-rose-600 text-white';
      badgeIcon = '📍';
      pulseBorder = 'border-rose-500';
      break;
    case 'hotel':
      bgClass = 'bg-emerald-600 text-white';
      badgeIcon = '🏨';
      pulseBorder = 'border-emerald-500';
      break;
    case 'activity':
      bgClass = 'bg-[#7065F0] text-white';
      badgeIcon = point.dayNumber ? `D${point.dayNumber}` : '🎯';
      pulseBorder = 'border-[#7065F0]';
      break;
    case 'transfer':
      bgClass = 'bg-indigo-600 text-white';
      badgeIcon = '🚗';
      pulseBorder = 'border-indigo-500';
      break;
  }

  const selectedRing = isSelected
    ? 'ring-4 ring-purple-500/50 scale-110 -translate-y-1'
    : 'hover:scale-105';

  return `
    <div class="relative group cursor-pointer flex flex-col items-center transition-transform duration-200 ${selectedRing}">
      <div class="px-2 py-1 rounded-full text-[11px] font-black shadow-md border-2 border-white flex items-center justify-center min-w-[28px] h-[28px] ${bgClass}">
        ${badgeIcon}
      </div>
      <div class="w-2 h-2 bg-stone-900 rotate-45 -mt-1 shadow-xs border-r border-b border-white"></div>
    </div>
  `;
}

// Helper: category icons
function getCategoryIcon(category: string) {
  switch (category) {
    case 'origin':
    case 'airport':
      return <Plane className="w-3.5 h-3.5 text-blue-600" />;
    case 'station':
      return <Train className="w-3.5 h-3.5 text-amber-600" />;
    case 'destination':
      return <MapPin className="w-3.5 h-3.5 text-rose-600" />;
    case 'hotel':
      return <Bed className="w-3.5 h-3.5 text-emerald-600" />;
    case 'activity':
      return <Navigation className="w-3.5 h-3.5 text-[#7065F0]" />;
    case 'transfer':
      return <Car className="w-3.5 h-3.5 text-indigo-600" />;
    default:
      return <MapPin className="w-3.5 h-3.5 text-stone-600" />;
  }
}
