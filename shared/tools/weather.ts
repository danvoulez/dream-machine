export interface WeatherCondition {
  text: string;
  icon: string;
}

export interface WeatherForecastDay {
  day: string;
  high: number;
  low: number;
  condition: WeatherCondition;
}

export interface WeatherOutput {
  location: string;
  temperature: number;
  temperatureHigh: number;
  temperatureLow: number;
  condition: WeatherCondition;
  humidity: number;
  windSpeed: number;
  dailyForecast: WeatherForecastDay[];
}

const CONDITION_KEYS = [
  "sunny",
  "partly-cloudy",
  "cloudy",
  "rainy",
  "foggy",
] as const;

const CONDITION_META: Record<
  (typeof CONDITION_KEYS)[number],
  WeatherCondition
> = {
  sunny: { text: "Sunny", icon: "i-lucide-sun" },
  "partly-cloudy": { text: "Partly Cloudy", icon: "i-lucide-cloud-sun" },
  cloudy: { text: "Cloudy", icon: "i-lucide-cloud" },
  rainy: { text: "Rainy", icon: "i-lucide-cloud-rain" },
  foggy: { text: "Foggy", icon: "i-lucide-cloud-fog" },
};

function pickCondition(seed = 0): WeatherCondition {
  const key =
    CONDITION_KEYS[
      (Math.floor(Math.random() * CONDITION_KEYS.length) + seed)
      % CONDITION_KEYS.length
    ]!;
  return CONDITION_META[key];
}

export function generateDemoWeather(location: string): WeatherOutput {
  const temp = Math.floor(Math.random() * 35) + 5;
  const temperature = Math.round(temp);

  return {
    location,
    temperature,
    temperatureHigh: Math.round(temp + Math.random() * 5 + 2),
    temperatureLow: Math.round(temp - Math.random() * 5 - 2),
    condition: pickCondition(),
    humidity: Math.floor(Math.random() * 60) + 20,
    windSpeed: Math.floor(Math.random() * 25) + 5,
    dailyForecast: ["Today", "Tomorrow", "Thu", "Fri", "Sat"].map(
      (day, index) => ({
        day,
        high: Math.round(temp + Math.random() * 8 - 2),
        low: Math.round(temp - Math.random() * 8 - 3),
        condition: pickCondition(index),
      }),
    ),
  };
}

export function isWeatherOutput(value: unknown): value is WeatherOutput {
  if (!value || typeof value !== "object") return false;
  const output = value as Partial<WeatherOutput>;
  return (
    typeof output.location === "string"
    && typeof output.temperature === "number"
    && typeof output.condition === "object"
    && output.condition !== null
    && typeof output.condition.text === "string"
  );
}
