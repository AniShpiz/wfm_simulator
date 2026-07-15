# INGESTION_SPEC.md

Ingestion behavior specification.

## Supported Input Types

- .xlsx
- .xlsm
- .xls (legacy BIFF8)
- .csv
- .tsv
- .txt (delimited)
- .json
- HTML table exports disguised as spreadsheet files

## Detection Order

bytesToGrid uses byte signatures and content heuristics:

1. ZIP signature -> xlsx/xlsm parser
2. CFB signature -> xls parser
3. UTF BOM and text decoding fallback
4. JSON parse if text starts with object/array markers
5. HTML table parse if markup detected
6. Delimited parser fallback

## Header Mapping

Header detection is fuzzy and bilingual:

- scans early rows
- maps by synonyms dictionary
- supports mixed order and naming

Primary mapped fields include date, interval/start/end, volume, aht, agents, mpt, name, team, skill, site, status, and constraint type.

## Classification Rules

- forecast when volume + aht fields are present
- roster when staffing/name + time + date/day fields are present
- matrix roster fallback for pivot day x interval layouts

## Tikshuv Multi-Sheet Flow

When workbook has multiple sheets:

- detect Iron-like sheet by name pattern
- detect roster-like sheet by name pattern
- parse roster and iron
- extract workforce metadata and validations
- apply week from ingested data

## Normalization Rules

- date normalization handles ISO, local formats, and Excel serials
- time normalization handles hh:mm, AM/PM, and Excel fractions
- intervals bucket to 30-minute resolution
- malformed rows are skipped and counted

## Error Handling

Expected error classes:

- unsupported type
- header not found
- required fields missing
- no valid data rows

UI should show clear status and errors.
