// Utility functions to generate timezone option lists
// These rely on the modern Intl API where available and fall back to a small preset list.

export const getTimezoneOptions = () => {
  try {
    if (typeof Intl.supportedValuesOf === 'function') {
      return Intl.supportedValuesOf('timeZone').map(tz => ({ value: tz, label: tz }));
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Intl.supportedValuesOf not available, falling back to limited timezone list', err);
  }
  return [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'America/New_York' },
    { value: 'Europe/London', label: 'Europe/London' },
  ];
};
