export type DashboardChartColors = [string, string, string, string];

function mixColor(hex: string, target: string, amount: number) {
  const sourceChannels = [0, 2, 4].map((offset) => parseInt(hex.slice(offset + 1, offset + 3), 16));
  const targetChannels = [0, 2, 4].map((offset) => parseInt(target.slice(offset + 1, offset + 3), 16));
  return `#${sourceChannels
    .map((channel, index) => Math.round(channel + (targetChannels[index] - channel) * amount)
      .toString(16).padStart(2, '0'))
    .join('')}`;
}

/** A consistent range of visible tints and shades based on the tenant's selected color. */
export function getDashboardChartColors(primaryColor: string): DashboardChartColors {
  return [
    primaryColor,
    mixColor(primaryColor, '#000000', 0.24),
    mixColor(primaryColor, '#FFFFFF', 0.34),
    mixColor(primaryColor, '#000000', 0.46),
  ];
}
