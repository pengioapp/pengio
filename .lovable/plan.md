

## Plan: Route Loan Overview tab to Loan Summary screen

### Change

In `src/components/BottomNav.tsx`, update the "Loan Overview" nav item path from `/overview` to `/loan-summary`.

**File: `src/components/BottomNav.tsx` (line 9)**
```
{ label: "Loan Overview", icon: navCoins, path: "/loan-summary" }
```

This ensures tapping the coin icon navigates to the "My loan summary" screen, keeps the bottom nav visible (already rendered there), and highlights the tab as active via the existing `location.pathname` match logic.

No other files need changes.

