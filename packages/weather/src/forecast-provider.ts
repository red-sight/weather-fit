export abstract class ForecastProvider {
  abstract code: string;

  abstract request({
    lattitude,
    langitude,
    period,
  }: {
    lattitude: number;
    langitude: number;
    period: number;
  }): Promise<object>;
}
