const NutritionEngine = (() => {
  const DATA_ROOT = "./data/";
  const GENERIC_PHRASES = new Set([
    "all kinds except those listed as not allowed",
    "all shellfish",
    "all kinds"
  ]);

  let manifestCache = null;
  const dietCache = new Map();

  function normalizeFoodName(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\u200b/g, "")
      .replace(/[’']/g, "'")
      .replace(/[^a-z0-9\s/-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isGenericFood(value) {
    const normalized = normalizeFoodName(value);
    if (!normalized) {
      return true;
    }

    return [...GENERIC_PHRASES].some((phrase) => normalized.includes(phrase));
  }

  async function loadManifest() {
    if (manifestCache) {
      return manifestCache;
    }

    const response = await fetch(`${DATA_ROOT}index.json`);
    if (!response.ok) {
      throw new Error("Unable to load nutrition data manifest.");
    }

    manifestCache = await response.json();
    return manifestCache;
  }

  async function loadDietFile(fileName) {
    if (dietCache.has(fileName)) {
      return dietCache.get(fileName);
    }

    const response = await fetch(`${DATA_ROOT}${fileName}`);
    if (!response.ok) {
      throw new Error(`Unable to load ${fileName}.`);
    }

    const payload = await response.json();
    dietCache.set(fileName, payload);
    return payload;
  }

  function resolveFrameworkFiles(manifest, profile) {
    const files = [];

    manifest.frameworks.forEach((framework) => {
      if (!profile.frameworks.includes(framework.id)) {
        return;
      }

      if (framework.id === "bloodType") {
        if (!profile.bloodType) {
          return;
        }

        files.push({
          frameworkId: framework.id,
          label: `${framework.label} (${profile.bloodType})`,
          data: framework.dataFilePattern.replace("{type}", profile.bloodType.toLowerCase())
        });
        return;
      }

      files.push({
        frameworkId: framework.id,
        label: framework.label,
        data: framework.dataFile
      });
    });

    return files;
  }

  function flattenCategoryList(diet, frameworkLabel) {
    const supportive = [];

    Object.entries(diet.categories || {}).forEach(([category, foods]) => {
      foods.forEach((food) => {
        if (isGenericFood(food)) {
          return;
        }

        supportive.push({
          name: food,
          normalized: normalizeFoodName(food),
          category,
          frameworkId: diet.id,
          frameworkLabel,
          stance: "supportive"
        });
      });
    });

    return { supportive, avoid: [], neutral: [] };
  }

  function flattenBloodType(diet, frameworkLabel) {
    const supportive = [];
    const avoid = [];
    const neutral = [];

    Object.entries(diet.categories || {}).forEach(([category, groups]) => {
      groups.beneficial.forEach((food) => {
        if (isGenericFood(food)) {
          return;
        }

        supportive.push({
          name: food,
          normalized: normalizeFoodName(food),
          category,
          frameworkId: diet.id,
          frameworkLabel,
          stance: "beneficial"
        });
      });

      groups.avoid.forEach((food) => {
        if (isGenericFood(food)) {
          return;
        }

        avoid.push({
          name: food,
          normalized: normalizeFoodName(food),
          category,
          frameworkId: diet.id,
          frameworkLabel,
          stance: "avoid"
        });
      });

      groups.neutral.forEach((food) => {
        if (isGenericFood(food)) {
          return;
        }

        neutral.push({
          name: food,
          normalized: normalizeFoodName(food),
          category,
          frameworkId: diet.id,
          frameworkLabel,
          stance: "neutral"
        });
      });
    });

    return { supportive, avoid, neutral };
  }

  async function loadSelectedFrameworks(profile) {
    const manifest = await loadManifest();
    const targets = resolveFrameworkFiles(manifest, profile);
    const loaded = [];

    for (const target of targets) {
      const diet = await loadDietFile(target.data);
      const flattened =
        diet.type === "blood-type"
          ? flattenBloodType(diet, target.label)
          : flattenCategoryList(diet, target.label);

      loaded.push({
        frameworkId: target.frameworkId,
        label: target.label,
        diet,
        ...flattened
      });
    }

    return { manifest, frameworks: loaded };
  }

  function foodsMatch(left, right) {
    if (!left || !right) {
      return false;
    }

    if (left === right) {
      return true;
    }

    return left.includes(right) || right.includes(left);
  }

  function groupByNormalized(entries) {
    const map = new Map();

    entries.forEach((entry) => {
      const key = entry.normalized;
      if (!map.has(key)) {
        map.set(key, {
          name: entry.name,
          normalized: key,
          frameworks: []
        });
      }

      map.get(key).frameworks.push({
        frameworkId: entry.frameworkId,
        frameworkLabel: entry.frameworkLabel,
        category: entry.category,
        stance: entry.stance
      });
    });

    return map;
  }

  function findAlignedFoods(frameworks) {
    if (frameworks.length === 0) {
      return [];
    }

    const supportiveMaps = frameworks.map((framework) =>
      groupByNormalized([...framework.supportive, ...framework.neutral])
    );

    const firstMap = supportiveMaps[0];
    const aligned = [];

    firstMap.forEach((entry, normalized) => {
      const appearsEverywhere = supportiveMaps.every((frameworkMap) => frameworkMap.has(normalized));
      if (!appearsEverywhere) {
        return;
      }

      aligned.push({
        name: entry.name,
        frameworks: entry.frameworks
      });
    });

    return aligned.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 24);
  }

  function findConflicts(frameworks) {
    const supportive = [];
    const avoid = [];

    frameworks.forEach((framework) => {
      supportive.push(...framework.supportive, ...framework.neutral);
      avoid.push(...framework.avoid);
    });

    const conflicts = [];

    supportive.forEach((supportEntry) => {
      avoid.forEach((avoidEntry) => {
        if (!foodsMatch(supportEntry.normalized, avoidEntry.normalized)) {
          return;
        }

        conflicts.push({
          food: supportEntry.name,
          supportiveIn: supportEntry.frameworkLabel,
          avoidIn: avoidEntry.frameworkLabel
        });
      });
    });

    const deduped = new Map();
    conflicts.forEach((conflict) => {
      const key = `${conflict.food}|${conflict.supportiveIn}|${conflict.avoidIn}`;
      deduped.set(key, conflict);
    });

    return [...deduped.values()].sort((a, b) => a.food.localeCompare(b.food)).slice(0, 20);
  }

  function findCautions(frameworks) {
    const cautions = new Map();

    frameworks.forEach((framework) => {
      framework.avoid.forEach((entry) => {
        if (!cautions.has(entry.normalized)) {
          cautions.set(entry.normalized, {
            name: entry.name,
            frameworks: []
          });
        }

        cautions.get(entry.normalized).frameworks.push(entry.frameworkLabel);
      });
    });

    return [...cautions.values()]
      .map((entry) => ({
        name: entry.name,
        frameworks: [...new Set(entry.frameworks)]
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 20);
  }

  function matchNotesAgainstKnowledgeBase(conditions, frameworks) {
    const allFoods = [];

    frameworks.forEach((framework) => {
      allFoods.push(...framework.supportive, ...framework.neutral, ...framework.avoid);
    });

    const helpfulMatches = [];
    const avoidMatches = [];

    conditions.forEach((condition) => {
      condition.helpful.forEach((note) => {
        const hits = allFoods.filter((food) => foodsMatch(food.normalized, note));
        if (hits.length > 0) {
          helpfulMatches.push({
            note,
            condition: condition.name,
            matches: [...new Set(hits.map((hit) => hit.name))].slice(0, 5)
          });
        }
      });

      condition.avoid.forEach((note) => {
        const hits = allFoods.filter((food) => foodsMatch(food.normalized, note));
        if (hits.length > 0) {
          avoidMatches.push({
            note,
            condition: condition.name,
            matches: [...new Set(hits.map((hit) => hit.name))].slice(0, 5)
          });
        }
      });
    });

    return { helpfulMatches, avoidMatches };
  }

  async function analyze(profile, conditions) {
    const { manifest, frameworks } = await loadSelectedFrameworks(profile);

    if (frameworks.length === 0) {
      return {
        aligned: [],
        cautions: [],
        conflicts: [],
        noteMatches: { helpfulMatches: [], avoidMatches: [] },
        summary:
          "Select at least one diet framework (and blood type if using Blood Type) to compare foods."
      };
    }

    return {
      aligned: findAlignedFoods(frameworks),
      cautions: findCautions(frameworks),
      conflicts: findConflicts(frameworks),
      noteMatches: matchNotesAgainstKnowledgeBase(conditions, frameworks),
      manifest,
      frameworks: frameworks.map((framework) => ({
        id: framework.frameworkId,
        label: framework.label,
        supportiveCount: framework.supportive.length,
        avoidCount: framework.avoid.length
      }))
    };
  }

  function buildPromptContext(profile, analysis, conditions) {
    return {
      profile,
      selectedFrameworks: analysis.frameworks || [],
      alignedFoods: (analysis.aligned || []).map((item) => item.name),
      cautionFoods: (analysis.cautions || []).map((item) => item.name),
      conflicts: analysis.conflicts || [],
      helpfulNoteMatches: analysis.noteMatches?.helpfulMatches || [],
      avoidNoteMatches: analysis.noteMatches?.avoidMatches || [],
      conditions
    };
  }

  return {
    normalizeFoodName,
    loadManifest,
    analyze,
    buildPromptContext
  };
})();
