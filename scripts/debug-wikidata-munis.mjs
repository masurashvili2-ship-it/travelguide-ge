// Find the correct Wikidata QIDs for Georgian municipalities
// by checking what muni QIDs the villages are actually pointing to

const sparql = `
SELECT DISTINCT ?muni ?muniLabel WHERE {
  ?item wdt:P17 wd:Q230 .
  ?item wdt:P31 wd:Q532 .
  ?item wdt:P131 ?muni .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". ?muni rdfs:label ?muniLabel. }
}
ORDER BY ?muniLabel`;

const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
const res = await fetch(url, {
  headers: { 'User-Agent': 'TravelGuideDebugBot/1.0', 'Accept': 'application/sparql-results+json' }
});
const data = await res.json();
const rows = data.results?.bindings ?? [];
console.log(`Found ${rows.length} distinct municipalities:`);
rows.forEach(r => {
  const qid = r.muni?.value?.replace('http://www.wikidata.org/entity/','') ?? '';
  const name = r.muniLabel?.value ?? '';
  console.log(`  ${qid.padEnd(12)} ${name}`);
});
