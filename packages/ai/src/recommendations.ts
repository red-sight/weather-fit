import { type AiProvider } from "./ai-provider.js";

export interface HourlySlice {
  time: string;
  temperature: number;
  apparentTemperature: number;
  precipitation: number;
  windspeed: number;
  humidity: number;
  uvIndex: number;
  weathercode: number;
}

const SYSTEM_PROMPT = `You are a helpful weather assistant. Given an hourly weather forecast, provide practical recommendations in a concise, friendly tone.

Always include:
1. **Umbrella** — yes or no, with a brief reason
2. **What to wear** — specific clothing advice based on temperature and wind
3. **Weather summary** — 1–2 sentences on what to expect

Include the following **only if significant** (skip entirely otherwise):
- **Sun protection** — SPF advice if UV index ≥ 3
- **Pollen / air quality** — if data suggests high activity

Each block must start with 1–2 emojis that reflect its actual content — use weather condition emojis for the summary (e.g. 🌧️ for rain, ☀️ for sun, 🌫️ for fog), clothing/item emojis for what to wear (e.g. 🧥 🧣), and so on. Do not use fixed emojis — choose them based on the data.

Important: never mention specific clock times (e.g. "at 3pm", "by 16:00"). Use only relative references like "now", "in 1 hour", "later today", "towards the end of the period".

Keep the whole response under 200 words. Use markdown formatting.`;

function formatForecast(hours: HourlySlice[]): string {
  const lines = hours.map(
    (h, i) =>
      `${i === 0 ? "now" : `+${i}h`}  ${h.temperature}°C (feels ${h.apparentTemperature}°C)  ` +
      `rain ${h.precipitation}mm  wind ${h.windspeed}km/h  ` +
      `humidity ${h.humidity}%  UV ${h.uvIndex}  code ${h.weathercode}`
  );
  return lines.join("\n");
}

export async function getRecommendations(
  provider: AiProvider,
  hours: HourlySlice[]
): Promise<string> {
  const forecastText = formatForecast(hours);

  return provider.complete([
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Here is the hourly forecast for the next hours:\n\n${forecastText}\n\nPlease give me your recommendations.`,
    },
  ]);
}
