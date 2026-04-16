import { type AiProvider } from "./ai-provider.js";

export interface HourlySlice {
  time: string;
  temperature: number;
  apparentTemperature: number;
  precipitation: number;
  precipitationProbability: number;
  weathercode: number;
  windspeed: number;
  windgusts: number;
  humidity: number;
  cloudcover: number;
  visibility: number;
  snowDepth: number;
  uvIndex: number;
}

const WMO_CODES: Record<number, string> = {
  0: "clear sky",
  1: "mainly clear",
  2: "partly cloudy",
  3: "overcast",
  45: "fog",
  48: "rime fog",
  51: "light drizzle",
  53: "moderate drizzle",
  55: "dense drizzle",
  56: "light freezing drizzle",
  57: "heavy freezing drizzle",
  61: "slight rain",
  63: "moderate rain",
  65: "heavy rain",
  66: "light freezing rain",
  67: "heavy freezing rain",
  71: "slight snow",
  73: "moderate snow",
  75: "heavy snow",
  77: "snow grains",
  80: "slight rain showers",
  81: "moderate rain showers",
  82: "violent rain showers",
  85: "slight snow showers",
  86: "heavy snow showers",
  95: "thunderstorm",
  96: "thunderstorm with slight hail",
  99: "thunderstorm with heavy hail",
};

function decodeWeathercode(code: number): string {
  return WMO_CODES[code] ?? `unknown (${code})`;
}

function formatVisibility(meters: number): string {
  if (meters < 1000) return `${meters}m (fog)`;
  if (meters < 5000) return `${(meters / 1000).toFixed(1)}km (mist)`;
  return `${(meters / 1000).toFixed(0)}km`;
}

const SYSTEM_PROMPT = `You are a weather assistant sending a proactive notification — not answering a question. Write naturally, as if you're informing someone who just shared their location. No command tone, no "here are your recommendations", no filler. This is a statement about what lies ahead, not a response to a query.

Rules:
- All text — including section headers — must be in the reply language. Do not mix languages.
- Base every statement on the actual numbers in the forecast data.
- Be direct: state facts and conclusions, not possibilities. "No rain, leave the umbrella at home" not "you might not need one".
- For clothing decisions, use the apparent temperature (feels-like), not the raw temperature.
- Mention specific temperatures where helpful (e.g. "8°C, feels like 4°C").
- Use Telegram Markdown bold for section headers: *text* (single asterisks). No ### headings.
- Every section header MUST start with 1–2 relevant emojis, e.g. *☂️ Umbrella*, *🧥 What to wear*, *🌤️ Weather*. Pick emojis that match the actual conditions.
- Never mention the duration of the forecast period or use time-of-day words (morning, afternoon, evening, night — in any language). The header already states the period — do not repeat it. If duration context is needed, use relative phrasing like "later" or "by the end".

Output format — no section headers, just paragraphs. Each paragraph is preceded by illustrative emojis on the same line, chosen to match the actual conditions:

☂️ [Umbrella paragraph — one sentence: needed or not, with the precipitation value as the reason.]

🧥🌡️❄️ [Wear paragraph — 2–3 emojis. One outfit for the whole forecast window, based on the coldest feels-like temperature. State the temperature range (e.g. "feels 10→5°C"). No time references. Always include a headwear recommendation: a warm hat for cold conditions, a cap or hat for sunny/hot summer weather, and something in between for mild or overcast days. Always include a footwear recommendation: waterproof boots or rain boots if rain or snow is expected, warm boots for cold conditions, light sneakers for warm dry weather.]

🌤️💨 [Weather paragraph — 1–2 emojis. Cloud cover, wind, fog, snow on ground, or other notable conditions. Do not repeat temperature or rain here. Never mention visibility unless it is severely impaired (dense fog, blizzard). "Good visibility" is not worth saying.]

Replace the placeholder emojis with ones that fit the actual data each time (e.g. ⛈️, 🌨️, 🥵, 🌬️).

Optional paragraphs — include only if clearly relevant:
🕶️ [Sun protection — ONLY include this paragraph if ALL three conditions are met: (1) it is currently daytime at the user's location, (2) peak UV index ≥ 3, AND (3) average cloud cover over the period is below 60%. If it is night, or the sky is mostly cloudy/overcast (cloud cover ≥ 60%), or UV < 3 — omit this paragraph entirely. High UV values in the forecast data are irrelevant when clouds block the sun.]
🌿 [Air / pollen — only if something notable is present.]`;

function getDayOfYear(date: Date): number {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

function computeSolarContext(
  lat: number,
  lon: number,
  utcNow: Date
): { isDaytime: boolean; season: string } {
  const month = utcNow.getUTCMonth(); // 0–11
  const utcHour = utcNow.getUTCHours() + utcNow.getUTCMinutes() / 60;

  // Approximate solar noon in UTC hours
  const solarNoonUTC = 12 - lon / 15;

  // Solar declination
  const dayOfYear = getDayOfYear(utcNow);
  const declination =
    (23.45 * Math.PI) / 180 * Math.sin(((2 * Math.PI) / 365) * (dayOfYear - 81));
  const latRad = (lat * Math.PI) / 180;

  // Half-day length in hours
  const cosHourAngle = -Math.tan(latRad) * Math.tan(declination);
  let halfDay: number;
  if (cosHourAngle > 1) halfDay = 0; // polar night
  else if (cosHourAngle < -1) halfDay = 12; // midnight sun
  else halfDay = (Math.acos(cosHourAngle) * 180) / Math.PI / 15;

  const sunriseUTC = solarNoonUTC - halfDay;
  const sunsetUTC = solarNoonUTC + halfDay;
  const isDaytime = utcHour >= sunriseUTC && utcHour <= sunsetUTC;

  // Season: use hemisphere-aware mapping
  const northSeasons = ["winter", "winter", "spring", "spring", "spring", "summer", "summer", "summer", "autumn", "autumn", "autumn", "winter"] as const;
  const southSeasons = ["summer", "summer", "autumn", "autumn", "autumn", "winter", "winter", "winter", "spring", "spring", "spring", "summer"] as const;
  const seasons = lat >= 0 ? northSeasons : southSeasons;
  const season = seasons[month] ?? "unknown";

  return { isDaytime, season };
}

function formatForecast(hours: HourlySlice[]): string {
  const lines = hours.map((h, i) => {
    const snowCm = Math.round(h.snowDepth * 100);
    return (
      `${i === 0 ? "now" : `+${i}h`}  ${h.temperature}°C (feels ${h.apparentTemperature}°C)  ` +
      `${decodeWeathercode(h.weathercode)}  ` +
      `rain ${h.precipitation}mm (${h.precipitationProbability}%)  ` +
      `snow ${snowCm}cm  ` +
      `wind ${h.windspeed}km/h gusts ${h.windgusts}km/h  ` +
      `cloud ${h.cloudcover}%  visibility ${formatVisibility(h.visibility)}  ` +
      `humidity ${h.humidity}%  UV ${h.uvIndex}`
    );
  });
  return lines.join("\n");
}

export async function getRecommendations(
  provider: AiProvider,
  hours: HourlySlice[],
  locale = "en",
  lat?: number,
  lon?: number
): Promise<string> {
  const forecastText = formatForecast(hours);

  let solarContext = "";
  if (lat !== undefined && lon !== undefined) {
    const { isDaytime, season } = computeSolarContext(lat, lon, new Date());
    solarContext = `\nCurrent solar context: ${isDaytime ? "daytime" : "night"}, ${season}.`;
  }

  return provider.complete([
    {
      role: "system",
      content:
        `${SYSTEM_PROMPT}\n\n` +
        `Reply in the language with ISO code: "${locale}". Use correct grammar and natural phrasing for that language.${solarContext}`,
    },
    { role: "user", content: forecastText },
  ]);
}
