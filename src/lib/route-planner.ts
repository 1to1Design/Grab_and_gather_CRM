// Wraps Google's Directions API to turn a list of stops into an actual
// optimized driving order — this is deliberately NOT something we ask
// Claude to compute itself. LLMs are unreliable at precise geospatial
// optimization; a real routing API is the right tool for "shortest order,"
// while Claude's job stays "which leads to include and how to explain it."
//
// Uses the classic Directions API (stable, well-documented, address strings
// accepted directly — no separate geocoding call needed) rather than the
// newer Routes API.

export type RouteStop = {
  name: string;
  address: string;
};

export type PlannedRoute = {
  orderedStops: { name: string; address: string; legDistance: string; legDuration: string }[];
  totalDistance: string;
  totalDuration: string;
  mapsUrl: string;
};

const MAX_STOPS = 23; // Directions API waypoint limit is 25; leave headroom.

export async function planRoute(
  origin: string,
  destination: string,
  stops: RouteStop[]
): Promise<{ error: string } | { route: PlannedRoute; truncated: boolean }> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return { error: "Route planning isn't configured yet — no Google Maps API key is set." };
  }
  if (stops.length === 0) {
    return { error: "No stops with addresses were given to route." };
  }

  const truncated = stops.length > MAX_STOPS;
  const usedStops = truncated ? stops.slice(0, MAX_STOPS) : stops;

  const waypoints = "optimize:true|" + usedStops.map((s) => encodeURIComponent(s.address)).join("|");
  const url =
    `https://maps.googleapis.com/maps/api/directions/json?` +
    `origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}` +
    `&waypoints=${waypoints}&key=${apiKey}`;

  let data: {
    status: string;
    error_message?: string;
    routes?: {
      waypoint_order: number[];
      legs: {
        distance?: { text: string; value: number };
        duration?: { text: string; value: number };
      }[];
    }[];
  };

  try {
    const res = await fetch(url);
    data = await res.json();
  } catch {
    return { error: "Couldn't reach the routing service." };
  }

  if (data.status !== "OK" || !data.routes?.length) {
    return { error: `Routing failed: ${data.error_message ?? data.status}` };
  }

  const route = data.routes[0];
  const orderedStops = route.waypoint_order.map((originalIndex, i) => {
    const stop = usedStops[originalIndex];
    const leg = route.legs[i];
    return {
      name: stop.name,
      address: stop.address,
      legDistance: leg?.distance?.text ?? "",
      legDuration: leg?.duration?.text ?? "",
    };
  });

  const totalMeters = route.legs.reduce((sum, leg) => sum + (leg.distance?.value ?? 0), 0);
  const totalSeconds = route.legs.reduce((sum, leg) => sum + (leg.duration?.value ?? 0), 0);
  const totalDistanceText = `${(totalMeters / 1609.34).toFixed(1)} mi`;
  const totalHours = Math.floor(totalSeconds / 3600);
  const totalMinutes = Math.round((totalSeconds % 3600) / 60);
  const totalDurationText = totalHours > 0 ? `${totalHours} hr ${totalMinutes} min` : `${totalMinutes} min`;

  const orderedAddresses = orderedStops.map((s) => s.address);
  const mapsUrl =
    `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}` +
    `&destination=${encodeURIComponent(destination)}` +
    `&waypoints=${orderedAddresses.map(encodeURIComponent).join("|")}` +
    `&travelmode=driving`;

  return {
    truncated,
    route: {
      orderedStops,
      totalDistance: totalDistanceText,
      totalDuration: totalDurationText,
      mapsUrl,
    },
  };
}
