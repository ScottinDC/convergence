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

  function getDietOptions(manifest) {
    return manifest.dietOptions || [];
  }

  function resolveDietFiles(manifest, profile) {
    const files = [];
    const selectedDiets =
      profile.diets ||
      (Array.isArray(profile.frameworks) ? profile.frameworks : []);

    getDietOptions(manifest).forEach((dietOption) => {
      if (!selectedDiets.includes(dietOption.id)) {
        return;
      }

      if (dietOption.id === "bloodType") {
        if (!profile.bloodType) {
          return;
        }

        files.push({
          dietId: dietOption.id,
          label: `${dietOption.label} (${profile.bloodType})`,
          data: dietOption.dataFilePattern.replace("{type}", profile.bloodType.toLowerCase())
        });
        return;
      }

      files.push({
        dietId: dietOption.id,
        label: dietOption.label,
        data: dietOption.dataFile
      });
    });

    return files;
  }

  function flattenCategoryList(diet, dietLabel) {
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
          dietId: diet.id,
          dietLabel,
          stance: "supportive"
        });
      });
    });

    return { supportive, avoid: [], neutral: [] };
  }

  function flattenBloodType(diet, dietLabel) {
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
          dietId: diet.id,
          dietLabel,
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
          dietId: diet.id,
          dietLabel,
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
          dietId: diet.id,
          dietLabel,
          stance: "neutral"
        });
      });
    });

    return { supportive, avoid, neutral };
  }

  async function loadSelectedDiets(profile) {
    const manifest = await loadManifest();
    const targets = resolveDietFiles(manifest, profile);
    const loaded = [];

    for (const target of targets) {
      const diet = await loadDietFile(target.data);
      const flattened =
        diet.type === "blood-type"
          ? flattenBloodType(diet, target.label)
          : flattenCategoryList(diet, target.label);

      loaded.push({
        dietId: target.dietId,
        label: target.label,
        diet,
        ...flattened
      });
    }

    return { manifest, diets: loaded };
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
          diets: []
        });
      }

      map.get(key).diets.push({
        dietId: entry.dietId,
        dietLabel: entry.dietLabel,
        category: entry.category,
        stance: entry.stance
      });
    });

    return map;
  }

  function findAlignedFoods(diets) {
    if (diets.length === 0) {
      return [];
    }

    const supportiveMaps = diets.map((diet) =>
      groupByNormalized([...diet.supportive, ...diet.neutral])
    );

    const firstMap = supportiveMaps[0];
    const aligned = [];

    firstMap.forEach((entry, normalized) => {
      const appearsEverywhere = supportiveMaps.every((dietMap) => dietMap.has(normalized));
      if (!appearsEverywhere) {
        return;
      }

      aligned.push({
        name: entry.name,
        diets: entry.diets
      });
    });

    return aligned.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 24);
  }

  function findConflicts(diets) {
    const supportive = [];
    const avoid = [];

    diets.forEach((diet) => {
      supportive.push(...diet.supportive, ...diet.neutral);
      avoid.push(...diet.avoid);
    });

    const conflicts = [];

    supportive.forEach((supportEntry) => {
      avoid.forEach((avoidEntry) => {
        if (!foodsMatch(supportEntry.normalized, avoidEntry.normalized)) {
          return;
        }

        conflicts.push({
          food: supportEntry.name,
          supportiveIn: supportEntry.dietLabel,
          avoidIn: avoidEntry.dietLabel
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

  function findCautions(diets) {
    const cautions = new Map();

    diets.forEach((diet) => {
      diet.avoid.forEach((entry) => {
        if (!cautions.has(entry.normalized)) {
          cautions.set(entry.normalized, {
            name: entry.name,
            diets: []
          });
        }

        cautions.get(entry.normalized).diets.push(entry.dietLabel);
      });
    });

    return [...cautions.values()]
      .map((entry) => ({
        name: entry.name,
        diets: [...new Set(entry.diets)]
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 20);
  }

  function matchNotesAgainstKnowledgeBase(conditions, diets) {
    const allFoods = [];

    diets.forEach((diet) => {
      allFoods.push(...diet.supportive, ...diet.neutral, ...diet.avoid);
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
    const { manifest, diets } = await loadSelectedDiets(profile);

    if (diets.length === 0) {
      return {
        aligned: [],
        cautions: [],
        conflicts: [],
        noteMatches: { helpfulMatches: [], avoidMatches: [] },
        summary:
          "Select at least one diet (and blood type if using Blood Type) to compare foods."
      };
    }

    return {
      aligned: findAlignedFoods(diets),
      cautions: findCautions(diets),
      conflicts: findConflicts(diets),
      noteMatches: matchNotesAgainstKnowledgeBase(conditions, diets),
      manifest,
      diets: diets.map((diet) => ({
        id: diet.dietId,
        label: diet.label,
        supportiveCount: diet.supportive.length,
        avoidCount: diet.avoid.length
      }))
    };
  }

  function buildPromptContext(profile, analysis, conditions) {
    return {
      profile,
      selectedDiets: analysis.diets || [],
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
