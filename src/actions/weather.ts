"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { getCurrentUserId } from "@/lib/auth";
import { fetchWeather } from "@/lib/weather";
import type { ActionResult, Weather } from "@/types";

const coordsSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

// Local weather for "Today's look" and the AI stylist. Uses browser coordinates when given;
// otherwise Vercel's IP geolocation headers (no permission prompt). Returns null when the
// location is unknown (e.g. local dev), so the UI can offer "Use my location".
export async function getWeather(
  coords?: z.infer<typeof coordsSchema>,
): Promise<ActionResult<Weather | null>> {
  if (!(await getCurrentUserId())) return { success: false, error: "You must be signed in" };

  let location: { latitude: number; longitude: number; place: string | null } | null = null;
  if (coords) {
    const parsed = coordsSchema.safeParse(coords);
    if (!parsed.success) return { success: false, error: "Invalid location" };
    location = { ...parsed.data, place: null };
  } else {
    const h = await headers();
    const latitude = Number(h.get("x-vercel-ip-latitude"));
    const longitude = Number(h.get("x-vercel-ip-longitude"));
    const city = h.get("x-vercel-ip-city");
    if (h.get("x-vercel-ip-latitude") && Number.isFinite(latitude) && Number.isFinite(longitude)) {
      location = { latitude, longitude, place: city ? decodeURIComponent(city) : null };
    }
  }
  if (!location) return { success: true, data: null };

  try {
    return {
      success: true,
      data: await fetchWeather(location.latitude, location.longitude, location.place),
    };
  } catch (error) {
    console.error("Weather lookup failed", error);
    return { success: false, error: "Weather is unavailable right now." };
  }
}
