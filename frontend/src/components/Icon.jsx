const trazos = {
  search: 'm21 21-4.5-4.5 M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0 M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  arrow: 'M4 12h16 M14 6l6 6-6 6',
  plus: 'M12 4v16 M4 12h16',
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12 M18 6 6 18',
  building:
    'M4 21V3h12v18 M2 21h20 M16 9h4v12 M8 7h4 M8 11h4 M8 15h4 M8 21v-3h4v3',
  leaf: 'M20 3c-9-1-17 3-16 10 1 7 14 9 16-10 M4 21 16 9',
  globe:
    'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M3 12h18 M12 3c-5 5-5 13 0 18 5-5 5-13 0-18',
  refresh:
    'M20 7v5h-5 M4 17v-5h5 M5 8a8 8 0 0 1 14-2l1 1 M19 16a8 8 0 0 1-14 2l-1-1',
  spark: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z',
  info: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 11v6 M12 7v1',
  sliders: 'M4 7h16 M4 17h16 M8 4v6 M16 14v6',
  external: 'M14 3h7v7 M21 3l-11 11 M10 3H3v18h18v-7',
  clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 7v5l3 2',
};
export default function Icon({ name, size = 20, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={trazos[name] || trazos.info} />
    </svg>
  );
}
