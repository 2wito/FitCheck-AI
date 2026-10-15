// Client-safe helpers for presenting weather and turning it into styling guidance.

import type { Weather } from "@/types";

export type WeatherFeel = "hot" | "warm" | "mild" | "cool" | "cold";

export function weatherFeel(feelsLikeC: number): WeatherFeel {
  if (feelsLikeC >= 27) return "hot";
  if (feelsLikeC >= 20) return "warm";
  if (feelsLikeC >= 13) return "mild";
  if (feelsLikeC >= 6) return "cool";
  return "cold";
}

const GUIDANCE: Record<WeatherFeel, string> = {
  hot: "Keep it light and breathable; skip outerwear and heavy layers.",
  warm: "Light layers; outerwear isn't needed.",
  mild: "A light layer such as a light jacket or overshirt works well.",
  cool: "Include a warm layer or outerwear.",
  cold: "Dress warmly: outerwear and closed shoes are a must.",
};

export function describeWeather(w: Weather) {
  return `${Math.round(w.temperatureC)}°C, ${w.condition.toLowerCase()}`;
}

// The weather line given to the AI stylist in place of a manually chosen season.
export function weatherForPrompt(w: Weather) {
  const feel = weatherFeel(w.feelsLikeC);
  const wet = w.isSnowing
    ? " It's snowing: choose warm, closed, water-resistant pieces."
    : w.isRaining || w.precipitationChance >= 60
      ? " Rain is likely: prefer closed shoes and avoid delicate fabrics like suede."
      : "";
  return (
    `${Math.round(w.temperatureC)}°C now (feels like ${Math.round(w.feelsLikeC)}°C), ` +
    `high ${Math.round(w.highC)}°C / low ${Math.round(w.lowC)}°C, ${w.condition.toLowerCase()}, ` +
    `${w.precipitationChance}% chance of rain. It feels ${feel}. ${GUIDANCE[feel]}${wet}`
  );
}
