import { ForecastProvider } from "./forecast-provider.js";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

const HOURLY_FIELDS = [
  "temperature_2m",
  "apparent_temperature",
  "precipitation",
  "weathercode",
  "windspeed_10m",
  "relativehumidity_2m",
  "uv_index",
].join(",");

export class OpenMeteo extends ForecastProvider {
  code = "open-meteo";

  async request({
    lattitude,
    langitude,
    period,
  }: {
    lattitude: number;
    langitude: number;
    period: number;
  }): Promise<object> {
    const forecastDays = Math.ceil(period / 86400) + 1;

    const url = new URL(BASE_URL);
    url.searchParams.set("latitude", String(lattitude));
    url.searchParams.set("longitude", String(langitude));
    url.searchParams.set("hourly", HOURLY_FIELDS);
    url.searchParams.set("timezone", "auto");
    url.searchParams.set("forecast_days", String(forecastDays));

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Open-Meteo request failed: ${response.status}`);
    }

    return response.json() as Promise<object>;
  }
}
