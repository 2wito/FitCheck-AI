"use client";

import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Loader2,
  MapPin,
  Moon,
  Snowflake,
  Sun,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { WeatherState } from "@/hooks/use-weather";
import { cn } from "@/lib/utils";
import type { Weather } from "@/types";

function WeatherIcon({ weather, className }: { weather: Weather; className?: string }) {
  const { code, isDay } = weather;
  const Icon =
    code >= 95
      ? CloudLightning
      : weather.isSnowing
        ? Snowflake
        : weather.isRaining
          ? CloudRain
          : code === 45 || code === 48
            ? CloudFog
            : code === 3
              ? Cloud
              : code === 2
                ? CloudSun
                : isDay
                  ? Sun
                  : Moon;
  return <Icon className={className} aria-hidden />;
}

// Compact weather line, plus loading / "use my location" / error states.
export function WeatherSummary({
  state,
  onRequestLocation,
  className,
}: {
  state: WeatherState;
  onRequestLocation: () => void;
  className?: string;
}) {
  if (state.status === "loading") {
    return (
      <p className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <Loader2 className="size-4 animate-spin" />
        Checking the weather…
      </p>
    );
  }

  if (state.status !== "ready") {
    return (
      <div
        className={cn("flex flex-wrap items-center gap-2 text-sm text-muted-foreground", className)}
      >
        <span>
          {state.status === "error"
            ? state.message
            : "Share your location to dress for the weather."}
        </span>
        <Button variant="outline" size="sm" onClick={onRequestLocation}>
          <MapPin data-icon="inline-start" />
          Use my location
        </Button>
      </div>
    );
  }

  const { weather } = state;
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <WeatherIcon weather={weather} className="size-8 shrink-0 text-amber-500" />
      <div>
        <p className="font-medium">
          {Math.round(weather.temperatureC)}°C · {weather.condition}
          {weather.place && (
            <span className="font-normal text-muted-foreground"> in {weather.place}</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          Feels like {Math.round(weather.feelsLikeC)}° · H {Math.round(weather.highC)}° / L{" "}
          {Math.round(weather.lowC)}° · {weather.precipitationChance}% rain
        </p>
      </div>
    </div>
  );
}
