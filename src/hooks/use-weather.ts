"use client";

import { useCallback, useEffect, useState } from "react";

import { getWeather } from "@/actions/weather";
import type { Weather } from "@/types";

export type WeatherState =
  | { status: "loading" }
  | { status: "ready"; weather: Weather }
  // IP geolocation isn't available (e.g. local dev): the user can share their location.
  | { status: "needs-location" }
  | { status: "error"; message: string };

const CACHE_MS = 10 * 60 * 1000;
// Shared across components on the page (Today's look + the AI stylist dialog).
let cache: { weather: Weather; at: number } | null = null;

function toState(result: Awaited<ReturnType<typeof getWeather>> | null): WeatherState {
  if (!result?.success) {
    return { status: "error", message: result?.error ?? "Weather is unavailable right now." };
  }
  if (!result.data) return { status: "needs-location" };
  cache = { weather: result.data, at: Date.now() };
  return { status: "ready", weather: result.data };
}

// Loads local weather once `enabled` is true; reuses a recent result instead of refetching.
export function useWeather(enabled = true) {
  const [state, setState] = useState<WeatherState>(() =>
    cache && Date.now() - cache.at < CACHE_MS
      ? { status: "ready", weather: cache.weather }
      : { status: "loading" },
  );

  const load = useCallback(async (coords?: { latitude: number; longitude: number }) => {
    setState(toState(await getWeather(coords).catch(() => null)));
  }, []);

  // Fetch on first use; state is only set in the promise callback (an external subscription),
  // and a late response after unmount or re-disable is ignored.
  const needsFetch = enabled && state.status === "loading";
  useEffect(() => {
    if (!needsFetch) return;
    let active = true;
    getWeather()
      .catch(() => null)
      .then((result) => {
        if (active) setState(toState(result));
      });
    return () => {
      active = false;
    };
  }, [needsFetch]);

  // Asks the browser for the user's location (permission prompt), then fetches weather.
  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState({ status: "error", message: "Location isn't available in this browser." });
      return;
    }
    setState({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => void load({ latitude: coords.latitude, longitude: coords.longitude }),
      () => setState({ status: "error", message: "Location access was denied." }),
      { maximumAge: CACHE_MS, timeout: 10_000 },
    );
  }, [load]);

  return { state, requestLocation };
}
