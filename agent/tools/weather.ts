import { defineTool } from "eve/tools";
import { z } from "zod";
import { generateDemoWeather } from "../../shared/tools/weather";

export default defineTool({
  description: "Get weather info with 5-day forecast",
  inputSchema: z.object({
    location: z.string().describe("Location for weather"),
  }),
  outputSchema: z.object({
    location: z.string(),
    temperature: z.number(),
    temperatureHigh: z.number(),
    temperatureLow: z.number(),
    condition: z.object({
      text: z.string(),
      icon: z.string(),
    }),
    humidity: z.number(),
    windSpeed: z.number(),
    dailyForecast: z.array(
      z.object({
        day: z.string(),
        high: z.number(),
        low: z.number(),
        condition: z.object({
          text: z.string(),
          icon: z.string(),
        }),
      }),
    ),
  }),
  async execute({ location }) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return generateDemoWeather(location);
  },
});
