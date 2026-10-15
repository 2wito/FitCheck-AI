import "server-only";

import { z } from "zod";

import type { Weather } from "@/types";

// Current conditions from Open-Meteo (free, no API key): https://open-meteo.com/en/docs

const responseSchema = z.object({
  current: z.object({
    temperature_2m: z.number(),
    apparent_temperature: z.number(),
    precipitation: z.number(),
    weather_code: z.number(),
    is_day: z.number(),
  }),
  daily: z.object({
    temperature_2m_max: z.array(z.number()).min(1),
    temperature_2m_min: z.array(z.number()).min(1),
    precipitation_probability_max: z.array(z.number().nullable()).min(1),
  }),
});

// WMO weather interpretation codes, as documented by Open-Meteo.
function describeCode(code: number) {
  if (code === 0) return "Clear sky";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code === 85 || code === 86) return "Snow showers";
  if (code >= 95) return "Thunderstorm";
  return "Unsettled";
}

const isRainCode = (code: number) =>
  (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
const isSnowCode = (code: number) => (code >= 71 && code <= 77) || code === 85 || code === 86;

export async function fetchWeather(
  latitude: number,
  longitude: number,
  place: string | null,
): Promise<Weather> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    // Two decimals (~1 km) is plenty for weather and avoids sending a precise location.
    latitude: latitude.toFixed(2),
    longitude: longitude.toFixed(2),
    current: "temperature_2m,apparent_temperature,precipitation,weather_code,is_day",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "auto",
    forecast_days: "1",
  }).toString();

  const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error(`Open-Meteo request failed (${response.status})`);
  const { current, daily } = responseSchema.parse(await response.json());

  return {
    temperatureC: current.temperature_2m,
    feelsLikeC: current.apparent_temperature,
    highC: daily.temperature_2m_max[0],
    lowC: daily.temperature_2m_min[0],
    precipitationChance: daily.precipitation_probability_max[0] ?? 0,
    code: current.weather_code,
    condition: describeCode(current.weather_code),
    isRaining: isRainCode(current.weather_code) || current.precipitation > 0.1,
    isSnowing: isSnowCode(current.weather_code),
    isDay: current.is_day === 1,
    place,
  };
}
