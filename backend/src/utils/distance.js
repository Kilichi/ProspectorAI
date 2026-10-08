export function distanciaKm(lat1, lon1, lat2, lon2) {
  const radianes = (grados) => (grados * Math.PI) / 180;
  const a =
    Math.sin(radianes(lat2 - lat1) / 2) ** 2 +
    Math.cos(radianes(lat1)) *
      Math.cos(radianes(lat2)) *
      Math.sin(radianes(lon2 - lon1) / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
}
