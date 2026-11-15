/** Round-trip miles off each fictional corridor, in tenths. Station positions
 * correspond to the catalog mileposts. These are demo survey inputs. */
export const routes = [
  {
    id: "commute",
    name: "Downtown commute",
    from: "Maple Heights",
    to: "Downtown office",
    miles: 18,
    detours: { "2": 8, "5": 24, "9": 10 },
  },
  {
    id: "school",
    name: "School run",
    from: "Maple Heights",
    to: "Cedar Elementary",
    miles: 7,
    detours: { "2": 35, "5": 7, "9": 13 },
  },
  {
    id: "weekend",
    name: "Weekend errands",
    from: "Maple Heights",
    to: "Lake Market",
    miles: 12,
    detours: { "2": 40, "5": 25, "9": 3 },
  },
] as const;
