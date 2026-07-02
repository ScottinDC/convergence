import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dataDir = path.join(root, "data");
const sourcePath = path.join(dataDir, "source.xlsx");

const wb = XLSX.readFile(sourcePath);

function findSheet(workbook, ...patterns) {
  for (const pattern of patterns) {
    const match = workbook.SheetNames.find((name) => pattern.test(name));
    if (match) {
      return match;
    }
  }
  return null;
}

const categorySheetName =
  findSheet(wb, /^by\s*cat$/i, /category/i) || wb.SheetNames[wb.SheetNames.length - 1];
const rows = XLSX.utils.sheet_to_json(wb.Sheets[categorySheetName], { header: 1, defval: "" });

const HEADER_VALUES = new Set([
  "most beneficial",
  "not allowed",
  "allowed",
  "fish / seafood",
  "meat",
  "dairy",
  "fat",
  "nut",
  "bean",
  "grain",
  "vegetable",
  "fruit"
]);

function clean(value) {
  return String(value || "")
    .replace(/\u200b/g, "")
    .trim();
}

function normalizeFood(value) {
  return clean(value)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[’']/g, "'");
}

function addFood(target, category, food) {
  const item = clean(food);
  if (!item || HEADER_VALUES.has(item.toLowerCase())) {
    return;
  }

  if (!target.categories[category]) {
    target.categories[category] = [];
  }

  if (!target.categories[category].includes(item)) {
    target.categories[category].push(item);
  }

  target.allFoods.add(normalizeFood(item));
}

function addBloodFood(target, category, column, food) {
  const item = clean(food);
  if (!item || HEADER_VALUES.has(item.toLowerCase())) {
    return;
  }

  if (!target.categories[category]) {
    target.categories[category] = { beneficial: [], avoid: [], neutral: [] };
  }

  if (!target.categories[category][column].includes(item)) {
    target.categories[category][column].push(item);
  }

  target.allFoods[column].add(normalizeFood(item));
}

function finalizeCategories(categories) {
  const sorted = {};

  for (const [category, foods] of Object.entries(categories)) {
    if (Array.isArray(foods)) {
      sorted[category] = [...foods].sort((a, b) => a.localeCompare(b));
      continue;
    }

    sorted[category] = {
      beneficial: [...foods.beneficial].sort((a, b) => a.localeCompare(b)),
      avoid: [...foods.avoid].sort((a, b) => a.localeCompare(b)),
      neutral: [...foods.neutral].sort((a, b) => a.localeCompare(b))
    };
  }

  return sorted;
}

const dietBuckets = {
  "The Dash Diet": { file: "dash.json", key: "dash" },
  "Mediterranean Diet": { file: "mediterranean.json", key: "mediterranean" },
  "Healthy Vegetarian": { file: "healthy-vegetarian.json", key: "healthyVegetarian" },
  Keto: { file: "keto.json", key: "keto" },
  Pescetarian: { file: "pescetarian.json", key: "pescetarian" },
  "Semi-Vegetarianism": { file: "semi-vegetarian.json", key: "semiVegetarian" },
  "AB Blood Type": { file: "blood-type-ab.json", key: "bloodTypeAb" },
  "A Blood Type": { file: "blood-type-a.json", key: "bloodTypeA" },
  "B Blood Type": { file: "blood-type-b.json", key: "bloodTypeB" },
  "O Blood Type": { file: "blood-type-o.json", key: "bloodTypeO" }
};

const parsed = {};

for (const dietName of Object.keys(dietBuckets)) {
  const isBloodType = /blood type/i.test(dietName);
  parsed[dietName] = {
    name: dietName,
    type: isBloodType ? "blood-type" : "category-list",
    categories: {},
    allFoods: isBloodType
      ? { beneficial: new Set(), avoid: new Set(), neutral: new Set() }
      : new Set()
  };
}

const discoveredDiets = new Set();

for (let index = 1; index < rows.length; index += 1) {
  const row = rows[index];
  const dietName = clean(row[0]);
  const category = clean(row[1]);

  if (dietName) {
    discoveredDiets.add(dietName);
  }

  if (!dietName || !category || !parsed[dietName]) {
    continue;
  }

  const bucket = parsed[dietName];

  if (bucket.type === "blood-type") {
    addBloodFood(bucket, category, "beneficial", row[2]);
    addBloodFood(bucket, category, "avoid", row[3]);
    addBloodFood(bucket, category, "neutral", row[4]);
    continue;
  }

  addFood(bucket, category, row[2]);
  addFood(bucket, category, row[3]);
}

const unmappedDiets = [...discoveredDiets].filter((name) => !dietBuckets[name]);

const manifest = {
  version: 1,
  source: "Google Sheets export",
  sheets: wb.SheetNames,
  diets: [],
  frameworks: []
};

const definitions = {
  dash: {
    id: "dash",
    name: "DASH Diet",
    shortName: "DASH",
    description:
      "Dietary Approaches to Stop Hypertension emphasizes vegetables, fruits, whole grains, lean protein, and limited sodium.",
    framing:
      "Often discussed for blood pressure and heart health. Use as a conversation framework with the care team, not as a standalone treatment plan."
  },
  mediterranean: {
    id: "mediterranean",
    name: "Mediterranean Diet",
    shortName: "Mediterranean",
    description:
      "Emphasizes vegetables, legumes, whole grains, olive oil, fish, and moderate dairy with limited processed foods.",
    framing:
      "Frequently referenced for cardiovascular and inflammatory conditions. Confirm fit with current treatment goals."
  },
  healthyVegetarian: {
    id: "healthyVegetarian",
    name: "Healthy Vegetarian",
    shortName: "Vegetarian",
    description:
      "Plant-forward eating that excludes meat, poultry, and fish while emphasizing vegetables, fruits, whole grains, legumes, nuts, and dairy or eggs as tolerated.",
    framing:
      "Can support fiber and phytonutrient intake, but protein, iron, and B12 adequacy should be reviewed with a dietitian—especially during cancer treatment."
  },
  keto: {
    id: "keto",
    name: "Ketogenic Diet",
    shortName: "Keto",
    description:
      "Very low carbohydrate, higher fat approach intended to shift the body toward ketone metabolism.",
    framing:
      "Can conflict with other medical nutrition needs during cancer care. Requires explicit clinician review before use."
  },
  pescetarian: {
    id: "pescetarian",
    name: "Pescetarian Diet",
    shortName: "Pescetarian",
    description:
      "Mostly plant-based eating that includes fish and seafood while excluding other meats.",
    framing:
      "Adds omega-3-rich seafood to a vegetarian pattern. Confirm seafood safety, mercury limits, and treatment interactions with the care team."
  },
  semiVegetarian: {
    id: "semiVegetarian",
    name: "Semi-Vegetarian / Flexitarian",
    shortName: "Semi-Vegetarian",
    description:
      "Primarily plant-based eating with occasional meat, poultry, or fish—also called flexitarianism.",
    framing:
      "Offers flexibility while keeping plants central. Useful as a discussion framework when full vegetarianism feels too restrictive."
  },
  bloodType: {
    id: "bloodType",
    name: "Blood Type / GenoType Diet",
    shortName: "Blood Type",
    description:
      "Framework that classifies foods as most beneficial, neutral, or to avoid based on ABO blood type.",
    framing:
      "Evidence is mixed and this is not standard oncology nutrition guidance. Treat classifications as discussion prompts with a registered dietitian."
  }
};

for (const [dietName, meta] of Object.entries(dietBuckets)) {
  const bucket = parsed[dietName];
  const payload = {
    id: meta.key,
    name: dietName,
    type: bucket.type,
    categories: finalizeCategories(bucket.categories),
    foodCount:
      bucket.type === "blood-type"
        ? {
            beneficial: bucket.allFoods.beneficial.size,
            avoid: bucket.allFoods.avoid.size,
            neutral: bucket.allFoods.neutral.size
          }
        : bucket.allFoods.size
  };

  fs.writeFileSync(path.join(dataDir, meta.file), `${JSON.stringify(payload, null, 2)}\n`);

  manifest.diets.push({
    id: meta.key,
    file: meta.file,
    name: dietName,
    type: bucket.type
  });
}

manifest.frameworks = [
  { id: "dash", label: "DASH", dataFile: "dash.json", definitionId: "dash", group: "general" },
  {
    id: "mediterranean",
    label: "Mediterranean",
    dataFile: "mediterranean.json",
    definitionId: "mediterranean",
    group: "general"
  },
  {
    id: "healthyVegetarian",
    label: "Healthy Vegetarian",
    dataFile: "healthy-vegetarian.json",
    definitionId: "healthyVegetarian",
    group: "plant-based"
  },
  {
    id: "pescetarian",
    label: "Pescetarian",
    dataFile: "pescetarian.json",
    definitionId: "pescetarian",
    group: "plant-based"
  },
  {
    id: "semiVegetarian",
    label: "Semi-Vegetarian",
    dataFile: "semi-vegetarian.json",
    definitionId: "semiVegetarian",
    group: "plant-based"
  },
  { id: "keto", label: "Keto", dataFile: "keto.json", definitionId: "keto", group: "other" },
  {
    id: "bloodType",
    label: "Blood Type",
    dataFilePattern: "blood-type-{type}.json",
    definitionId: "bloodType",
    bloodTypes: ["A", "B", "AB", "O"],
    group: "blood-type"
  }
];

function buildDownloadHtml(dietFiles) {
  const frameworkLinks = dietFiles
    .map(
      (diet) =>
        `        <li><a href="${diet.file}" download>${diet.file}</a> <span class="meta">(${diet.name})</span></li>`
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
  <p>Structured JSON exports from the ComboDiet spreadsheet.</p>

  <h2>Per-framework exports</h2>
  <ul>
${frameworkLinks}
  </ul>

  <div class="bundle">
    <h2>Manifest &amp; definitions</h2>
    <ul>
      <li><a href="index.json" download>index.json</a> <span class="meta">(framework manifest)</span></li>
      <li><a href="definitions.json" download>definitions.json</a> <span class="meta">(framework descriptions)</span></li>
      <li><a href="by-cat.json" download>by-cat.json</a> <span class="meta">(by cat tab)</span></li>
      <li><a href="by-name.json" download>by-name.json</a> <span class="meta">(by name tab)</span></li>
      <li><a href="by-name-2.json" download>by-name-2.json</a> <span class="meta">(by name tab 2)</span></li>
      <li><a href="all-sheets.json" download>all-sheets.json</a> <span class="meta">(all tabs in one file)</span></li>
    </ul>
  </div>
</body>
</html>
`;
}

fs.writeFileSync(path.join(dataDir, "definitions.json"), `${JSON.stringify(definitions, null, 2)}\n`);
fs.writeFileSync(path.join(dataDir, "index.json"), `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(
  path.join(dataDir, "download.html"),
  `${buildDownloadHtml(manifest.diets)}\n`
);

console.log(`Using category sheet: "${categorySheetName}"`);
console.log("Parsed diets:", manifest.diets.map((diet) => `${diet.id} (${diet.type})`).join(", "));

if (unmappedDiets.length > 0) {
  console.warn("Unmapped diet names in spreadsheet:", unmappedDiets.join(", "));
}
