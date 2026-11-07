# Hello Maldives!

A cartoon-style guide to the Maldives with two ways to explore:

- **Classic map** (`index.html`): an interactive Leaflet map with hotels, local islands, sea-life areas and getting-around spots, filters, a place list and an EN / 中文 toggle.
- **Living island** (`island/index.html`): a canvas world you can wander. Little guests stroll between resorts, hop on buggies, cross the lagoons by speedboat and seaplane, while manta rays, whale sharks, turtles, dolphins and reef sharks swim in their home waters. Dawn, day, dusk and night, a bird's-eye view, follow-a-guest / buggy / sea-life modes and a journal.

Live site: https://ruanhoo.github.io/maldives/

## Run locally

It is a static site with no build step:

```sh
python3 -m http.server 8000
# open http://localhost:8000/
```

## Structure

```
index.html        classic map page
css/style.css     cartoon styling for the classic page
js/data.js        the places (hotels, islands, sea life, getting around)
js/i18n.js        English and Chinese UI text, plus Chinese place blurbs
js/app.js         Leaflet map, filters, list, language toggle
island/           the living-island canvas version
  index.html, island.css, strings.js, island.js
vendor/           Leaflet and markercluster (bundled)
```

## Adding a place

Add an entry to `js/data.js` (`id`, `type`, `emoji`, `district`, `name`, `zh`, `lat`, `lng`, `blurb`, `tip`), add its Chinese text to `js/i18n.js`, and for the living island give it a position in the `LAY` table at the top of `island/island.js`.

## Island debug URL parameters

`?lang=en|zh`, `?tod=0..3` (dawn, day, dusk, night), `?view=world`, `?cam=x,y,zoom`, `?sel=<place id>`, `?panel=drawer|log`, `?warm=<seconds>` (pre-run the simulation), `?nointro=1`.

## Notes

- Sea-life pins are approximate areas where the animals are often seen, never a promise. Hotels are examples, not endorsements. Check seasons, prices and rules before you go.
- The living island is a stylised layout, not to scale: the real atolls are far too spread out and too small to draw faithfully.
- Map tiles come from OpenStreetMap's public tile server (no key needed). That server is meant for light use. For heavy traffic, switch `js/app.js` to a tile provider you have an account with.
- Map data © OpenStreetMap contributors.

## Teleport
The living island shares a small `island/teleport.js` with the Xi'an and Vancouver maps: a toolbar button and an in-world portal on the airport island open a city picker, with a swirl transition and an arrival toast. Debug: `?portal=1` (frame the portal), `?portal=open` (open the picker).
