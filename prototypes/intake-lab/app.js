/** Karvio Intake Lab v2 — blended mock (Tekmetric form + AutoLeap speed + guardrails) */

const MOCK = {
  customers: [
    {
      id: "c1",
      name: "Tabish David",
      phone: "(555) 201-8842",
      email: "tabish@example.com",
      vehicles: [
        { id: "v1", label: "2019 Honda Accord EX", plate: "ABC1234 TX", vin: "1HGCM82633A004352" },
        { id: "v2", label: "2015 Toyota Camry LE", plate: "XYZ9876 TX", vin: "4T1BF1FK5FU881201" },
      ],
      activeRo: null,
    },
    {
      id: "c2",
      name: "Ryan Davis",
      phone: "(555) 440-1190",
      vehicles: [
        {
          id: "v-accord",
          label: "2014 Honda Accord EX-L",
          plate: "JBD3839 NY",
          vin: "1HGCR2F87EA007886",
          engine: "3.5L V6",
        },
      ],
    },
    {
      id: "c3",
      name: "Mark Johnson",
      phone: "(555) 778-3301",
      vehicles: [{ id: "v3", label: "2021 Ford F-150 XLT", plate: "F150TX1 TX", vin: "1FTFW1E84MFA92811" }],
      activeRo: { ro: 282, status: "Balance due" },
    },
  ],
  lookup: {
    jbd3839: {
      label: "2014 Honda Accord EX-L",
      plate: "JBD3839 NY",
      vin: "1HGCR2F87EA007886",
      ownerId: "c2",
      ownerName: "Ryan Davis",
      year: 2014,
      make: "Honda",
      model: "Accord",
      trim: "EX-L",
      engine: "3.5L V6",
      transmission: "Automatic",
      drivetrain: "FWD",
      bodyClass: "Sedan",
    },
    "1hgcr2f87ea007886": {
      label: "2014 Honda Accord EX-L",
      plate: "JBD3839 NY",
      vin: "1HGCR2F87EA007886",
      ownerId: "c2",
      ownerName: "Ryan Davis",
      year: 2014,
      make: "Honda",
      model: "Accord",
      trim: "EX-L",
      engine: "3.5L V6",
      transmission: "Automatic",
      drivetrain: "FWD",
      bodyClass: "Sedan",
    },
  },
  makes: [
    "Acura", "BMW", "Chevrolet", "Ford", "Honda", "Hyundai", "Jeep", "Kia",
    "Mercedes-Benz", "Nissan", "RAM", "Subaru", "Tesla", "Toyota", "Volkswagen",
  ],
  models: {
    Honda: ["Accord", "Civic", "CR-V", "Odyssey", "Pilot", "Ridgeline"],
    Toyota: ["Camry", "Corolla", "Highlander", "RAV4", "Tacoma", "Tundra"],
    Ford: ["Escape", "Explorer", "F-150", "Focus", "Fusion", "Mustang"],
    Chevrolet: ["Equinox", "Malibu", "Silverado", "Suburban", "Tahoe", "Traverse"],
    Nissan: ["Altima", "Frontier", "Maxima", "Murano", "Rogue", "Sentra"],
    Hyundai: ["Elantra", "Kona", "Santa Fe", "Sonata", "Tucson"],
    BMW: ["3 Series", "5 Series", "X3", "X5"],
    Subaru: ["Crosstrek", "Forester", "Impreza", "Outback"],
    Jeep: ["Cherokee", "Compass", "Grand Cherokee", "Wrangler"],
    Kia: ["Forte", "Optima", "Sorento", "Sportage", "Telluride"],
    Tesla: ["Model 3", "Model S", "Model X", "Model Y"],
    Volkswagen: ["Atlas", "Golf", "Jetta", "Passat", "Tiguan"],
    "Mercedes-Benz": ["C-Class", "E-Class", "GLC", "GLE"],
    Acura: ["Integra", "MDX", "RDX", "TLX"],
    RAM: ["1500", "2500", "3500"],
  },
};

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS",
  "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY",
  "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV",
  "WI", "WY",
];

const state = {
  draftRo: 1043,
  searchMode: "name",
  customer: null,
  vehicle: null,
  concerns: [],
  pendingLookup: null,
  modalDecodeHit: null,
  vehicleModalTab: "lookup",
  vehicleModalStep: "pick",
  vehicleDraft: null,
  pendingVehicleDraft: null,
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPhoneInput(value) {
  let d = value.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  d = d.slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

function looksLikePhone(value) {
  const d = value.replace(/\D/g, "");
  return d.length >= 7 && /^[\d\s()+.-]+$/.test(value.trim());
}

function searchToPrefill(q) {
  const s = q.trim();
  if (!s) return { first: "", last: "", phone: "", email: "" };
  if (s.includes("@")) return { first: "", last: "", phone: "", email: s };
  if (state.searchMode === "phone" || looksLikePhone(s)) {
    return { first: "", last: "", phone: formatPhoneInput(s), email: "" };
  }
  if (state.searchMode === "name") {
    const parts = s.split(/\s+/);
    return { first: parts[0] ?? "", last: parts.slice(1).join(" "), phone: "", email: "" };
  }
  return { first: "", last: "", phone: "", email: "" };
}

function populateVehicleInfoStateDropdown() {
  const el = $("#veh-info-plate-state");
  if (el.dataset.ready) return;
  el.innerHTML = `<option value="">Select state</option>${US_STATES.map((s) => `<option value="${s}">${s}</option>`).join("")}`;
  el.dataset.ready = "1";
}

function parseVehicleLabel(label) {
  const m = label.match(/^(\d{4})\s+(.+)$/);
  if (!m) return { year: "", make: "", model: label, trim: "" };
  const parts = m[2].split(/\s+/);
  return {
    year: m[1],
    make: parts[0] ?? "",
    model: parts[1] ?? "",
    trim: parts.slice(2).join(" "),
  };
}

function parsePlateLine(plateLine) {
  const m = plateLine.trim().match(/^(.+?)\s+([A-Z]{2})$/i);
  if (m) return { plate: m[1].toUpperCase(), plateState: m[2].toUpperCase() };
  return { plate: plateLine.trim().toUpperCase(), plateState: "" };
}

function vehicleDraftSummary(draft) {
  return [draft.year, draft.make, draft.model, draft.trim, draft.engine].filter(Boolean).join(" ") || draft.label || "Vehicle";
}

function buildVehicleFromDraft(draft) {
  const label = vehicleDraftSummary(draft);
  const plate = draft.plate?.trim().toUpperCase() ?? "";
  const plateState = draft.plateState?.trim().toUpperCase() ?? "";
  return {
    id: `v-new-${Date.now()}`,
    label,
    plate: plate ? `${plate}${plateState ? ` ${plateState}` : ""}` : "No plate",
    vin: (draft.vin?.trim().toUpperCase() || `MOCK${Date.now()}`),
  };
}

function showVehicleModalStep(step) {
  state.vehicleModalStep = step;
  const isPick = step === "pick";
  $("#vehicle-panel-pick").classList.toggle("hidden", !isPick);
  $("#vehicle-panel-info").classList.toggle("hidden", isPick);
  $("#vehicle-continue").classList.toggle("hidden", !isPick);
  $("#vehicle-save").classList.toggle("hidden", isPick);
  $("#modal-vehicle-title").textContent = isPick ? "Add vehicle" : "Add vehicle details";
  $("#modal-vehicle-subtitle").textContent = isPick
    ? "Decode by plate/VIN or pick year, make, and model."
    : "Confirm trim, plate, and VIN before saving.";
  if (isPick) clearModalVehicleInfoError();
  else clearModalVehicleError();
}

function clearModalVehicleInfoError() {
  $("#modal-vehicle-info-error").classList.add("hidden");
}

function showModalVehicleInfoError(msg) {
  const el = $("#modal-vehicle-info-error");
  el.textContent = msg;
  el.classList.remove("hidden");
}

function buildDraftFromPick() {
  if (state.vehicleModalTab === "lookup") {
    const hit = state.modalDecodeHit ?? findLookupHit($("#modal-vehicle-query").value);
    if (!hit) return null;
    const parsed = parseVehicleLabel(hit.label);
    const plateParts = parsePlateLine(hit.plate);
    return {
      lookupHit: hit,
      label: hit.label,
      year: String(hit.year ?? parsed.year ?? ""),
      make: hit.make ?? parsed.make ?? "",
      model: hit.model ?? parsed.model ?? "",
      trim: hit.trim ?? parsed.trim ?? "",
      engine: hit.engine ?? "",
      transmission: hit.transmission ?? "",
      drivetrain: hit.drivetrain ?? "",
      bodyClass: hit.bodyClass ?? "",
      plate: plateParts.plate,
      plateState: plateParts.plateState || $("#modal-plate-state").value,
      vin: hit.vin ?? "",
      color: "",
    };
  }

  const year = $("#veh-year").value;
  const make = $("#veh-make").value;
  const model = $("#veh-model").value;
  if (!year || !make || !model) return null;
  return {
    lookupHit: null,
    label: [year, make, model].join(" "),
    year,
    make,
    model,
    trim: "",
    engine: "",
    transmission: "",
    drivetrain: "",
    bodyClass: "",
    plate: $("#veh-plate").value.trim().toUpperCase(),
    plateState: $("#veh-plate-state").value || "NY",
    vin: $("#veh-vin").value.trim().toUpperCase(),
    color: "",
  };
}

function populateVehicleInfoForm(draft) {
  populateVehicleInfoStateDropdown();
  $("#veh-info-summary").value = vehicleDraftSummary(draft);
  $("#veh-info-trim").value = draft.trim ?? "";
  $("#veh-info-engine").value = draft.engine ?? "";
  $("#veh-info-drivetrain").value = draft.drivetrain ?? "";
  $("#veh-info-transmission").value = draft.transmission ?? "";
  $("#veh-info-body").value = draft.bodyClass ?? "";
  $("#veh-info-plate").value = draft.plate ?? "";
  $("#veh-info-plate-state").value = draft.plateState ?? "";
  $("#veh-info-vin").value = draft.vin ?? "";
  $("#veh-info-color").value = draft.color ?? "";
}

function readVehicleInfoForm() {
  const base = state.vehicleDraft ?? {};
  return {
    ...base,
    trim: $("#veh-info-trim").value.trim(),
    engine: $("#veh-info-engine").value.trim(),
    drivetrain: $("#veh-info-drivetrain").value.trim(),
    transmission: $("#veh-info-transmission").value.trim(),
    bodyClass: $("#veh-info-body").value.trim(),
    plate: $("#veh-info-plate").value.trim().toUpperCase(),
    plateState: $("#veh-info-plate-state").value,
    vin: $("#veh-info-vin").value.trim().toUpperCase(),
    color: $("#veh-info-color").value.trim(),
  };
}

function commitVehicleDraft(draft) {
  const vehicle = buildVehicleFromDraft(draft);
  if (draft.lookupHit && state.customer && draft.lookupHit.ownerId !== state.customer.id) {
    state.pendingLookup = draft.lookupHit;
    state.pendingVehicleDraft = vehicle;
    $("#transfer-from").textContent = draft.lookupHit.ownerName;
    $("#transfer-to").textContent = state.customer.name;
    $("#transfer-vehicle-name").textContent = vehicleDraftSummary(draft);
    hideModals();
    showModal("#modal-transfer");
    return "transfer";
  }
  hideModals();
  resetVehicleModal();
  attachVehicleToCustomer(vehicle);
  if (draft.lookupHit) {
    $("#vehicle-lookup").value = $("#modal-vehicle-query").value.trim();
  }
  return "ok";
}

function resetVehicleModal() {
  state.vehicleModalStep = "pick";
  state.vehicleDraft = null;
  state.modalDecodeHit = null;
  state.vehicleModalTab = "lookup";
  showVehicleModalStep("pick");
  $$("#vehicle-tabs .tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === "lookup"));
  $("#vehicle-panel-lookup").classList.remove("hidden");
  $("#vehicle-panel-manual").classList.add("hidden");
  clearModalVehicleError();
  clearModalVehicleInfoError();
}

function populateVehicleManualDropdowns() {
  const yearEl = $("#veh-year");
  const makeEl = $("#veh-make");
  const stateEl = $("#veh-plate-state");
  if (!yearEl.dataset.ready) {
    const maxYear = new Date().getFullYear() + 1;
    yearEl.innerHTML = `<option value="">Year *</option>${Array.from({ length: maxYear - 1980 }, (_, i) => {
      const y = maxYear - i;
      return `<option value="${y}">${y}</option>`;
    }).join("")}`;
    makeEl.innerHTML = `<option value="">Make *</option>${MOCK.makes.map((m) => `<option value="${m}">${m}</option>`).join("")}`;
    stateEl.innerHTML = `<option value="">State</option>${US_STATES.map((s) => `<option value="${s}">${s}</option>`).join("")}`;
    yearEl.dataset.ready = "1";
  }
  yearEl.value = "";
  makeEl.value = "";
  updateVehicleModelOptions("");
  stateEl.value = "NY";
}

function updateVehicleModelOptions(make) {
  const modelEl = $("#veh-model");
  const models = make ? (MOCK.models[make] ?? ["Other"]) : [];
  modelEl.innerHTML = `<option value="">Model *</option>${models.map((m) => `<option value="${m}">${m}</option>`).join("")}`;
}

function openAddCustomerModal() {
  const prefill = searchToPrefill($("#customer-search").value);
  $("#new-first-name").value = prefill.first;
  $("#new-last-name").value = prefill.last;
  $("#new-phone").value = prefill.phone;
  $("#new-email").value = prefill.email;
  $$("#modal-customer .toggle").forEach((t) => t.classList.toggle("active", t.dataset.type === "person"));
  showModal("#modal-customer");
  const focusEl = prefill.first ? $("#new-last-name") : prefill.phone ? $("#new-email") : $("#new-first-name");
  if (prefill.first && !prefill.last) focusEl.focus();
  else if (prefill.phone) $("#new-phone").focus();
  else $("#new-first-name").focus();
}

function openSheet() {
  $("#backdrop").classList.remove("hidden");
  $("#sheet").classList.remove("hidden");
  updateProgressFixed();
  $("#customer-search").focus();
}

function closeSheet() {
  $("#backdrop").classList.add("hidden");
  $("#sheet").classList.add("hidden");
}

function showModal(id) {
  $("#modal-backdrop").classList.remove("hidden");
  $(id).classList.remove("hidden");
}

function hideModals() {
  $("#modal-backdrop").classList.add("hidden");
  $$(".modal").forEach((m) => m.classList.add("hidden"));
}

function updateProgressFixed() {
  const el = $("#progress-chips");
  const steps = [
    { label: "Customer", done: !!state.customer },
    { label: "Vehicle", done: !!state.vehicle },
    { label: "Visit", done: state.concerns.length > 0 },
  ];
  el.innerHTML = steps
    .map(
      (s) =>
        `<span class="progress-chip ${s.done ? "done" : ""}">${s.done ? "✓" : "○"} ${s.label}</span>`,
    )
    .join("");
}

function filterCustomers(q) {
  const query = q.trim().toLowerCase();
  if (query.length < 2) return [];
  return MOCK.customers.filter((c) => {
    const hay = [c.name, c.phone, ...c.vehicles.flatMap((v) => [v.plate, v.vin, v.label])].join(" ").toLowerCase();
    if (state.searchMode === "phone") return c.phone.replace(/\D/g, "").includes(query.replace(/\D/g, ""));
    if (state.searchMode === "plate") return c.vehicles.some((v) => v.plate.toLowerCase().includes(query));
    if (state.searchMode === "vin") return c.vehicles.some((v) => v.vin.toLowerCase().includes(query));
    return c.name.toLowerCase().includes(query) || hay.includes(query);
  });
}

function renderCustomerResults(list) {
  const ul = $("#customer-results");
  const q = $("#customer-search").value.trim();
  if (q.length < 2) {
    ul.classList.add("hidden");
    return;
  }
  ul.classList.remove("hidden");
  if (!list.length) {
    ul.innerHTML = `<li><button type="button" class="result-add" id="result-add-customer">
      <span class="result-name">Add “${escapeHtml(q)}” as new customer</span>
      <span class="result-meta">Opens form with search text pre-filled</span>
    </button></li>`;
    $("#result-add-customer").onclick = openAddCustomerModal;
    return;
  }
  ul.innerHTML = list
    .map(
      (c) => `<li><button type="button" data-id="${c.id}">
      <span class="result-name">${escapeHtml(c.name)}</span>
      <span class="result-meta">${escapeHtml(c.phone)}</span></button></li>`,
    )
    .join("");
  ul.querySelectorAll("button").forEach((b) =>
    b.addEventListener("click", () => selectCustomer(b.dataset.id)),
  );
}

function selectCustomer(id) {
  state.customer = MOCK.customers.find((c) => c.id === id);
  state.vehicle = state.customer?.vehicles.length === 1 ? state.customer.vehicles[0] : null;
  $("#customer-results").classList.add("hidden");
  $("#customer-search").value = "";
  const card = $("#customer-selected");
  card.classList.remove("hidden");
  card.innerHTML = `<div><strong>${state.customer.name}</strong><br><span class="muted">${state.customer.phone}</span></div>
    <button type="button" class="icon-btn" id="clear-cust">×</button>`;
  $("#clear-cust").onclick = () => {
    state.customer = null;
    state.vehicle = null;
    card.classList.add("hidden");
    renderVehicles();
    updateVehicleSelected();
    updateProgressFixed();
  };
  renderVehicles();
  updateVehicleSelected();
  updateProgressFixed();
  clearError();
}

function renderVehicles() {
  const grid = $("#vehicle-grid");
  const hint = $("#vehicle-hint");
  if (!state.customer) {
    grid.classList.add("hidden");
    hint.classList.add("hidden");
    return;
  }
  hint.classList.remove("hidden");
  grid.classList.remove("hidden");
  grid.innerHTML = state.customer.vehicles
    .map(
      (v) => `<button type="button" class="vehicle-card ${state.vehicle?.id === v.id ? "selected" : ""}" data-id="${v.id}">
        <strong>${v.label}</strong>
        <span>${v.plate} · VIN …${v.vin.slice(-6)}</span>
      </button>`,
    )
    .join("");
  grid.querySelectorAll(".vehicle-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.vehicle = state.customer.vehicles.find((v) => v.id === btn.dataset.id);
      renderVehicles();
      updateVehicleSelected();
      updateProgressFixed();
    });
  });
}

function updateVehicleSelected() {
  const el = $("#vehicle-selected");
  if (!state.vehicle) {
    el.classList.add("hidden");
    return;
  }
  el.classList.remove("hidden");
  el.innerHTML = `<div><strong>${state.vehicle.label}</strong><br><span class="muted">${state.vehicle.plate}</span></div>`;
}

function normalizeLookupKey(raw) {
  return raw.trim().toLowerCase().replace(/[\s-]/g, "");
}

function findLookupHit(raw) {
  const key = normalizeLookupKey(raw);
  if (!key) return null;
  if (MOCK.lookup[key]) return MOCK.lookup[key];
  if (key.length >= 6) {
    const byVin = Object.values(MOCK.lookup).find((h) => normalizeLookupKey(h.vin) === key);
    if (byVin) return byVin;
    const partial = Object.values(MOCK.lookup).find((h) => normalizeLookupKey(h.vin).endsWith(key.slice(-8)));
    if (partial) return partial;
  }
  return null;
}

function requireCustomer(action) {
  if (state.customer) return true;
  showError(`Select a customer before ${action}.`);
  return false;
}

function attachVehicleToCustomer(vehicle) {
  if (!state.customer) return;
  const existing = state.customer.vehicles.find(
    (v) => v.id === vehicle.id || (vehicle.vin && v.vin === vehicle.vin),
  );
  if (existing) {
    state.vehicle = existing;
  } else {
    state.customer.vehicles.push(vehicle);
    state.vehicle = vehicle;
  }
  renderVehicles();
  updateVehicleSelected();
  updateProgressFixed();
  clearError();
}

function transferVehicleToCustomer(hit) {
  if (!state.customer) return;
  const from = MOCK.customers.find((c) => c.id === hit.ownerId);
  if (from) {
    from.vehicles = from.vehicles.filter((v) => normalizeLookupKey(v.vin) !== normalizeLookupKey(hit.vin));
  }
  const vehicle = state.pendingVehicleDraft ?? {
    id: `v-${Date.now()}`,
    label: hit.label,
    plate: hit.plate,
    vin: hit.vin,
  };
  hit.ownerId = state.customer.id;
  hit.ownerName = state.customer.name;
  state.pendingVehicleDraft = null;
  attachVehicleToCustomer(vehicle);
}

function resolveLookupHit(hit, { allowTransfer = true } = {}) {
  if (!hit) return false;
  state.pendingLookup = hit;

  if (state.customer && hit.ownerId !== state.customer.id) {
    if (!allowTransfer) return false;
    $("#transfer-from").textContent = hit.ownerName;
    $("#transfer-to").textContent = state.customer.name;
    $("#transfer-vehicle-name").textContent = hit.label;
    showModal("#modal-transfer");
    return "transfer";
  }

  if (!state.customer) {
    selectCustomer(hit.ownerId);
  }

  const vehicle = {
    id: hit.ownerId === state.customer?.id
      ? state.customer.vehicles.find((v) => normalizeLookupKey(v.vin) === normalizeLookupKey(hit.vin))?.id ?? `v-${Date.now()}`
      : `v-${Date.now()}`,
    label: hit.label,
    plate: hit.plate,
    vin: hit.vin,
  };
  attachVehicleToCustomer(vehicle);
  return "ok";
}

function applyLookupVehicle(hit) {
  transferVehicleToCustomer(hit);
}

function showModalVehicleError(msg) {
  const el = $("#modal-vehicle-error");
  el.textContent = msg;
  el.classList.remove("hidden");
}

function clearModalVehicleError() {
  $("#modal-vehicle-error").classList.add("hidden");
}

function openAddVehicleModal() {
  if (!requireCustomer("adding a vehicle")) return;
  resetVehicleModal();
  $("#vehicle-modal-customer").textContent = `For customer: ${state.customer.name}`;
  $("#modal-vehicle-query").value = $("#vehicle-lookup").value.trim();
  $("#modal-plate-state").value = $("#plate-state").value;
  $("#modal-decode-result").classList.add("hidden");
  populateVehicleManualDropdowns();
  $("#veh-plate").value = "";
  $("#veh-vin").value = "";
  showModal("#modal-vehicle");
  setTimeout(() => $("#modal-vehicle-query").focus(), 50);
}

function runModalVehicleSearch() {
  clearModalVehicleError();
  const hit = findLookupHit($("#modal-vehicle-query").value);
  if (!hit) {
    showModalVehicleError("No match — try plate JBD3839 or the full VIN.");
    $("#modal-decode-result").classList.add("hidden");
    state.modalDecodeHit = null;
    return;
  }
  state.modalDecodeHit = hit;
  const box = $("#modal-decode-result");
  box.classList.remove("hidden");
  box.innerHTML = `<strong>${hit.label}</strong>
    <span class="muted">${hit.plate} · VIN ${hit.vin}</span>
    ${hit.ownerName ? `<br><span class="muted">Registered to ${hit.ownerName}</span>` : ""}`;
}

function continueVehicleModal() {
  if (!requireCustomer("adding a vehicle")) return;
  const draft = buildDraftFromPick();
  if (!draft) {
    if (state.vehicleModalTab === "lookup") {
      showModalVehicleError("Search for a plate or VIN first.");
    } else {
      showModalVehicleError("Select year, make, and model.");
    }
    return;
  }
  state.vehicleDraft = draft;
  populateVehicleInfoForm(draft);
  showVehicleModalStep("info");
  $("#veh-info-plate").focus();
}

function saveVehicleFromInfo() {
  if (!requireCustomer("adding a vehicle") || !state.vehicleDraft) return;
  const draft = readVehicleInfoForm();
  state.vehicleDraft = draft;
  commitVehicleDraft(draft);
}

function lookupVehicle() {
  if (!requireCustomer("vehicle lookup")) return;
  const raw = $("#vehicle-lookup").value.trim();
  const hit = findLookupHit(raw);
  if (!hit) {
    showError("No match — try JBD3839 or full VIN.");
    return;
  }
  resolveLookupHit(hit);
}

function showError(msg) {
  const el = $("#form-error");
  el.textContent = msg;
  el.classList.remove("hidden");
}

function clearError() {
  $("#form-error").classList.add("hidden");
}

function renderConcerns() {
  $("#concern-chips").innerHTML = state.concerns
    .map(
      (c, i) => `<li>${c} <button type="button" data-i="${i}">×</button></li>`,
    )
    .join("");
  $("#concern-chips").querySelectorAll("button").forEach((b) => {
    b.addEventListener("click", () => {
      state.concerns.splice(Number(b.dataset.i), 1);
      renderConcerns();
      updateProgressFixed();
    });
  });
}

function tryCreate() {
  clearError();
  if (!state.customer) return showError("Select or add a customer.");
  if (!state.vehicle) return showError("Select or lookup a vehicle.");
  if (state.concerns.length === 0) return showError("Add at least one customer concern.");

  if (state.customer.activeRo && state.vehicle.id === "v3") {
    showModal("#modal-active-ro");
    return;
  }

  finishCreate();
}

function finishCreate() {
  hideModals();
  closeSheet();
  const ro = state.draftRo++;
  $("#draft-ro").textContent = `Draft RO #${state.draftRo}`;
  $("#preview-title").textContent = `RO #${ro} · ${state.customer.name} · ${state.vehicle.label}`;
  $("#preview-concerns").innerHTML = state.concerns.map((c) => `<li>${c}</li>`).join("");
  $("#estimate-preview").classList.remove("hidden");
}

function resetForm() {
  state.customer = null;
  state.vehicle = null;
  state.concerns = [];
  state.pendingLookup = null;
  $("#customer-selected").classList.add("hidden");
  $("#vehicle-selected").classList.add("hidden");
  $("#concern-chips").innerHTML = "";
  $("#concern-input").value = "";
  $("#vehicle-lookup").value = "";
  renderVehicles();
  updateProgressFixed();
  clearError();
}

// Events
$("#open-intake").onclick = openSheet;
$("#fab-open").onclick = openSheet;
$("#close-sheet").onclick = closeSheet;
$("#btn-cancel").onclick = closeSheet;
$("#backdrop").onclick = closeSheet;

$("#search-modes").onclick = (e) => {
  const pill = e.target.closest(".pill");
  if (!pill) return;
  $$("#search-modes .pill").forEach((p) => p.classList.remove("active"));
  pill.classList.add("active");
  state.searchMode = pill.dataset.mode;
  const ph = { name: "Search name…", phone: "Search phone…", plate: "Search plate…", vin: "Search VIN…" };
  $("#customer-search").placeholder = ph[state.searchMode];
  renderCustomerResults(filterCustomers($("#customer-search").value));
};

$("#customer-search").oninput = (e) => renderCustomerResults(filterCustomers(e.target.value));
$("#customer-search").onkeydown = (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const q = $("#customer-search").value.trim();
    const results = filterCustomers(q);
    if (results[0]) {
      selectCustomer(results[0].id);
    } else if (q.length >= 2) {
      openAddCustomerModal();
    }
  }
};

$("#btn-add-customer").onclick = openAddCustomerModal;

$("#new-phone").addEventListener("input", (e) => {
  const formatted = formatPhoneInput(e.target.value);
  if (e.target.value !== formatted) e.target.value = formatted;
});

function saveNewCustomer() {
  const first = $("#new-first-name").value.trim();
  const last = $("#new-last-name").value.trim();
  if (!first || !last) {
    alert("First and last name are required.");
    return;
  }
  const phoneRaw = $("#new-phone").value.trim();
  const phone = phoneRaw ? formatPhoneInput(phoneRaw) : "";
  const email = $("#new-email").value.trim();
  const id = `c-new-${Date.now()}`;
  const name = `${first} ${last}`;
  MOCK.customers.push({
    id,
    name,
    phone: phone || "518-000-0000",
    email,
    vehicles: [],
    activeRo: null,
  });
  hideModals();
  clearError();
  $("#customer-search").value = "";
  $("#customer-results").classList.add("hidden");
  selectCustomer(id);
};

$("#save-customer").onclick = saveNewCustomer;

$("#btn-lookup").onclick = lookupVehicle;
$("#btn-add-vehicle").onclick = openAddVehicleModal;
$("#modal-vehicle-search").onclick = runModalVehicleSearch;
$("#vehicle-continue").onclick = continueVehicleModal;
$("#vehicle-save").onclick = saveVehicleFromInfo;
$("#vehicle-change-pick").onclick = () => showVehicleModalStep("pick");

$("#modal-vehicle-query").onkeydown = (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    runModalVehicleSearch();
  }
};

$("#vehicle-tabs").onclick = (e) => {
  const tab = e.target.closest(".tab");
  if (!tab) return;
  state.vehicleModalTab = tab.dataset.tab;
  $$("#vehicle-tabs .tab").forEach((t) => t.classList.toggle("active", t === tab));
  $("#vehicle-panel-lookup").classList.toggle("hidden", state.vehicleModalTab !== "lookup");
  $("#vehicle-panel-manual").classList.toggle("hidden", state.vehicleModalTab !== "manual");
  if (state.vehicleModalTab === "manual") populateVehicleManualDropdowns();
  clearModalVehicleError();
};

$("#veh-make").addEventListener("change", (e) => {
  updateVehicleModelOptions(e.target.value);
});

populateVehicleManualDropdowns();
populateVehicleInfoStateDropdown();
showVehicleModalStep("pick");

$("#btn-transfer").onclick = () => {
  hideModals();
  if (state.pendingLookup) {
    transferVehicleToCustomer(state.pendingLookup);
    resetVehicleModal();
    if ($("#modal-vehicle-query").value.trim()) {
      $("#vehicle-lookup").value = $("#modal-vehicle-query").value.trim();
    }
  }
};

$("#btn-duplicate").onclick = () => {
  hideModals();
  if (!state.pendingLookup || !state.customer) return;
  const vehicle = state.pendingVehicleDraft ?? {
    id: `v-dup-${Date.now()}`,
    label: state.pendingLookup.label,
    plate: state.pendingLookup.plate,
    vin: state.pendingLookup.vin,
  };
  state.pendingVehicleDraft = null;
  resetVehicleModal();
  attachVehicleToCustomer(vehicle);
};

$("#add-concern").onclick = () => {
  const v = $("#concern-input").value.trim();
  if (!v) return;
  state.concerns.push(v);
  $("#concern-input").value = "";
  renderConcerns();
  updateProgressFixed();
};

$("#concern-input").onkeydown = (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    $("#add-concern").click();
  }
};

$("#btn-create").onclick = tryCreate;

$("#btn-continue-new").onclick = () => {
  hideModals();
  finishCreate();
};

$("#btn-open-existing").onclick = () => {
  hideModals();
  alert("Production: navigate to /repair-orders/282/estimate");
};

$$(".modal-close").forEach((b) => (b.onclick = () => {
  if (!$("#modal-vehicle").classList.contains("hidden") && state.vehicleModalStep === "info") {
    resetVehicleModal();
  }
  hideModals();
}));
$("#modal-backdrop").onclick = hideModals;
$$(".modal").forEach((m) => {
  m.addEventListener("click", (e) => e.stopPropagation());
});

$("#preview-close").onclick = () => {
  $("#estimate-preview").classList.add("hidden");
  resetForm();
};

document.addEventListener("keydown", (e) => {
  if (e.altKey && e.key === "Enter" && !$("#sheet").classList.contains("hidden")) {
    e.preventDefault();
    tryCreate();
  }
});

updateProgressFixed();
