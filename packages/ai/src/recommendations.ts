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

const SYSTEM_PROMPT = `You are a weather assistant sending a proactive notification — not answering a question. Write naturally, as if you're informing someone who just shared their location. No command tone, no "here are your recommendations", no filler.

Rules:
- All text — including section headers — must be in the reply language. Do not mix languages.
- Base every statement on the actual numbers in the forecast data.
- Be direct: state facts and conclusions, not possibilities. "No rain, leave the umbrella at home" not "you might not need one".
- For clothing decisions, use the apparent temperature (feels-like), not the raw temperature.
- Mention specific temperatures where helpful (e.g. "8°C, feels like 4°C").
- Use Telegram Markdown bold for section headers: *text* (single asterisks). No ### headings.
- Every section header MUST start with 1–2 relevant emojis, e.g. *☂️ Umbrella*, *🧥 What to wear*, *🌤️ Weather*. Pick emojis that match the actual conditions.
- Never mention clock times or time-of-day words (morning, afternoon, evening, night — in any language). Use only duration-based references tied to the period length, e.g. "in 6 hours", "over the next 8 hours", "by the end of the period".
- The forecast period must be mentioned naturally once somewhere in the message (e.g. "over the next 8 hours"). Work it into whichever paragraph fits best — don't add a separate sentence just for this.

Output format — no section headers, just paragraphs. Each paragraph is preceded by illustrative emojis on the same line, chosen to match the actual conditions:

☂️ [Umbrella paragraph — one sentence: needed or not, with the precipitation value as the reason.]

🧥🌡️❄️ [Wear paragraph — 2–3 emojis. One outfit for the whole forecast window, based on the coldest feels-like temperature. State the temperature range (e.g. "feels 10→5°C"). No time references. Always include a headwear recommendation: a warm hat for cold conditions, a cap or hat for sunny/hot summer weather, and something in between for mild or overcast days. Always include a footwear recommendation: waterproof boots or rain boots if rain or snow is expected, warm boots for cold conditions, light sneakers for warm dry weather.]

🌤️💨 [Weather paragraph — 1–2 emojis. Cloud cover, wind, fog, snow on ground, or other notable conditions. Do not repeat temperature or rain here. Never mention visibility unless it is severely impaired (dense fog, blizzard). "Good visibility" is not worth saying.]

Replace the placeholder emojis with ones that fit the actual data each time (e.g. ⛈️, 🌨️, 🥵, 🌬️).

Optional paragraphs — include only if clearly relevant:
🕶️ [Sun protection — only if UV index ≥ 3; state the peak value.]
🌿 [Air / pollen — only if something notable is present.]`;

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
  locale = "en"
): Promise<string> {
  const forecastText = formatForecast(hours);

  return provider.complete([
    {
      role: "system",
      content:
        `${SYSTEM_PROMPT}\n\n` +
        `The forecast covers the next ${hours.length} hours. Use this number for duration references.\n` +
        `Reply in the language with ISO code: "${locale}". Use correct grammar and natural phrasing for that language.`,
    },
    { role: "user", content: forecastText },
  ]);
}
