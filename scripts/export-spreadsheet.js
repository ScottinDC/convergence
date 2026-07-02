#!/usr/bin/env node
/**
 * Export ComboDiet spreadsheet to structured JSON.
 * Usage: node scripts/export-spreadsheet.js [path-to-xlsx]
 */

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const SOURCE_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRn1hG8ENWsGE0u8Y_Xip-3J841c4ZHPSvTyn5EAGI44SHiBB-EQ2-dsBdgXtwUhQ/pub?output=xlsx";
const DEFAULT_XLSX = path.join(DATA_DIR, "source.xlsx");

const BLOOD_TYPE_SUB = {
  "most beneficial": "beneficial",
  beneficial: "beneficial",
  "not allowed": "avoid",
  avoid: "avoid",
  allowed: "neutral",
  neutral: "neutral"
};

function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const SHEET_OUTPUT_FILES = {
  "by name": "by-name.json",
  "by name 01": "by-name.json",
  "by name (2)": "by-name-2.json",
  "by name 02": "by-name-2.json",
  "by cat": "by-cat.json",
  "by category": "by-cat.json"
};

function resolveOutputFilename(sheetName) {
  const key = sheetName.trim().toLowerCase();
  if (SHEET_OUTPUT_FILES[key]) {
    return SHEET_OUTPUT_FILES[key];
  }

  return `${slugify(sheetName)}.json`;
}

function isCategoryLabel(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed || trimmed.length < 2) {
    return false;
  }
  if (trimmed === trimmed.toUpperCase()) {
    return true;
  }
  if (/^(MOST BENEFICIAL|NOT ALLOWED|ALLOWED)$/i.test(trimmed)) {
    return true;
  }

  const words = trimmed.split(/[\s,/()-]+/).filter(Boolean);
  if (words.length === 0 || words.length > 8) {
    return false;
  }

  return words.every((word) => /^[A-Z][a-z]*$/.test(word) || word === word.toUpperCase());
}

function normalizeSubType(label) {
  const key = String(label || "").trim().toLowerCase();
  return BLOOD_TYPE_SUB[key] || null;
}

function emptyBloodTypeCategory() {
  return { beneficial: [], avoid: [], neutral: [] };
}

function addUnique(list, value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return;
  }
  if (!list.includes(trimmed)) {
    list.push(trimmed);
  }
}

function countRecords(data) {
  if (!data || typeof data !== "object") {
    return 0;
  }

  if (Array.isArray(data)) {
    return data.length;
  }

  let total = 0;
  for (const value of Object.values(data)) {
    if (Array.isArray(value)) {
      total += value.length;
    } else if (value && typeof value === "object") {
      if ("beneficial" in value || "avoid" in value || "neutral" in value) {
        total +=
          (value.beneficial?.length || 0) +
          (value.avoid?.length || 0) +
          (value.neutral?.length || 0);
      } else {
        total += countRecords(value);
      }
    }
  }
  return total;
}

function buildMetadata(sheetName) {
  return {
    source: SOURCE_URL,
    exportedAt: new Date().toISOString(),
    sheetName
  };
}

function parseMatrixSheet(rows, sheetName) {
  if (!rows.length) {
    return { metadata: buildMetadata(sheetName), diets: {} };
  }

  const headerRow = rows[0] || [];
  const subHeaderRow = rows[1] || [];
  const columnGroups = [];
  let currentDiet = "";

  for (let col = 0; col < headerRow.length; col++) {
    const dietHeader = String(headerRow[col] || "").trim();
    if (dietHeader) {
      currentDiet = dietHeader;
    }

    if (!currentDiet) {
      continue;
    }

    const subLabel = String(subHeaderRow[col] || "").trim();
    const subType = normalizeSubType(subLabel);

    columnGroups.push({
      diet: currentDiet,
      col,
      subType
    });
  }

  const diets = {};
  const categoryByCol = {};

  for (const group of columnGroups) {
    if (!diets[group.diet]) {
      diets[group.diet] = {};
    }
    categoryByCol[group.col] = null;
  }

  for (let rowIndex = 2; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex] || [];

    for (const group of columnGroups) {
      const cell = String(row[group.col] || "").trim();
      if (!cell) {
        continue;
      }

      if (isCategoryLabel(cell)) {
        categoryByCol[group.col] = cell;
        if (!group.subType) {
          if (!diets[group.diet][cell]) {
            diets[group.diet][cell] = [];
          }
        } else if (!diets[group.diet][cell]) {
          diets[group.diet][cell] = emptyBloodTypeCategory();
        }
        continue;
      }

      const category = categoryByCol[group.col];
      if (!category) {
        continue;
      }

      if (group.subType) {
        if (!diets[group.diet][category] || Array.isArray(diets[group.diet][category])) {
          diets[group.diet][category] = emptyBloodTypeCategory();
        }
        addUnique(diets[group.diet][category][group.subType], cell);
      } else {
        if (!diets[group.diet][category] || !Array.isArray(diets[group.diet][category])) {
          diets[group.diet][category] = [];
        }
        addUnique(diets[group.diet][category], cell);
      }
    }
  }

  return {
    metadata: buildMetadata(sheetName),
    diets
  };
}

function parseByCatSheet(rows, sheetName) {
  const diets = {};
  let currentDiet = "";
  let currentCategory = "";

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex] || [];
    const dietCell = String(row[0] || "").trim();
    const categoryCell = String(row[1] || "").trim();
    const allowedCell = String(row[2] || "").trim();
    const bannedCell = String(row[3] || "").trim();
    const legacyNeutralCell = String(row[4] || "").trim();

    if (dietCell) {
      currentDiet = dietCell;
      if (!diets[currentDiet]) {
        diets[currentDiet] = {};
      }
    }

    if (!currentDiet) {
      continue;
    }

    if (categoryCell) {
      currentCategory = categoryCell;
    }

    if (!currentCategory) {
      continue;
    }

    if (/blood type/i.test(currentDiet)) {
      if (!diets[currentDiet][currentCategory]) {
        diets[currentDiet][currentCategory] = emptyBloodTypeCategory();
      }

      if (allowedCell && !/^(MOST BENEFICIAL|NOT ALLOWED|ALLOWED)$/i.test(allowedCell)) {
        addUnique(diets[currentDiet][currentCategory].beneficial, allowedCell);
      }
      if (bannedCell && !/^(MOST BENEFICIAL|NOT ALLOWED|ALLOWED)$/i.test(bannedCell)) {
        addUnique(diets[currentDiet][currentCategory].avoid, bannedCell);
      }
      if (legacyNeutralCell && !/^(MOST BENEFICIAL|NOT ALLOWED|ALLOWED)$/i.test(legacyNeutralCell)) {
        addUnique(diets[currentDiet][currentCategory].neutral, legacyNeutralCell);
      }
      continue;
    }

    if (!diets[currentDiet][currentCategory] || !Array.isArray(diets[currentDiet][currentCategory])) {
      diets[currentDiet][currentCategory] = [];
    }

    if (allowedCell) {
      addUnique(diets[currentDiet][currentCategory], allowedCell);
    }
    if (bannedCell) {
      addUnique(diets[currentDiet][currentCategory], bannedCell);
    }
  }

  return {
    metadata: buildMetadata(sheetName),
    diets
  };
}

function parseSheet(workbook, sheetName) {
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

  if (/^(by\s*cat|by\s*category)$/i.test(sheetName)) {
    return parseByCatSheet(rows, sheetName);
  }

  return parseMatrixSheet(rows, sheetName);
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function writeJson(filePath, data) {
  const content = JSON.stringify(data, null, 2) + "\n";
  fs.writeFileSync(filePath, content, "utf8");
  return Buffer.byteLength(content, "utf8");
}

function buildDownloadHtml(files) {
  const fileLinks = files
    .map(
      (file) =>
        `        <li><a href="${file.filename}" download>${file.filename}</a> <span class="meta">(${file.sheetName}, ${file.recordCount} records, ${formatBytes(file.sizeBytes)})</span></li>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ComboDiet Diet Data – JSON Downloads</title>
  <style>
    :root { font-family: system-ui, sans-serif; line-height: 1.5; color: #1a1a1a; }
    body { max-width: 52rem; margin: 2rem auto; padding: 0 1.25rem; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    p { color: #444; }
    ul { padding-left: 1.25rem; }
    li { margin: 0.5rem 0; }
    a { color: #0b5fff; }
    .meta { color: #666; font-size: 0.9rem; }
    .bundle { margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <h1>ComboDiet Diet Data</h1>
  <p>Structured JSON exports from the ComboDiet spreadsheet. Each file corresponds to one workbook tab.</p>

  <h2>Per-tab exports</h2>
  <ul>
${fileLinks}
  </ul>

  <div class="bundle">
    <h2>Combined download</h2>
    <ul>
      <li><a href="index.json" download>index.json</a> <span class="meta">(manifest)</span></li>
      <li><a href="all-sheets.json" download>all-sheets.json</a> <span class="meta">(all tabs in one file)</span></li>
    </ul>
  </div>
</body>
</html>
`;
}

function main() {
  const xlsxPath = process.argv[2] || DEFAULT_XLSX;

  if (!fs.existsSync(xlsxPath)) {
    console.error(`Spreadsheet not found: ${xlsxPath}`);
    process.exit(1);
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });

  const workbook = XLSX.readFile(xlsxPath);
  const sheetNames = workbook.SheetNames;

  console.log(`Found ${sheetNames.length} sheet(s): ${sheetNames.join(", ")}`);

  const exportedFiles = [];
  const allSheets = {
    metadata: {
      source: SOURCE_URL,
      exportedAt: new Date().toISOString(),
      sheetCount: sheetNames.length,
      sheetNames
    },
    sheets: {}
  };

  for (const sheetName of sheetNames) {
    const parsed = parseSheet(workbook, sheetName);
    const filename = resolveOutputFilename(sheetName);
    const filePath = path.join(DATA_DIR, filename);
    const sizeBytes = writeJson(filePath, parsed);
    const recordCount = countRecords(parsed.diets);

    exportedFiles.push({
      sheetName,
      filename,
      path: `data/${filename}`,
      recordCount,
      sizeBytes,
      dietCount: Object.keys(parsed.diets).length
    });

    allSheets.sheets[sheetName] = parsed;

    console.log(`  Exported "${sheetName}" -> ${filename} (${recordCount} records, ${formatBytes(sizeBytes)})`);
  }

  const allSheetsPath = path.join(DATA_DIR, "all-sheets.json");
  const allSheetsSize = writeJson(allSheetsPath, allSheets);

  const index = {
    metadata: {
      source: SOURCE_URL,
      exportedAt: new Date().toISOString(),
      sheetCount: sheetNames.length
    },
    files: exportedFiles.map(({ sheetName, filename, path: filePath, recordCount, sizeBytes, dietCount }) => ({
      sheetName,
      filename,
      path: filePath,
      recordCount,
      sizeBytes,
      dietCount
    })),
    combined: {
      filename: "all-sheets.json",
      path: "data/all-sheets.json",
      sizeBytes: allSheetsSize
    }
  };

  const indexPath = path.join(DATA_DIR, "sheets-index.json");
  writeJson(indexPath, index);

  console.log(`\nWrote sheets-index.json and all-sheets.json (${formatBytes(allSheetsSize)})`);
}

main();
