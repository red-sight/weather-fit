import { type AiProvider, getRecommendations } from "@repo/ai";
import { type BotContext, Composer } from "@repo/telegram";
import { OpenMeteo } from "@repo/weather";

const weather = new OpenMeteo();

const PERIOD_HOURS = 8;
const PERIOD_SECONDS = PERIOD_HOURS * 3600;

interface HourlyForecast {
  time: string[];
  temperature_2m: number[];
  apparent_temperature: number[];
  precipitation: number[];
  precipitation_probability: number[];
  weathercode: number[];
  windspeed_10m: number[];
  windgusts_10m: number[];
  relativehumidity_2m: number[];
  cloudcover: number[];
  visibility: number[];
  snow_depth: number[];
  uv_index: number[];
}

interface ForecastResponse {
  hourly: HourlyForecast;
  timezone: string;
}

export function createLocationHandler(ai: AiProvider) {
  const composer = new Composer<BotContext>();

  composer.on("message:location", async (ctx) => {
    const { latitude, longitude } = ctx.message.location;

    const forecast = (await weather.request({
      lattitude: latitude,
      langitude: longitude,
      period: PERIOD_SECONDS,
    })) as ForecastResponse;

    const { hourly } = forecast;

    const now = new Date();
    const nowHour = now.toISOString().slice(0, 13);
    const startIndex = hourly.time.findIndex((t) => t.startsWith(nowHour));
    const from = startIndex === -1 ? 0 : startIndex;
    const to = from + PERIOD_HOURS;

    const hours = hourly.time.slice(from, to).map((time, i) => {
      const idx = from + i;
      return {
        time: time.slice(11, 16),
        temperature: hourly.temperature_2m[idx] ?? 0,
        apparentTemperature: hourly.apparent_temperature[idx] ?? 0,
        precipitation: hourly.precipitation[idx] ?? 0,
        precipitationProbability: hourly.precipitation_probability[idx] ?? 0,
        weathercode: hourly.weathercode[idx] ?? 0,
        windspeed: hourly.windspeed_10m[idx] ?? 0,
        windgusts: hourly.windgusts_10m[idx] ?? 0,
        humidity: hourly.relativehumidity_2m[idx] ?? 0,
        cloudcover: hourly.cloudcover[idx] ?? 0,
        visibility: hourly.visibility[idx] ?? 0,
        snowDepth: hourly.snow_depth[idx] ?? 0,
        uvIndex: hourly.uv_index[idx] ?? 0,
      };
    });

    const locale = ctx.from?.language_code ?? "en";
    const reply = await getRecommendations(ai, hours, locale, latitude, longitude);
    const header = ctx.t("forecast-header", { hours: PERIOD_HOURS });

    await ctx.reply(`*${header}*\n\n${reply}`, { parse_mode: "Markdown" });
  });

  return composer;
}
