// Date-picker values ("2026-10-13") mean a day in the viewer's own timezone.
// Send the real start/end of that local day as ISO timestamps so a filter for
// "today" isn't off by the UTC offset on the server.
export const dayStartISO = (d: string) => new Date(`${d}T00:00:00`).toISOString();
export const dayEndISO = (d: string) => new Date(`${d}T23:59:59.999`).toISOString();
