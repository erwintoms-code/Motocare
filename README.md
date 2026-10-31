# MotoCare PWA v2.1

Filipino motorcycle maintenance and fuel logbook. Starter profile: Honda Click 125i V3 (2024).

## Requirements
- Node.js 20+ recommended
- npm

## Run locally
```bash
cd MotoCare-v2.1
npm install
npm run dev
```
Open the local URL printed by Vite (usually http://localhost:5173).

## Production build
```bash
npm run build
npm run preview
```

## Fuel calculation: full-tank to full-tank
- First Full Tank is the baseline; its liters are excluded from the first measured interval.
- For each later Full Tank, distance = current full-tank odometer minus previous full-tank odometer.
- Fuel used = sum of liters in all records after the previous Full Tank through and including the current Full Tank.
- km/L = distance / fuel used.
- Partial refills are accumulated. A new Full Tank closes the interval.
- Before the next Full Tank, the dashboard shows provisional distance, liters, and cost, not a final km/L.
- To improve consistency, refill to the same level (e.g. first automatic nozzle cutoff) and avoid topping off.

## Data
Records are stored locally in this browser using localStorage. Use Export regularly to save a JSON backup. Restore replaces the current browser data.

## Maintenance intervals
The displayed checklist intervals are starter reminders only and are not claimed to be Honda's official service schedule. Confirm all intervals, belt replacement criteria, and fluid specifications using the correct Philippine-market owner's manual or an authorized Honda service center.
