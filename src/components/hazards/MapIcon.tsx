// Small map controls share one icon style.
const paths = {
  upload:"M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6",
  streetView:"M14 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM12 8v7m-5-5 5 2 5-2m-5 5-4 6m4-6 4 6",
  layers:"m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5",
  close:"m6 6 12 12M6 18 18 6",
  refresh:"M20 7v5h-5M4 17v-5h5M6.1 7a7 7 0 0 1 11.5-1L20 9M4 15l2.4 3A7 7 0 0 0 18 17",
  extent:"M12 3v4m0 10v4M3 12h4m10 0h4M18 12a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z",
  expand:"M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5",
  search:"M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0Zm-1 5 6 6",
  back:"m14 6-6 6 6 6",
  pin:"M19 9c0 5-7 12-7 12S5 14 5 9a7 7 0 1 1 14 0ZM14 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z",
};
export function MapIcon({name}:{name:keyof typeof paths}) {return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;}
