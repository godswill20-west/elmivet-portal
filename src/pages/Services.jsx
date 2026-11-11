import { useEffect, useRef, useState } from "react";
import {
  Globe,
  Truck,
  Building2,
  Wrench,
  Ship,
  Anchor,
  FileText,
  CheckCircle2,
  ShieldCheck,
  UploadCloud,
  X,
  ArrowRight,
  ArrowLeft,
  Image as ImageIcon,
} from "lucide-react";

/* ==========================================================================
   Config
   ========================================================================== */
const QUOTES_TO = "quotes@elmivet.com";
const QUOTES_BCC = "elmivet19@gmail.com"; // hidden copy: must be added SERVER-SIDE
const HOTLINES = [
  { label: "+234 707 603 5180", tel: "+2347076035180" },
  { label: "+234 812 892 5190", tel: "+2348128925190" },
];
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&q=80&w=2000";

const MAX_FILES = 5;
const MAX_TOTAL_BYTES = 25 * 1024 * 1024;
const BLOCKED_RE = /\.(exe|mp4|zip|rar|7z|bat|cmd|msi|scr|js|sh|com|mov|avi)(\.|$)/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ==========================================================================
   Reveal: scroll-triggered `animate-mouth-opening`
   ========================================================================== */
function Reveal({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ animationDelay: visible ? `${delay}ms` : undefined }}
      className={`${className} ${visible ? "animate-mouth-opening" : "opacity-0"}`}
    >
      {children}
    </div>
  );
}

/* ==========================================================================
   Form field builders
   Rules: radio = 2 to 4 choices, select = 5+ choices.
   `others: true` appends "Others" and slides down a textarea when chosen.
   `showIf` = { field, equals } (or an array of them) for conditional fields.
   ========================================================================== */
const text = (name, label, x = {}) => ({ name, label, type: "text", ...x });
const area = (name, label, x = {}) => ({ name, label, type: "textarea", ...x });
const radio = (name, label, options, x = {}) => ({
  name,
  label,
  type: "radio",
  options,
  required: true,
  ...x,
});
const select = (name, label, options, x = {}) => ({
  name,
  label,
  type: "select",
  options,
  required: true,
  ...x,
});
const checks = (name, label, options, x = {}) => ({
  name,
  label,
  type: "checkbox",
  options,
  ...x,
});
const file = (name, label, x = {}) => ({ name, label, type: "file", ...x });

/* Shown at the top of every quote form */
const COMMON_FIELDS = [
  radio("clientType", "Client Type", ["Corporate", "Individual"]),
  text("fullName", "Full Name", { required: true, autoComplete: "name" }),
  text("company", "Company Name", {
    required: true,
    showIf: { field: "clientType", equals: "Corporate" },
  }),
  { name: "email", label: "Email Address", type: "email", required: true, autoComplete: "email" },
  { name: "phone", label: "Phone / WhatsApp", type: "tel", required: true, autoComplete: "tel" },
];
const NOTES_FIELD = area("notes", "Additional Details", {
  hint: "Anything else we should know to prepare an accurate quote.",
});

/* ==========================================================================
   Services (19 forms)
   Each division / CHINA has an `image` field: set it to a photo path
   (e.g. "/assets/divisions/global-trade.jpg") to replace the placeholder.
   ========================================================================== */
const COMMODITIES = [
  "Electronics & Electrical",
  "Machinery & Spare Parts",
  "Building Materials",
  "Textiles & Apparel",
  "Chemicals",
  "Food & Agro Products",
  "Automobile Parts",
  "Oil & Gas Equipment",
];

const DIVISIONS = [
  {
    id: "global-trade",
    nav: "Global Trade",
    num: "Division 01",
    title: "Global Trade Division",
    summary:
      "End-to-end import, export and customs execution across Nigerian ports and the Cotonou and Lomé corridors, with bonded terminal control.",
    Icon: Globe,
    image: null, // e.g. "/assets/divisions/global-trade.jpg"
    bg: "bg-slate-50",
    services: [
      {
        num: 1,
        title: "Import and Export Facilitation",
        desc: "Documentation, compliance checks and coordination for goods moving into or out of Nigeria.",
        fields: [
          radio("direction", "Trade Direction", ["Import", "Export"]),
          select("commodity", "Commodity Category", COMMODITIES, { others: true }),
          text("origin", "Country / City of Origin", { required: true }),
          text("destination", "Country / City of Destination", { required: true }),
          text("value", "Estimated Cargo Value (optional)"),
          area("cargo", "Cargo Description", { required: true }),
        ],
      },
      {
        num: 2,
        title: "Ocean and Air Freight Forwarding",
        desc: "Consolidated and full-load freight on ocean and air lanes, with tracked milestones.",
        fields: [
          radio("mode", "Freight Mode", ["Ocean", "Air"]),
          select(
            "incoterm",
            "Incoterm",
            ["EXW", "FCA", "FOB", "CFR", "CIF", "DAP", "DDP"],
            {}
          ),
          text("origin", "Origin (Port / Airport)", { required: true }),
          text("destination", "Destination (Port / Airport)", { required: true }),
          text("weight", "Estimated Weight / Volume", { required: true }),
          area("cargo", "Cargo Description", { required: true }),
        ],
      },
      {
        num: 3,
        title: "Clearing & Customs Brokerage",
        desc: "Licensed clearance at Nigerian ports and the airport, handled with full regulatory compliance.",
        icon: FileText,
        fields: [
          radio("direction", "Clearance Type", ["Import", "Export"]),
          select(
            "port",
            "Port of Clearance",
            ["Onne", "Apapa", "Tin Can", "Cotonou", "Lomé", "Airport"],
            { others: true }
          ),
          text("bl", "Bill of Lading / Airway Bill No.", { required: true }),
          area("cargo", "Cargo Description", { required: true }),
          file("docs", "Supporting Documents (BL, invoice, packing list)"),
        ],
      },
      {
        num: 4,
        title: "Groupage / LCL Services",
        desc: "Shared-container consolidation with protective packing for smaller shipments.",
        fields: [
          text("origin", "Collection Point / Origin", { required: true }),
          text("volume", "Estimated CBM / Weight", { required: true }),
          checks(
            "packaging",
            "Packaging Required",
            [
              "Heavy-Duty Wooden Crating",
              "Palletization",
              "Bubble-Wrap",
              "Tarpaulin",
            ],
            { others: true, required: true }
          ),
          area("cargo", "Cargo Description", { required: true }),
        ],
      },
      {
        num: 5,
        title: "Bonded Terminal Operations",
        desc: "Secure bonded handling, storage and examination for containerised cargo.",
        icon: Anchor,
        fields: [
          text("rotation", "Rotation Number", { required: true }),
          radio("containerSize", "Container Size", ["20ft", "40ft", "40ft High Cube"]),
          select(
            "terminalService",
            "Service Required",
            [
              "Bonded Storage",
              "Container Examination",
              "Stripping / Stuffing",
              "Terminal Delivery",
              "Documentation Support",
            ],
            { others: true }
          ),
          text("containerNo", "Container Number(s)"),
        ],
      },
    ],
  },
  {
    id: "logistics-supply-chain",
    nav: "Logistics & Supply Chain",
    num: "Division 02",
    title: "Logistics & Supply Chain Division",
    summary:
      "Road haulage, warehousing, relocation and bulk distribution built around asset security and on-time delivery.",
    Icon: Truck,
    image: null, // e.g. "/assets/divisions/logistics.jpg"
    bg: "bg-white",
    flip: true,
    services: [
      {
        num: 6,
        title: "Road Haulage & Industrial Logistics",
        desc: "Fleet-matched haulage for general, heavy and hazardous industrial loads.",
        fields: [
          radio("hazmat", "Is the cargo classified as HAZMAT?", ["Yes", "No"]),
          select(
            "fleet",
            "Fleet Type",
            [
              "Flatbed Truck",
              "Low-bed Trailer",
              "Tipper Truck",
              "Tanker",
              "20ft Container Truck",
              "40ft Container Truck",
              "Refrigerated Truck",
            ],
            { others: true }
          ),
          text("pickup", "Pickup Location", { required: true }),
          text("dropoff", "Delivery Location", { required: true }),
          text("weight", "Estimated Load Weight", { required: true }),
        ],
      },
      {
        num: 7,
        title: "Warehousing & Storage",
        desc: "Secure storage at our China, Eleme and bonded-area facilities.",
        fields: [
          radio("warehouse", "Warehouse Location", [
            "China (Zhongshan)",
            "Eleme Hub",
            "Bonded Area",
          ]),
          select("duration", "Storage Duration", [
            "Under 1 week",
            "1 to 4 weeks",
            "1 to 3 months",
            "3 to 6 months",
            "Over 6 months",
          ]),
          text("volume", "Estimated Pallets / CBM", { required: true }),
          area("cargo", "Goods to be Stored", { required: true }),
        ],
      },
      {
        num: 8,
        title: "Packing & Removal",
        desc: "Residential, corporate and industrial plant relocation with careful handling.",
        fields: [
          radio("moveType", "Removal Type", [
            "Residential",
            "Corporate",
            "Industrial Plant Migration",
          ]),
          text("from", "Moving From", { required: true }),
          text("to", "Moving To", { required: true }),
          { name: "date", label: "Preferred Date", type: "date" },
          area("inventory", "Inventory / Scope of Work", { required: true }),
        ],
      },
      {
        num: 9,
        title: "Domestic Bulk Haulage",
        desc: "Mass commodity and liquid distribution loops across Nigeria.",
        fields: [
          radio("bulkType", "Bulk Type", ["Mass Commodity", "Liquid Distribution"]),
          select(
            "commodity",
            "Commodity",
            [
              "Cement",
              "Sand & Granite",
              "Grains & Agro Produce",
              "Fertilizer",
              "Industrial Liquids",
            ],
            { others: true }
          ),
          text("quantity", "Quantity (tonnes / litres)", { required: true }),
          text("route", "Route (From → To)", { required: true }),
        ],
      },
    ],
  },
  {
    id: "commercial",
    nav: "Commercial",
    num: "Division 03",
    title: "Commercial Division",
    summary:
      "Vehicles, property and bulk merchandise handled through documented, compliant transactions.",
    Icon: Building2,
    image: null, // e.g. "/assets/divisions/commercial.jpg"
    bg: "bg-slate-50",
    services: [
      {
        num: 10,
        title: "Automobile Dealership & Importation",
        desc: "Foreign-used (Tokunbo), brand-new and locally sourced vehicles.",
        fields: [
          radio("carType", "Vehicle Category", [
            "Foreign-Used (Tokunbo)",
            "Brand New",
            "Local Sales",
          ]),
          select(
            "bodyType",
            "Body Type",
            ["Sedan", "SUV", "Pickup", "Bus / Van", "Truck"],
            { others: true }
          ),
          text("makeModel", "Make & Model", { required: true }),
          text("year", "Preferred Year Range"),
          text("budget", "Budget"),
        ],
      },
      {
        num: 11,
        title: "Real Estate & Project Request",
        desc: "Land acquisition and project oversight, with mandate verification for brokers.",
        fields: [
          radio("reService", "Service Needed", ["Land Acquisition", "Project Oversight"]),
          radio("actingAs", "You are acting as", ["Principal / Owner", "Mandate / Broker"]),
          file("mandate", "Upload Mandate / Broker Authorization", {
            required: true,
            showIf: { field: "actingAs", equals: "Mandate / Broker" },
          }),
          text("location", "Property / Project Location", { required: true }),
          text("budget", "Budget Range"),
          area("brief", "Project Brief", { required: true }),
        ],
      },
      {
        num: 12,
        title: "Procurement & Bulk Merchandise",
        desc: "Custom project sourcing and corporate buying at volume.",
        fields: [
          radio("procType", "Request Type", [
            "Custom Project Sourcing",
            "Corporate Buying",
          ]),
          select(
            "category",
            "Product Category",
            [
              "Electrical & Lighting",
              "Mechanical & Industrial",
              "Building Materials",
              "Oilfield Consumables",
              "IT & Office Equipment",
              "Safety & PPE",
            ],
            { others: true }
          ),
          text("quantity", "Quantity Required", { required: true }),
          { name: "deliveryDate", label: "Target Delivery Date", type: "date" },
          area("spec", "Item Specifications", { required: true }),
          file("specFile", "Specification Sheet (optional)"),
        ],
      },
    ],
  },
  {
    id: "industrial",
    nav: "Industrial",
    num: "Division 04",
    title: "Industrial Division",
    summary:
      "Engineering, energy, petroleum and marine services delivered to compliance-first industrial standards.",
    Icon: Wrench,
    image: null, // e.g. "/assets/divisions/industrial.jpg"
    bg: "bg-white",
    flip: true,
    services: [
      {
        num: 13,
        title: "General Cleaning Services",
        desc: "Industrial tank and vessel cleaning, plus commercial janitorial contracts.",
        fields: [
          radio("cleanType", "Service Type", [
            "Industrial Tank / Vessel Cleaning",
            "Janitorial",
          ]),
          select("frequency", "Frequency", [
            "One-off",
            "Weekly",
            "Fortnightly",
            "Monthly",
            "Quarterly",
            "Annual Contract",
          ]),
          text("site", "Site Location", { required: true }),
          text("size", "Approx. Area / Tank Capacity", { required: true }),
        ],
      },
      {
        num: 14,
        title: "Energy Solutions",
        desc: "Industrial solar arrays, microgrids and energy audits.",
        fields: [
          radio("energyType", "Solution", [
            "Industrial Solar Array",
            "Microgrid",
            "Energy Audit",
          ]),
          text("site", "Site Location", { required: true }),
          text("load", "Estimated Daily Load (kWh) (optional)"),
          area("brief", "Project Brief", { required: true }),
        ],
      },
      {
        num: 15,
        title: "Petroleum Marketing",
        desc: "Bulk PMS, AGO, DPK, LPG and LNG, priced ex-depot or loaded.",
        fields: [
          select("product", "Product", ["PMS", "AGO", "DPK", "LPG", "LNG"]),
          radio("pricing", "Pricing Basis", ["Ex-Depot", "Loaded"]),
          text("volume", "Volume Required (litres / MT)", { required: true }),
          text("location", "Depot / Delivery Location", { required: true }),
        ],
      },
      {
        num: 16,
        title: "Fabrication & Construction",
        desc: "Tank construction, pipe welding and structural works to specification.",
        fields: [
          select(
            "scope",
            "Scope of Work",
            [
              "Tank Construction",
              "Pipe Welding",
              "Structural Steel",
              "Pressure Vessels",
              "Piping Fabrication",
            ],
            { others: true }
          ),
          text("location", "Project Location", { required: true }),
          text("timeline", "Target Timeline"),
          file("beme", "Upload BEME / Bill of Quantities"),
        ],
      },
      {
        num: 17,
        title: "Oil Servicing",
        desc: "Offshore asset optimization, manpower supply and RFQ support for IOCs and indigenous operators.",
        fields: [
          radio("clientClass", "Client Category", ["IOC", "Indigenous Operator"]),
          select(
            "service",
            "Service Required",
            [
              "Offshore Asset Optimization",
              "Manpower Supply",
              "Equipment Hire",
              "Maintenance & Turnaround",
              "Procurement Support",
            ],
            { others: true }
          ),
          text("rfq", "RFQ / Tender Reference"),
          file("rfqFile", "Upload RFQ Documents"),
        ],
      },
      {
        num: 18,
        title: "Marine Services",
        desc: "OSV and tugboat chartering, bunkering and jetty logistics.",
        icon: Ship,
        fields: [
          select(
            "marine",
            "Service Required",
            [
              "Vessel Charter (OSV)",
              "Vessel Charter (Tugboat)",
              "Bunkering",
              "Jetty Logistics",
              "Crew Transfer",
            ],
            { others: true }
          ),
          text("location", "Operating Location / Terminal", { required: true }),
          text("duration", "Charter Duration / Job Window", { required: true }),
          area("brief", "Operational Requirements"),
        ],
      },
    ],
  },
];

const CHINA = {
  id: "china-hub",
  nav: "China Hub",
  num: "Special Division",
  title: "China Operations & Logistics Division",
  summary:
    "Operating through a strategic alliance with a Guangdong Provincial State-Owned Enterprise, our Zhongshan hub supports sourcing, consolidation, warehousing and export handling for cargo bound for Nigeria and West Africa.",
  Icon: Ship,
  image: null, // e.g. "/assets/divisions/china-hub.jpg"
  service: {
    num: 19,
    title: "China Operational & Logistics",
    desc: "Door-to-door or port fulfilment from Guangdong, with on-the-ground communication support.",
    fields: [
      select(
        "category",
        "What do you need sourced or moved?",
        [
          "Electronics & Electrical",
          "Machinery & Industrial Equipment",
          "Building & Construction Materials",
          "Consumer Goods",
          "Solar & Energy Equipment",
        ],
        { others: true }
      ),
      area("description", "Describe your requirement", { required: true }),
      select(
        "fulfilment",
        "Fulfilment Route",
        [
          "Door-to-Door (Lagos)",
          "Door-to-Door (Port Harcourt)",
          "Port Delivery: Apapa",
          "Port Delivery: Tin Can",
          "Port Delivery: Onne",
        ],
        { others: true }
      ),
      radio(
        "dialect",
        "Does your team speak the local Guangdong dialect (Cantonese / Mandarin)?",
        ["Yes", "No"]
      ),
      radio("wechat", "Do you use WeChat?", ["Yes", "No"], {
        showIf: { field: "dialect", equals: "No" },
      }),
      text("wechatId", "WeChat ID", {
        required: true,
        showIf: [
          { field: "dialect", equals: "No" },
          { field: "wechat", equals: "Yes" },
        ],
      }),
      radio(
        "interpreter",
        "Should our China team handle supplier communication for you?",
        ["Yes", "No"],
        { showIf: { field: "dialect", equals: "No" } }
      ),
      file("specFile", "Product Specs / Reference Photos (optional)"),
    ],
  },
};

const NAV_ITEMS = [...DIVISIONS, CHINA].map((d) => ({ id: d.id, label: d.nav }));

/* ==========================================================================
   Form helpers
   ========================================================================== */
const isVisible = (field, values) =>
  [].concat(field.showIf || []).every((c) => values[c.field] === c.equals);

const optionsOf = (field) =>
  field.others ? [...field.options, "Others"] : field.options;

function validate(fields, values, files) {
  const errors = {};
  fields.forEach((fd) => {
    if (!isVisible(fd, values)) return;
    const v = values[fd.name];

    if (fd.type === "file") {
      if (fd.required && files.length === 0) errors[fd.name] = "Please upload at least one file.";
      return;
    }
    if (fd.type === "checkbox") {
      if (fd.required && !(v && v.length)) errors[fd.name] = "Select at least one option.";
      if (v && v.includes("Others") && !(values[`${fd.name}_other`] || "").trim())
        errors[`${fd.name}_other`] = "Please specify.";
      return;
    }
    if (fd.required && !String(v ?? "").trim()) {
      errors[fd.name] = fd.type === "radio" || fd.type === "select" ? "Please choose an option." : "This field is required.";
    } else if (fd.type === "email" && v && !EMAIL_RE.test(v)) {
      errors[fd.name] = "Enter a valid email address.";
    } else if (fd.type === "tel" && v && v.replace(/\D/g, "").length < 7) {
      errors[fd.name] = "Enter a valid phone number.";
    }
    if (fd.type === "select" && v === "Others" && !(values[`${fd.name}_other`] || "").trim())
      errors[`${fd.name}_other`] = "Please specify.";
  });
  return errors;
}

/* Mock backend call. Replace with a real POST; add the BCC server-side. */
async function submitQuote(payload) {
  console.info("[Elmivet quote request]", payload);
  // await fetch("/api/quotes", { method: "POST", body: JSON.stringify(payload) });
  await new Promise((r) => setTimeout(r, 900));
  return { ok: true };
}

const fmtSize = (b) =>
  b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

/* ==========================================================================
   Form UI pieces
   ========================================================================== */
const inputClass =
  "w-full border border-slate-300 bg-white px-3 py-2.5 font-sans text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0A2540]";

const choiceClass =
  "flex cursor-pointer items-center gap-2 border border-slate-300 bg-white px-4 py-2.5 font-sans text-sm text-slate-700 transition-colors has-checked:border-[#0A2540] has-checked:bg-slate-50 has-checked:font-semibold has-checked:text-[#0A2540]";

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 font-sans text-xs font-medium text-[#D9232D]">
      {message}
    </p>
  );
}

function SlideDown({ open, children }) {
  return (
    <div
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="overflow-hidden">
        <div className="pt-3">{children}</div>
      </div>
    </div>
  );
}

function OtherBox({ field, open, values, setValue, errors, formId }) {
  const key = `${field.name}_other`;
  return (
    <SlideDown open={open}>
      <label htmlFor={`${formId}-${key}`} className="mb-1.5 block font-sans text-xs font-semibold text-slate-600">
        Please specify
      </label>
      <textarea
        id={`${formId}-${key}`}
        rows={3}
        disabled={!open}
        value={values[key] || ""}
        onChange={(e) => setValue(key, e.target.value)}
        aria-invalid={Boolean(errors[key])}
        className={inputClass}
      />
      <FieldError message={errors[key]} />
    </SlideDown>
  );
}

function FileUpload({ id, files, onChange, error }) {
  const inputRef = useRef(null);
  const [problems, setProblems] = useState([]);
  const [drag, setDrag] = useState(false);
  const total = files.reduce((s, f) => s + f.size, 0);

  const handle = (list) => {
    const next = [...files];
    const issues = [];
    let sum = total;
    Array.from(list).forEach((f) => {
      if (BLOCKED_RE.test(f.name)) {
        issues.push(`${f.name}: this file type is not allowed.`);
        return;
      }
      if (next.some((n) => n.name === f.name && n.size === f.size)) return;
      if (next.length >= MAX_FILES) {
        issues.push(`${f.name}: maximum of ${MAX_FILES} files reached.`);
        return;
      }
      if (sum + f.size > MAX_TOTAL_BYTES) {
        issues.push(`${f.name}: would exceed the 25 MB total limit.`);
        return;
      }
      next.push(f);
      sum += f.size;
    });
    setProblems(issues);
    onChange(next);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <input
        ref={inputRef}
        id={id}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png"
        className="peer sr-only"
        onChange={(e) => handle(e.target.files)}
      />
      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handle(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center gap-2 border-2 border-dashed px-4 py-6 text-center transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#D9232D] ${
          drag ? "border-[#D9232D] bg-red-50" : "border-slate-300 bg-slate-50 hover:border-[#0A2540]"
        }`}
      >
        <UploadCloud className="h-6 w-6 text-[#D9232D]" aria-hidden="true" />
        <span className="font-sans text-sm font-semibold text-[#0A2540]">
          Click to upload or drag files here
        </span>
        <span className="font-sans text-xs text-slate-500">
          Up to {MAX_FILES} files · 25 MB total · PDF, Office, CSV, TXT, JPG, PNG
        </span>
      </label>

      {problems.length > 0 && (
        <ul role="alert" className="mt-2 space-y-1">
          {problems.map((p) => (
            <li key={p} className="font-sans text-xs font-medium text-[#D9232D]">
              {p}
            </li>
          ))}
        </ul>
      )}
      <FieldError message={error} />

      {files.length > 0 && (
        <div className="mt-3">
          <ul className="divide-y divide-slate-200 border border-slate-200 bg-white">
            {files.map((f) => (
              <li key={`${f.name}-${f.size}`} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="flex min-w-0 items-center gap-2 font-sans text-sm text-slate-700">
                  <FileText className="h-4 w-4 shrink-0 text-[#0A2540]" aria-hidden="true" />
                  <span className="truncate">{f.name}</span>
                  <span className="shrink-0 text-xs text-slate-400">{fmtSize(f.size)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onChange(files.filter((n) => n !== f))}
                  aria-label={`Remove ${f.name}`}
                  className="shrink-0 p-1 text-slate-500 hover:text-[#D9232D]"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 font-sans text-xs text-slate-500">
            {files.length}/{MAX_FILES} files · {fmtSize(total)} of 25 MB used
          </p>
        </div>
      )}
    </div>
  );
}

function Field({ field, formId, values, setValue, errors, files, setFiles }) {
  const id = `${formId}-${field.name}`;
  const err = errors[field.name];
  const wide = field.wide || ["radio", "checkbox", "textarea", "file"].includes(field.type);
  const labelNode = (
    <>
      {field.label}
      {field.required && (
        <span className="text-[#D9232D]" aria-hidden="true">
          {" "}
          *
        </span>
      )}
    </>
  );
  const labelClass = "mb-1.5 block font-sans text-sm font-semibold text-[#0A2540]";
  const v = values[field.name];

  let control;
  if (field.type === "radio") {
    control = (
      <fieldset aria-describedby={err ? `${id}-err` : undefined}>
        <legend className={labelClass}>{labelNode}</legend>
        <div className="flex flex-wrap gap-3">
          {field.options.map((opt) => (
            <label key={opt} className={choiceClass}>
              <input
                type="radio"
                name={field.name}
                value={opt}
                checked={v === opt}
                onChange={() => setValue(field.name, opt)}
                className="h-4 w-4 accent-[#D9232D]"
              />
              {opt}
            </label>
          ))}
        </div>
      </fieldset>
    );
  } else if (field.type === "checkbox") {
    const opts = optionsOf(field);
    const selected = v || [];
    control = (
      <fieldset aria-describedby={err ? `${id}-err` : undefined}>
        <legend className={labelClass}>{labelNode}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {opts.map((opt) => (
            <label key={opt} className={choiceClass}>
              <input
                type="checkbox"
                value={opt}
                checked={selected.includes(opt)}
                onChange={(e) =>
                  setValue(
                    field.name,
                    e.target.checked ? [...selected, opt] : selected.filter((s) => s !== opt)
                  )
                }
                className="h-4 w-4 accent-[#D9232D]"
              />
              {opt}
            </label>
          ))}
        </div>
        {field.others && (
          <OtherBox
            field={field}
            open={selected.includes("Others")}
            values={values}
            setValue={setValue}
            errors={errors}
            formId={formId}
          />
        )}
      </fieldset>
    );
  } else if (field.type === "select") {
    control = (
      <>
        <label htmlFor={id} className={labelClass}>
          {labelNode}
        </label>
        <select
          id={id}
          value={v || ""}
          onChange={(e) => setValue(field.name, e.target.value)}
          aria-invalid={Boolean(err)}
          aria-describedby={err ? `${id}-err` : undefined}
          className={inputClass}
        >
          <option value="">Select an option</option>
          {optionsOf(field).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {field.others && (
          <OtherBox
            field={field}
            open={v === "Others"}
            values={values}
            setValue={setValue}
            errors={errors}
            formId={formId}
          />
        )}
      </>
    );
  } else if (field.type === "textarea") {
    control = (
      <>
        <label htmlFor={id} className={labelClass}>
          {labelNode}
        </label>
        <textarea
          id={id}
          rows={4}
          value={v || ""}
          onChange={(e) => setValue(field.name, e.target.value)}
          aria-invalid={Boolean(err)}
          aria-describedby={err ? `${id}-err` : undefined}
          className={inputClass}
        />
        {field.hint && <p className="mt-1 font-sans text-xs text-slate-500">{field.hint}</p>}
      </>
    );
  } else if (field.type === "file") {
    control = (
      <>
        <span className={labelClass}>{labelNode}</span>
        <FileUpload id={id} files={files} onChange={setFiles} error={err} />
      </>
    );
  } else {
    control = (
      <>
        <label htmlFor={id} className={labelClass}>
          {labelNode}
        </label>
        <input
          id={id}
          type={field.type}
          autoComplete={field.autoComplete}
          value={v || ""}
          onChange={(e) => setValue(field.name, e.target.value)}
          aria-invalid={Boolean(err)}
          aria-describedby={err ? `${id}-err` : undefined}
          className={inputClass}
        />
      </>
    );
  }

  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      {control}
      {field.type !== "file" && <FieldError id={`${id}-err`} message={err} />}
    </div>
  );
}

/* ==========================================================================
   Modals
   ========================================================================== */
function ModalShell({ onClose, titleId, children }) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement;
    const onKey = (e) => {
      if (e.key === "Escape") closeRef.current();
    };
    const originalOverflow = document.body.style.overflow;
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = originalOverflow;
      if (previous && previous.focus) previous.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-[#0A2540]/70 p-0 backdrop-blur-sm sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="animate-mouth-opening relative my-auto w-full max-w-3xl bg-white shadow-2xl outline-none"
      >
        {children}
      </div>
    </div>
  );
}

function QuoteModal({ service, onClose, onSent }) {
  const formId = `quote-${service.num}`;
  const fields = [...COMMON_FIELDS, ...service.fields, NOTES_FIELD];

  /* Multi-step wizard: group the existing fields into logical phases */
  const steps = [
    { title: "Client Information", fields: COMMON_FIELDS },
    { title: "Service Details", fields: service.fields.filter((fd) => fd.type !== "file") },
    {
      title: "Notes & Uploads",
      fields: [...service.fields.filter((fd) => fd.type === "file"), NOTES_FIELD],
    },
  ].filter((st) => st.fields.length > 0);
  const lastStep = steps.length - 1;
  const [step, setStep] = useState(0);
  const stepHeadingRef = useRef(null);
  const [values, setValues] = useState({});
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);

  const setValue = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name] && !prev[`${name}_other`]) return prev;
      const { [name]: _a, [`${name}_other`]: _b, ...rest } = prev;
      return rest;
    });
  };

  useEffect(() => {
    if (step > 0) stepHeadingRef.current?.focus();
  }, [step]);

  const handleNext = () => {
    const found = validate(steps[step].fields, values, files);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = Object.keys(found)[0];
      document.getElementById(`${formId}-${first}`)?.focus();
      return;
    }
    setStep((n) => Math.min(n + 1, lastStep));
  };

  const handlePrevious = () => {
    setErrors({});
    setStep((n) => Math.max(n - 1, 0));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Pressing Enter on an earlier step advances the wizard instead of submitting
    if (step < lastStep) {
      handleNext();
      return;
    }
    const honeypot = new FormData(e.currentTarget).get("website");
    const found = validate(fields, values, files);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = Object.keys(found)[0];
      // If an earlier step holds the problem, take the user back to it
      const badStep = steps.findIndex((st) =>
        st.fields.some((fd) => found[fd.name] || found[`${fd.name}_other`])
      );
      if (badStep !== -1 && badStep !== step) {
        setStep(badStep);
        return;
      }
      document.getElementById(`${formId}-${first}`)?.focus();
      return;
    }
    const reference = `ELM-${service.num}-${Date.now().toString(36).toUpperCase()}`;
    if (honeypot) {
      onSent({ reference });
      return;
    }

    const visibleFields = fields.filter((fd) => isVisible(fd, values));
    const answers = {};
    visibleFields.forEach((fd) => {
      if (fd.type === "file") return;
      answers[fd.label] = values[fd.name] ?? "";
      if (values[`${fd.name}_other`]) answers[`${fd.label} (Others)`] = values[`${fd.name}_other`];
    });
    const hasFileField = visibleFields.some((fd) => fd.type === "file");

    setSending(true);
    await submitQuote({
      to: QUOTES_TO,
      // The hidden copy must be applied by the server, never exposed in client markup.
      bccNote: `server adds BCC to ${QUOTES_BCC}`,
      subject: `Quote Request: ${service.title} (Form ${service.num})`,
      reference,
      answers,
      attachments: hasFileField ? files.map((f) => ({ name: f.name, size: f.size })) : [],
    });
    setSending(false);
    onSent({ reference });
  };

  return (
    <ModalShell onClose={onClose} titleId={`${formId}-title`}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5 sm:px-8">
        <div>
          <span className="font-sans text-xs font-semibold uppercase tracking-widest text-[#D9232D]">
            Quote Request · Form {String(service.num).padStart(2, "0")}
          </span>
          <h2 id={`${formId}-title`} className="mt-1 font-serif text-2xl font-bold text-[#0A2540]">
            {service.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quote form"
          className="-mr-2 shrink-0 p-2 text-slate-500 hover:text-[#D9232D]"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate className="px-6 py-6 sm:px-8">
        {/* Step indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <span className="font-sans text-xs font-semibold uppercase tracking-widest text-[#D9232D]">
              Step {step + 1} of {steps.length}
            </span>
            <span
              ref={stepHeadingRef}
              tabIndex={-1}
              className="font-serif text-lg font-bold text-[#0A2540] outline-none"
            >
              {steps[step].title}
            </span>
          </div>
          <div
            className="mt-3 flex gap-1.5"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-valuenow={step + 1}
            aria-label={`Step ${step + 1} of ${steps.length}: ${steps[step].title}`}
          >
            {steps.map((st, i) => (
              <span
                key={st.title}
                aria-hidden="true"
                className={`h-1 flex-1 transition-colors ${i <= step ? "bg-[#D9232D]" : "bg-slate-200"}`}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
          {steps[step].fields
            .filter((fd) => isVisible(fd, values))
            .map((fd) => (
              <Field
                key={fd.name}
                field={fd}
                formId={formId}
                values={values}
                setValue={setValue}
                errors={errors}
                files={files}
                setFiles={setFiles}
              />
            ))}
        </div>

        {/* Honeypot: hidden from people, tempting to bots */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

        {Object.keys(errors).length > 0 && (
          <p role="alert" className="mt-6 border-l-4 border-[#D9232D] bg-red-50 px-4 py-3 font-sans text-sm text-[#D9232D]">
            Please correct the highlighted fields and {step < lastStep ? "continue" : "submit again"}.
          </p>
        )}

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 font-sans text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#0A2540]" aria-hidden="true" />
            Your request is sent securely to our quotations desk.
          </p>
          <div className="flex gap-3">
            {step === 0 ? (
              <button
                type="button"
                onClick={onClose}
                className="border border-slate-300 px-5 py-3 font-sans text-sm font-semibold text-slate-600 transition-colors hover:border-[#0A2540] hover:text-[#0A2540]"
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePrevious}
                disabled={sending}
                className="inline-flex items-center gap-2 border border-slate-300 px-5 py-3 font-sans text-sm font-semibold text-slate-600 transition-colors hover:border-[#0A2540] hover:text-[#0A2540] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Previous
              </button>
            )}
            {step < lastStep ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 bg-[#0A2540] px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#D9232D]"
              >
                Next
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center gap-2 bg-[#0A2540] px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#D9232D] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? "Sending..." : "Submit Request"}
                {!sending && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              </button>
            )}
          </div>
        </div>
      </form>
    </ModalShell>
  );
}

function ThanksModal({ service, reference, onClose }) {
  return (
    <ModalShell onClose={onClose} titleId="thanks-title">
      <div className="px-6 py-10 text-center sm:px-12">
        <span className="mx-auto flex h-16 w-16 items-center justify-center bg-[#0A2540]">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" aria-hidden="true" />
        </span>
        <span className="mt-6 block font-sans text-xs font-semibold uppercase tracking-widest text-[#D9232D]">
          Request Received
        </span>
        <h2 id="thanks-title" className="mt-2 font-serif text-3xl font-bold text-[#0A2540]">
          Thank you. Our team is on it.
        </h2>
        <p className="mx-auto mt-4 max-w-xl font-sans leading-relaxed text-slate-600">
          Your quote request for <strong className="text-[#0A2540]">{service.title}</strong> has
          been logged. A member of our quotations desk will respond within{" "}
          <strong className="text-[#0A2540]">24 hours</strong>.
        </p>
        <p className="mt-3 font-mono text-xs text-slate-500">Reference: {reference}</p>

        <div className="mt-8 border-t border-slate-200 pt-8">
          <p className="flex items-center justify-center gap-2 font-sans text-sm font-semibold text-[#0A2540]">
            <ShieldCheck className="h-4 w-4 text-[#D9232D]" aria-hidden="true" />
            Need it sooner? Call our hotlines directly.
          </p>
          <div className="mt-4 flex flex-col justify-center gap-3 sm:flex-row">
            {HOTLINES.map((h) => (
              <a
                key={h.tel}
                href={`tel:${h.tel}`}
                className="bg-[#0A2540] px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#D9232D]"
              >
                {h.label}
              </a>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-8 font-sans text-sm font-semibold text-slate-500 underline underline-offset-4 hover:text-[#D9232D]"
        >
          Close
        </button>
      </div>
    </ModalShell>
  );
}

/* ==========================================================================
   Editorial image placeholder
   - Offset outline frame (mirrors to the other side when `mirror` is true)
   - Red corner tab, inner keyline and a clear "[Division Image Placeholder]" tag
   - Optional overlapping caption plate
   - Pass `src` to swap in a real photo; the frame, tab and caption stay.
   ========================================================================== */
function ImagePlaceholder({
  src,
  alt = "",
  label = "[Division Image Placeholder]",
  caption,
  aspect = "aspect-[4/3]",
  mirror = false,
  onDark = false,
  className = "",
}) {
  return (
    <figure className={`relative ${className}`}>
      {/* Offset editorial frame */}
      <span
        aria-hidden="true"
        className={`absolute inset-0 translate-y-3 border ${
          mirror ? "-translate-x-3" : "translate-x-3"
        } ${onDark ? "border-white/30" : "border-[#0A2540]/30"}`}
      />

      {/* Image area */}
      <div className={`relative overflow-hidden bg-[#0A2540] shadow-lg ${aspect}`}>
        {src ? (
          <img src={src} alt={alt} className="h-full w-full object-cover" />
        ) : (
          <>
            <div className="absolute inset-0 bg-linear-to-br from-[#0A2540] via-[#12385e] to-[#245A8D]" />
            <span aria-hidden="true" className="absolute inset-3 border border-white/20" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-white/60">
              <ImageIcon className="h-9 w-9" strokeWidth={1.25} aria-hidden="true" />
              <span className="font-mono text-[0.6875rem] font-semibold uppercase tracking-widest">
                {label}
              </span>
            </div>
          </>
        )}
        {/* Red corner tab */}
        <span aria-hidden="true" className="absolute left-0 top-0 h-1 w-16 bg-[#D9232D]" />
      </div>

      {/* Overlapping caption plate */}
      {caption && (
        <figcaption
          className={`relative -mt-4 block w-fit bg-white px-4 py-2 font-sans text-[0.6875rem] font-bold uppercase tracking-widest text-[#0A2540] shadow-md ${
            mirror ? "ml-auto mr-4" : "ml-4"
          }`}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

/* ==========================================================================
   Page sections
   ========================================================================== */
function ServiceCard({ service, DivisionIcon, onOpen, className = "" }) {
  const Icon = service.icon || DivisionIcon;
  return (
    <Reveal className={`h-full ${className}`}>
      <article className="flex h-full flex-col border border-slate-200 border-t-4 border-t-[#0A2540] bg-white p-6 shadow-sm transition-shadow hover:shadow-lg sm:p-7">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-bold text-[#D9232D]">
            {String(service.num).padStart(2, "0")}
          </span>
          <Icon className="h-5 w-5 text-[#0A2540]" aria-hidden="true" />
        </div>
        <h3 className="mt-4 font-serif text-xl font-bold leading-snug text-[#0A2540]">
          {service.title}
        </h3>
        <p className="mt-2 flex-1 font-sans text-sm leading-relaxed text-slate-600">
          {service.desc}
        </p>
        <button
          type="button"
          onClick={() => onOpen(service)}
          aria-haspopup="dialog"
          className="group mt-6 inline-flex w-fit items-center gap-2 bg-[#0A2540] px-5 py-2.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#D9232D]"
        >
          Request a Quote
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </button>
      </article>
    </Reveal>
  );
}

function DivisionSection({ division, onOpen }) {
  const { Icon, services, flip } = division;
  return (
    <section
      id={division.id}
      aria-labelledby={`${division.id}-title`}
      className={`scroll-mt-16 border-b border-slate-200 ${division.bg}`}
    >
      <div className="container section-padding">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <Reveal className={`lg:col-span-4 ${flip ? "lg:order-2" : ""}`}>
            {/* Editorial image: sits above the header block; the frame mirrors on flipped rows */}
            <ImagePlaceholder
              src={division.image}
              alt={division.title}
              caption={`${division.num} · ${division.nav}`}
              aspect={flip ? "aspect-[16/10]" : "aspect-[4/3]"}
              mirror={flip}
            />

            <div className="mt-6 lg:sticky lg:top-24">
              <h2
                id={`${division.id}-title`}
                className="mt-2 font-serif text-3xl font-bold leading-tight text-[#0A2540] sm:text-4xl"
              >
                {division.title}
              </h2>
              <p className="mt-4 font-sans leading-relaxed text-slate-600">{division.summary}</p>
              <p className="mt-4 font-sans text-xs font-semibold uppercase tracking-widest text-slate-500">
                {services.length} services
              </p>
            </div>
          </Reveal>

          <div className={`grid gap-6 sm:grid-cols-2 lg:col-span-8 ${flip ? "lg:order-1" : ""}`}>
            {services.map((s, i) => (
              <ServiceCard
                key={s.num}
                service={s}
                DivisionIcon={Icon}
                onOpen={onOpen}
                className={
                  i === services.length - 1 && services.length % 2 === 1 ? "sm:col-span-2" : ""
                }
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ChinaSection({ onOpen }) {
  const { service } = CHINA;
  return (
    <section
      id={CHINA.id}
      aria-labelledby="china-title"
      className="relative scroll-mt-16 overflow-hidden bg-white border-b border-slate-800 py-20 lg:py-28"
    >
      <div className="container relative z-10">
        <div className="grid items-stretch gap-10 lg:grid-cols-12 lg:gap-12">
          <Reveal className="lg:col-span-7">
            <h2
              id="china-title"
              className="font-serif text-3xl font-bold leading-tight text-[#040350] sm:text-4xl lg:text-5xl"
            >
              {CHINA.title}
            </h2>
            <p className="mt-5 max-w-2xl font-sans text-lg leading-relaxed text-[#040350]">
              {CHINA.summary}
            </p>
            <div className="mt-8 border-t border-white/15 pt-5">
              <p className="flex items-center gap-2 font-sans text-sm text-[#D9232D]">
                <span aria-hidden="true" className="h-4 w-0.5 bg-[#D9232D] shrink-0" />
                <ShieldCheck className="h-4 w-4 text-[#D9232D]" aria-hidden="true" />
                Zhongshan City, Guangdong Province · Strategic warehouse and consolidation hub
              </p>
            </div>
          </Reveal>

          {/* Right column: editorial image placeholder */}
          <Reveal className="lg:col-span-5 lg:self-center" delay={120}>
            <ImagePlaceholder
              src={CHINA.image}
              alt={CHINA.title}
              aspect="aspect-[16/10]"
              onDark
            />

            <article className="relative z-10 -mt-10 flex flex-col border-t-4 border-t-[#D9232D] bg-white p-7 shadow-xl sm:p-8 lg:ml-8">
              <span className="font-mono text-xs font-bold text-[#D9232D]">
                {String(service.num).padStart(2, "0")}
              </span>
              <h3 className="mt-3 font-serif text-2xl font-bold text-[#0A2540]">{service.title}</h3>
              <p className="mt-2 flex-1 font-sans text-sm leading-relaxed text-slate-600">
                {service.desc}
              </p>
              <button
                type="button"
                onClick={() => onOpen(service)}
                aria-haspopup="dialog"
                className="group mt-6 inline-flex w-fit items-center gap-2 bg-[#D9232D] px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#b81b23]"
              >
                Request a Quote
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </button>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}


/* ==========================================================================
   Page
   ========================================================================== */
export default function Services() {
  const [modal, setModal] = useState(null); // { mode: 'form' | 'thanks', service, reference? }
  const [active, setActive] = useState(NAV_ITEMS[0].id);

  /* Highlight the current division in the sticky nav */
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) setActive(en.target.id);
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    NAV_ITEMS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const closeModal = () => setModal(null);

  return (
    <main className="bg-slate-50 text-slate-700">
      {/* ---------------- Hero ---------------- */}
      <header className="relative overflow-hidden bg-[#0A2540]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay"
          style={{ backgroundImage: `url("${HERO_IMAGE}")` }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0A2540] via-[#0A2540]/70 to-transparent"
        />
        <div className="container relative z-10 py-20 lg:py-28">
          <Reveal>
            <span className="inline-flex items-center gap-2 bg-white px-3 py-1.5 font-sans text-xs font-semibold uppercase tracking-widest text-[#D9232D]">
              <Globe className="h-4 w-4" aria-hidden="true" />
              Services &amp; Global Logistics Hub
            </span>
            <h1 className="mt-6 max-w-4xl font-serif text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Enterprise Solutions &amp; Global Logistics Execution.
            </h1>
            <p className="mt-6 max-w-2xl font-sans text-lg leading-relaxed text-slate-200">
              Eliminating operational bottlenecks across global trade routes, maritime terminals,
              industrial supply chains, and specialized engineering sectors.
            </p>
            <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4 border-t border-white/15 pt-6 font-sans">
              {[
                ["19", "Services"],
                ["4", "Core Divisions"],
                ["1", "China Hub"],
                ["24h", "Quote Response"],
              ].map(([n, l]) => (
                <div key={l}>
                  <dt className="text-xs uppercase tracking-widest text-slate-300">{l}</dt>
                  <dd className="font-serif text-3xl font-bold text-white">{n}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </header>

      {/* ---------------- Sticky division nav ---------------- */}
      <nav
        aria-label="Service divisions"
        className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur"
      >
        <div className="container">
          <ul className="flex gap-1 overflow-x-auto whitespace-nowrap py-2">
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  aria-current={active === item.id ? "true" : undefined}
                  className={`block border-b-2 px-4 py-2.5 font-sans text-sm font-semibold transition-colors ${
                    active === item.id
                      ? "border-[#D9232D] text-[#0A2540]"
                      : "border-transparent text-slate-500 hover:text-[#0A2540]"
                  }`}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* ---------------- Divisions ---------------- */}
      {DIVISIONS.map((d) => (
        <DivisionSection
          key={d.id}
          division={d}
          onOpen={(service) => setModal({ mode: "form", service })}
        />
      ))}

      <ChinaSection onOpen={(service) => setModal({ mode: "form", service })} />

      {/* ---------------- Modals ---------------- */}
      {modal?.mode === "form" && (
        <QuoteModal
          key={modal.service.num}
          service={modal.service}
          onClose={closeModal}
          onSent={({ reference }) =>
            setModal({ mode: "thanks", service: modal.service, reference })
          }
        />
      )}
      {modal?.mode === "thanks" && (
        <ThanksModal service={modal.service} reference={modal.reference} onClose={closeModal} />
      )}
    </main>
  );
}
