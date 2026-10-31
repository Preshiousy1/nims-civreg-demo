# Data sources

## Nigeria states and LGAs

- **Dataset:** GRID3 NGA Operational LGA Boundaries (December 2020).
- **Publisher:** GRID3 (Geo-Referenced Infrastructure and Demographic Data for Development), with partners including CIESIN / Columbia University. Government of Nigeria (NASRDA) has since taken over hosting of the GRID3 Nigeria portal.
- **About page:** https://data.grid3.org/datasets/GRID3::grid3-nga-operational-lga-boundaries/about
- **Catalogue:** https://grid3.org/geospatial-data-nigeria (lists “LGA: GRID3 NGA – Operational LGA Boundaries (December 2020)”).
- **Local file as downloaded:** `NGA_LGA_Boundaries_2_6976858410435725727.csv` (repo root). Downloaded 30 Oct 2026.
- **Working extract:** `data/nigeria-admin.csv` (columns `statename`, `statecode`, `lganame`, `lgacode` only). No names were typed by hand; rows were copied from the GRID3 CSV.

### Counts (from the downloaded file, not from memory)

| | Count |
|---|---|
| LGA rows | 774 |
| Distinct `statename` | 37 (36 states + `Fct`) |
| Distinct `statecode` | 37 |
| Distinct `lgacode` | 774 |
| Duplicate (state, LGA) pairs | 0 |

The usual national figure is 774 LGAs. This file matches.

### Spelling kept from source

- FCT is stored as **`Fct`** (not `FCT` or `Federal Capital Territory`). The six FCT area councils are: Abaji, Bwari, Gwagwalada, Kuje, Kwali, Municipal Area Council.
- Rivers LGA is **`Port-Harcourt`** (hyphen), not “Port Harcourt”.
- `lgacode` is used as-is. Most codes are 4–5 digits; Borno `Maiduguri` is `124` in this file. That is a source value, not a correction.

Row `timestamp` values in the CSV are mostly 2019-08-09 (and some 2020-02-24). The GRID3 catalogue date for this operational LGA product is December 2020. The `source` field on rows includes `eHA_Polio`, `WHO`, `GRID`, `INEC`.

### Demo offices

`data/demo-offices.csv` is invented **office names** only, marked `demo=true`. Each office is linked to a real GRID3 state + LGA. One office per geopolitical zone, plus FCT.
