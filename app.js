const STORAGE_KEY = "convergence-health-planner";

const sampleConditions = [
  {
    id: crypto.randomUUID(),
    name: "Chemotherapy recovery",
    symptoms: ["fatigue", "nausea", "loss of appetite", "mouth sores"],
    helpful: ["hydration", "soft foods", "high-protein smoothies", "small frequent meals"],
    avoid: ["rough foods", "acidic foods if mouth is sore", "alcohol"]
  },
  {
    id: crypto.randomUUID(),
    name: "Colon inflammation",
    symptoms: ["abdominal pain", "diarrhea", "fatigue", "loss of appetite"],
    helpful: ["low-fiber foods during flare", "hydration", "electrolytes", "plain starches"],
    avoid: ["very spicy foods", "greasy foods", "high-fiber foods during flare"]
  },
  {
    id: crypto.randomUUID(),
    name: "Anemia",
    symptoms: ["fatigue", "dizziness", "weakness", "shortness of breath"],
    helpful: ["iron-rich foods", "protein", "vitamin c with meals"],
    avoid: ["tea or coffee with iron-rich meals"]
  }
];

const form = document.querySelector("#condition-form");
const nameInput = document.querySelector("#condition-name");
const symptomsInput = document.querySelector("#condition-symptoms");
const helpfulInput = document.querySelector("#condition-diet-helpful");
const avoidInput = document.querySelector("#condition-diet-avoid");
const addConditionButton = document.querySelector("#add-condition");
const clearFormButton = document.querySelector("#clear-form");
const loadSampleButton = document.querySelector("#load-sample");
const runAiAnalysisButton = document.querySelector("#run-ai-analysis");
const conditionList = document.querySelector("#condition-list");
const conditionCount = document.querySelector("#condition-count");
const conditionsTotal = document.querySelector("#conditions-total");
const sharedSymptomTotal = document.querySelector("#shared-symptom-total");
const sharedDietTotal = document.querySelector("#shared-diet-total");
const symptomOverlap = document.querySelector("#symptom-overlap");
const dietThemes = document.querySelector("#diet-themes");
const doctorQuestions = document.querySelector("#doctor-questions");
const aiSummary = document.querySelector("#ai-summary");
const template = document.querySelector("#condition-item-template");

let conditions = loadConditions();
let currentAiAnalysis = null;

render();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  saveCurrentCondition();
});

addConditionButton.addEventListener("click", () => {
  if (addConditionButton.type !== "submit") {
    saveCurrentCondition();
  }
});

clearFormButton.addEventListener("click", () => {
  form.reset();
  nameInput.focus();
});

loadSampleButton.addEventListener("click", () => {
  conditions = structuredClone(sampleConditions);
  currentAiAnalysis = null;
  persist();
  render();
});

runAiAnalysisButton.addEventListener("click", async () => {
  if (conditions.length === 0) {
    currentAiAnalysis = null;
    renderAiEmptyState("Add at least one condition before running AI analysis.");
    return;
  }

  setAiLoadingState(true);

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ conditions })
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "The AI analysis request failed.");
    }

    currentAiAnalysis = payload.analysis;
    renderAiSummary(payload.analysis);
  } catch (error) {
    currentAiAnalysis = null;
    renderAiEmptyState(error.message || "Unable to run AI analysis right now.");
  } finally {
    setAiLoadingState(false);
  }
});

function loadConditions() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return [];
  }

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conditions));
}

function saveCurrentCondition() {
  const nextCondition = {
    id: crypto.randomUUID(),
    name: nameInput.value.trim(),
    symptoms: tokenizeList(symptomsInput.value),
    helpful: tokenizeList(helpfulInput.value),
    avoid: tokenizeList(avoidInput.value)
  };

  if (!nextCondition.name || nextCondition.symptoms.length === 0) {
    nameInput.focus();
    return;
  }

  conditions = [...conditions, nextCondition];
  currentAiAnalysis = null;
  persist();
  form.reset();
  render();
  nameInput.focus();
}

function tokenizeList(rawValue) {
  return rawValue
    .split(/[,\n]/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

function render() {
  renderConditionList();
  renderOverview();
  renderOverlap();
  renderDietThemes();
  renderDoctorQuestions();

  if (currentAiAnalysis) {
    renderAiSummary(currentAiAnalysis);
  } else {
    renderAiEmptyState(
      "Run AI Analysis to turn the entered conditions into a clearer summary for discussion with her care team."
    );
  }
}

function renderConditionList() {
  conditionList.innerHTML = "";
  conditionCount.textContent = `${conditions.length} saved`;

  if (conditions.length === 0) {
    conditionList.appendChild(
      buildEmptyState(
        "No conditions have been added yet. Start with one diagnosis, then keep layering in the rest."
      )
    );
    return;
  }

  conditions.forEach((condition) => {
    const fragment = template.content.cloneNode(true);
    const root = fragment.querySelector(".condition-item");
    const title = fragment.querySelector(".condition-title");
    const deleteButton = fragment.querySelector(".delete-button");
    const symptomsWrap = fragment.querySelector('[data-role="symptoms"]');
    const helpfulWrap = fragment.querySelector('[data-role="helpful"]');
    const avoidWrap = fragment.querySelector('[data-role="avoid"]');

    title.textContent = condition.name;
    populateChipWrap(symptomsWrap, condition.symptoms, "No symptoms listed");
    populateChipWrap(helpfulWrap, condition.helpful, "No helpful notes yet");
    populateChipWrap(avoidWrap, condition.avoid, "No caution notes yet");

    deleteButton.addEventListener("click", () => {
      conditions = conditions.filter((item) => item.id !== condition.id);
      currentAiAnalysis = null;
      persist();
      render();
    });

    conditionList.appendChild(root);
  });
}

function renderOverview() {
  const overlapRows = buildOverlapRows();
  const dietRows = buildFrequencyMap("helpful");

  conditionsTotal.textContent = String(conditions.length);
  sharedSymptomTotal.textContent = String(overlapRows.length);
  sharedDietTotal.textContent = String(dietRows.length);
}

function renderOverlap() {
  symptomOverlap.innerHTML = "";

  if (conditions.length < 2) {
    symptomOverlap.appendChild(
      buildEmptyState("Add at least two conditions to see which symptoms are repeating.")
    );
    return;
  }

  const overlaps = buildOverlapRows();

  if (overlaps.length === 0) {
    symptomOverlap.appendChild(
      buildEmptyState("No symptom overlap has appeared yet across the saved conditions.")
    );
    return;
  }

  const wrap = document.createElement("div");
  wrap.className = "pill-list";

  overlaps.forEach(([symptom, names]) => {
    const pill = document.createElement("div");
    pill.className = "pill emphasis";
    pill.innerHTML = `<strong>${capitalize(symptom)}</strong> <span class="count">${names.length} conditions</span>`;
    pill.title = names.join(", ");
    wrap.appendChild(pill);
  });

  symptomOverlap.appendChild(wrap);
}

function renderDietThemes() {
  dietThemes.innerHTML = "";

  if (conditions.length === 0) {
    dietThemes.appendChild(
      buildEmptyState("Food themes will appear here after you add condition notes.")
    );
    return;
  }

  const helpfulMap = buildFrequencyMap("helpful");
  const avoidMap = buildFrequencyMap("avoid");
  const stack = document.createElement("div");
  stack.className = "meta-stack";

  stack.appendChild(
    buildMetaBlock(
      "Helpful patterns repeated across conditions",
      helpfulMap,
      "No repeated helpful food patterns yet."
    )
  );

  stack.appendChild(
    buildMetaBlock(
      "Cautions that repeat and may need review",
      avoidMap,
      "No repeated caution themes yet."
    )
  );

  const note = document.createElement("div");
  note.className = "note-box";
  note.innerHTML =
    "<strong>Reminder:</strong> this is a summary of the notes entered here, not a medically verified diet plan.";
  stack.appendChild(note);

  dietThemes.appendChild(stack);
}

function renderDoctorQuestions() {
  doctorQuestions.innerHTML = "";

  const prompts = buildQuestions();

  if (prompts.length === 0) {
    doctorQuestions.appendChild(
      buildEmptyState("Questions will appear here once at least one condition is added.")
    );
    return;
  }

  const wrap = document.createElement("div");
  wrap.className = "question-list";

  prompts.forEach((prompt) => {
    const item = document.createElement("div");
    item.className = "question-item";
    item.textContent = prompt;
    wrap.appendChild(item);
  });

  doctorQuestions.appendChild(wrap);
}

function buildOverlapRows() {
  const symptomMap = new Map();

  conditions.forEach((condition) => {
    [...new Set(condition.symptoms)].forEach((symptom) => {
      if (!symptomMap.has(symptom)) {
        symptomMap.set(symptom, []);
      }

      symptomMap.get(symptom).push(condition.name);
    });
  });

  return [...symptomMap.entries()]
    .filter(([, names]) => names.length > 1)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
}

function buildFrequencyMap(field) {
  const map = new Map();

  conditions.forEach((condition) => {
    [...new Set(condition[field])].forEach((entry) => {
      if (!map.has(entry)) {
        map.set(entry, []);
      }

      map.get(entry).push(condition.name);
    });
  });

  return [...map.entries()]
    .filter(([, names]) => names.length > 1)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
}

function buildMetaBlock(title, rows, emptyMessage) {
  const block = document.createElement("section");

  const heading = document.createElement("p");
  heading.className = "meta-block-title";
  heading.textContent = title;
  block.appendChild(heading);

  if (rows.length === 0) {
    block.appendChild(buildEmptyState(emptyMessage));
    return block;
  }

  const wrap = document.createElement("div");
  wrap.className = "pill-list";

  rows.forEach(([entry, names]) => {
    const pill = document.createElement("div");
    pill.className = "pill";
    pill.innerHTML = `<strong>${capitalize(entry)}</strong> <span class="count">${names.length} conditions</span>`;
    pill.title = names.join(", ");
    wrap.appendChild(pill);
  });

  block.appendChild(wrap);
  return block;
}

function buildQuestions() {
  if (conditions.length === 0) {
    return [];
  }

  const questions = [
    "Which symptoms should guide meals most right now: appetite loss, nausea, pain, or digestion changes?",
    "Are any of these conditions likely to require food advice that conflicts with the others?",
    "Should calories, protein, hydration, or fiber be prioritized first at this stage of treatment?"
  ];

  const hasAvoids = conditions.some((condition) => condition.avoid.length > 0);
  const hasOverlap = buildOverlapRows().length > 0;
  const hasHelpfulThemes = buildFrequencyMap("helpful").length > 0;

  if (hasAvoids) {
    questions.push("Are there foods, supplements, or vitamins here that could interfere with treatment or medications?");
  }

  if (hasOverlap || hasHelpfulThemes) {
    questions.push("Which repeated food themes are truly safe and worth continuing for her specific diagnoses?");
  }

  return questions;
}

function renderAiEmptyState(message) {
  aiSummary.innerHTML = "";
  aiSummary.appendChild(buildEmptyState(message));
}

function setAiLoadingState(isLoading) {
  runAiAnalysisButton.disabled = isLoading;
  runAiAnalysisButton.textContent = isLoading ? "Analyzing..." : "Run AI Analysis";

  if (isLoading) {
    aiSummary.innerHTML = '<p class="status-line">Reviewing the entered conditions and organizing a careful summary...</p>';
  }
}

function renderAiSummary(analysis) {
  aiSummary.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "ai-block";

  wrapper.appendChild(buildAiSection("Summary", [analysis.summary || "No summary returned."]));
  wrapper.appendChild(
    buildAiSection(
      "Shared diet considerations to discuss",
      analysis.dietConsiderations?.length
        ? analysis.dietConsiderations
        : ["No shared diet considerations were identified."]
    )
  );
  wrapper.appendChild(
    buildAiSection(
      "Questions for the care team",
      analysis.clinicianQuestions?.length
        ? analysis.clinicianQuestions
        : ["No clinician questions were generated."]
    )
  );
  wrapper.appendChild(
    buildAiSection(
      "Safety notes",
      analysis.safetyNotes?.length
        ? analysis.safetyNotes
        : ["Any diet changes should be reviewed with a licensed clinician."]
    )
  );

  aiSummary.appendChild(wrapper);
}

function buildAiSection(title, items) {
  const section = document.createElement("section");
  section.className = "ai-section";

  const heading = document.createElement("p");
  heading.className = "ai-section-title";
  heading.textContent = title;
  section.appendChild(heading);

  const list = document.createElement("ul");
  list.className = "ai-list";

  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    list.appendChild(li);
  });

  section.appendChild(list);
  return section;
}

function populateChipWrap(container, items, emptyMessage) {
  container.innerHTML = "";

  if (items.length === 0) {
    const chip = document.createElement("span");
    chip.className = "chip muted";
    chip.textContent = emptyMessage;
    container.appendChild(chip);
    return;
  }

  items.forEach((item) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = capitalize(item);
    container.appendChild(chip);
  });
}

function buildEmptyState(message) {
  const node = document.createElement("div");
  node.className = "empty-state";
  node.textContent = message;
  return node;
}

function capitalize(value) {
  return value.replace(/\b\w/g, (match) => match.toUpperCase());
}
