// The BBNL district/block/village table identifies a locality reference point.
// It contains no khasra geometry or parcel centroid.
const villageLocation = Object.freeze({
  latitude: 24.573150,
  longitude: 73.653100,
  source: 'https://bbnl.nic.in/admnis/admin/showimg.aspx?ID=982',
  precision: 'village-reference',
  officialMap: 'https://rajdharaa.rajasthan.gov.in/citizenudh/index',
});

function villageMapUrls() {
  const {latitude, longitude} = villageLocation;
  const bbox = [longitude - 0.04, latitude - 0.025, longitude + 0.04, latitude + 0.025];
  const embed = new URL('https://www.openstreetmap.org/export/embed.html');
  embed.searchParams.set('bbox', bbox.map(n => n.toFixed(6)).join(','));
  embed.searchParams.set('layer', 'mapnik');
  embed.searchParams.set('marker', `${latitude},${longitude}`);
  return {embed: embed.href, map: `https://www.openstreetmap.org/#map=14/${latitude}/${longitude}`};
}

module.exports = {villageLocation, villageMapUrls};
