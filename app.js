const checklistItems = [
  ["roofPhotos", "Roof photo set", "All elevations, penetrations, flashing, gutters, and close-ups."],
  ["stormDate", "Date record", "Storm, leak, inspection, and contractor visit dates."],
  ["atticCeiling", "Interior check", "Attic, ceiling stains, active moisture, decking, and insulation."],
  ["warrantyPolicy", "Documents", "Policy page, warranty, invoices, reports, and estimate PDFs."],
  ["safety", "Safety flags", "Tarps, active leaks, electrical risks, mold concerns, and access limits."],
  ["scope", "Scope gaps", "Missing line items, vague exclusions, material mismatch, and cleanup terms."]
];

const evidenceItems = [
  ["Photo labels", "Name photos by area, slope, room, or issue."],
  ["Moisture trail", "Connect exterior source to interior damage."],
  ["Material proof", "Shingle, underlayment, flashing, decking, and ventilation details."],
  ["Timeline", "Event date, discovery date, mitigation date, and contractor visits."],
  ["Estimate backup", "Line item notes, quantities, warranty, labor, and exclusions."],
  ["Next call", "Adjuster, roofer, warranty provider, or property manager."]
];

const goals = {
  claim: "Create a storm claim packet with missing evidence, claim questions, and next steps.",
  repair: "Turn this into a practical repair scope with priorities, risks, and photos to capture.",
  quote: "Compare contractor quotes for missing scope, weak warranties, and unclear price drivers.",
  maintenance: "Build a maintenance plan with priority, timeline, and homeowner action items."
};

const defaultState = {
  activeView: "inspection",
  checked: {},
  property: "",
  eventDate: "",
  notes: "",
  quotes: [
    { company: "", price: "", scope: "", warranty: "" },
    { company: "", price: "", scope: "", warranty: "" }
  ],
  photoCount: "",
  documentCount: "",
  urgency: "Routine",
  goal: "claim",
  concern: ""
};

const state = loadState();
const saveStatus = document.querySelector("#saveStatus");
let eventsBound = false;
let navigationBound = false;

function loadState() {
  try {
    return { ...defaultState, ...JSON.parse(localStorage.getItem("toolBeltPwa") || "{}") };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState(message = "Saved locally") {
  localStorage.setItem("toolBeltPwa", JSON.stringify(state));
  saveStatus.textContent = message;
  window.clearTimeout(saveState.timer);
  saveState.timer = window.setTimeout(() => {
    saveStatus.textContent = "Saved locally";
  }, 1700);
  updateBrief();
  updateCompletion();
}

function renderChecklist() {
  const root = document.querySelector("#checklist");
  root.innerHTML = "";
  for (const [id, title, hint] of checklistItems) {
    const label = document.createElement("label");
    label.className = "check-item";
    label.innerHTML = `
      <input type="checkbox" data-check="${id}">
      <span><strong>${title}</strong><span>${hint}</span></span>
    `;
    const input = label.querySelector("input");
    input.checked = Boolean(state.checked[id]);
    input.addEventListener("change", () => {
      state.checked[id] = input.checked;
      saveState("Checklist saved");
    });
    root.append(label);
  }
}

function renderQuotes() {
  const root = document.querySelector("#quoteList");
  root.innerHTML = "";
  state.quotes.forEach((quote, index) => {
    const card = document.createElement("div");
    card.className = "quote-card";
    card.innerHTML = `
      <input aria-label="Company ${index + 1}" data-field="company" placeholder="Company" value="${escapeHtml(quote.company)}">
      <input aria-label="Price ${index + 1}" data-field="price" placeholder="$" value="${escapeHtml(quote.price)}">
      <input class="wide" aria-label="Scope ${index + 1}" data-field="scope" placeholder="Scope and materials" value="${escapeHtml(quote.scope)}">
      <input class="wide risk" aria-label="Warranty ${index + 1}" data-field="warranty" placeholder="Warranty, exclusions, timeline" value="${escapeHtml(quote.warranty)}">
    `;
    card.querySelectorAll("input").forEach((input) => {
      input.addEventListener("input", () => {
        state.quotes[index][input.dataset.field] = input.value;
        saveState("Quote saved");
      });
    });
    root.append(card);
  });
}

function renderEvidence() {
  const root = document.querySelector("#evidenceList");
  root.innerHTML = "";
  for (const [title, hint] of evidenceItems) {
    const item = document.createElement("div");
    item.className = "evidence-item";
    item.innerHTML = `<strong>${title}</strong><span>${hint}</span>`;
    root.append(item);
  }
}

function updateCompletion() {
  const checked = checklistItems.filter(([id]) => state.checked[id]).length;
  const evidenceCount = Number(state.photoCount || 0) + Number(state.documentCount || 0);
  const base = checked / checklistItems.length;
  const bonus = Math.min(0.2, evidenceCount / 60);
  const percent = Math.min(100, Math.round((base + bonus) * 100));
  document.querySelector("#completion").textContent = `${percent}%`;
  document.querySelector("#meterFill").style.width = `${percent}%`;
}

function updateBrief() {
  const done = checklistItems.filter(([id]) => state.checked[id]).map(([, title]) => title);
  const open = checklistItems.filter(([id]) => !state.checked[id]).map(([, title]) => title);
  const quotes = state.quotes
    .filter((quote) => quote.company || quote.price || quote.scope || quote.warranty)
    .map((quote) => `- ${quote.company || "Unnamed contractor"} | ${quote.price || "No price"} | ${quote.scope || "No scope"} | ${quote.warranty || "No warranty notes"}`)
    .join("\n");

  document.querySelector("#briefOutput").value = [
    "Act as a homeowner advocate reviewing roof and property repair documentation.",
    "",
    `Goal: ${goals[state.goal]}`,
    `Property: ${state.property || "Not listed"}`,
    `Storm or leak date: ${state.eventDate || "Not listed"}`,
    `Main concern: ${state.concern || "Not listed"}`,
    `Urgency: ${state.urgency}`,
    "",
    `Completed checklist: ${done.length ? done.join(", ") : "None yet"}`,
    `Open checklist: ${open.length ? open.join(", ") : "None"}`,
    `Photos: ${state.photoCount || "0"}`,
    `Documents: ${state.documentCount || "0"}`,
    "",
    `Notes:\n${state.notes || "No notes yet."}`,
    "",
    `Quotes:\n${quotes || "No quotes entered yet."}`,
    "",
    "Return a concise action plan with risk flags, missing evidence, questions to ask, and the next three moves."
  ].join("\n");
}

function syncInputs() {
  for (const id of ["property", "eventDate", "notes", "photoCount", "documentCount", "urgency", "goal", "concern"]) {
    const input = document.querySelector(`#${id}`);
    input.value = state[id] || "";
  }
}

function bindInputs() {
  if (eventsBound) return;
  eventsBound = true;
  for (const id of ["property", "eventDate", "notes", "photoCount", "documentCount", "urgency", "goal", "concern"]) {
    const input = document.querySelector(`#${id}`);
    input.addEventListener("input", () => {
      state[id] = input.value;
      saveState("Saved locally");
    });
  }

  document.querySelector("#addQuote").addEventListener("click", () => {
    state.quotes.push({ company: "", price: "", scope: "", warranty: "" });
    renderQuotes();
    saveState("Quote added");
  });

  document.querySelector("#resetAll").addEventListener("click", () => {
    Object.assign(state, structuredClone(defaultState));
    localStorage.removeItem("toolBeltPwa");
    render();
    saveState("Reset complete");
  });

  document.querySelector("#copyBrief").addEventListener("click", copyBrief);
  document.querySelector("#copyBriefTop").addEventListener("click", copyBrief);
  document.querySelector("#downloadBrief").addEventListener("click", downloadBrief);
}

async function copyBrief() {
  updateBrief();
  await navigator.clipboard.writeText(document.querySelector("#briefOutput").value);
  saveState("Brief copied");
}

function downloadBrief() {
  updateBrief();
  const blob = new Blob([document.querySelector("#briefOutput").value], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "homeowner-tool-belt-brief.txt";
  link.click();
  URL.revokeObjectURL(url);
}

function bindNavigation() {
  if (navigationBound) {
    setView(state.activeView || "inspection");
    return;
  }
  navigationBound = true;
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });
  setView(state.activeView || "inspection");
}

function setView(view) {
  state.activeView = view;
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });
  document.querySelectorAll(".view").forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === view);
  });
  document.querySelector("#viewTitle").textContent = document.querySelector(`[data-view="${view}"]`).textContent;
  saveState("Saved locally");
}

function escapeHtml(value = "") {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function render() {
  renderChecklist();
  renderQuotes();
  renderEvidence();
  syncInputs();
  bindInputs();
  bindNavigation();
  updateBrief();
  updateCompletion();
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

render();
