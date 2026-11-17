import { useEffect, useRef, useState } from "react";

// Standalone Form Components — Global Trade (Forms 01–05)
import ImportExportForm from "../components/forms/global_trade/import";
import OceanFreightForm from "../components/forms/global_trade/ocean_freight";
import ClearingCustomsForm from "../components/forms/global_trade/clearing_customs";
import GroupageLclForm from "../components/forms/global_trade/groupage_lcl";
import BondedTerminalForm from "../components/forms/global_trade/bonded_terminal";

// Standalone Form Components — Logistics & Supply Chain (Forms 06–09)
import RoadHaulageForm from "../components/forms/logistics/road_haulage";
import WarehousingForm from "../components/forms/logistics/warehousing";
import PackingRemovalForm from "../components/forms/logistics/packing";
import DomesticBulkHaulageForm from "../components/forms/logistics/domestic";

// Standalone Form Components — Commercial Division (Forms 10–12, 20)
import AutomobileForm from "../components/forms/commercial/automobile";
import RealEstateForm from "../components/forms/commercial/real_estate";
import ProcurementForm from "../components/forms/commercial/procurement";
import OffshoreInvestmentForm from "../components/forms/commercial/offshore_investment";

// Standalone Form Components — Industrial Division (Forms 13–18)
import CleaningForm from "../components/forms/industrial/cleaning";
import EnergyForm from "../components/forms/industrial/energy";
import PetroleumForm from "../components/forms/industrial/petroleum";
import FabricationForm from "../components/forms/industrial/fabrication";
import OilServicingForm from "../components/forms/logistics/oil_servicing";
import MarineServicesForm from "../components/forms/industrial/marine_services";

// Standalone Form Components — China Operations (Form 19)
import ChinaQuoteForm from "../components/forms/china/china_quote";

// Shared Primitives & Approved Confirmation Interfaces
import {
  ThanksModal,
  OffshoreThanksModal,
  ImagePlaceholder,
} from "../components/forms/shared/FormPrimitives";

import {
  Globe,
  Truck,
  Building2,
  Wrench,
  Ship,
  Anchor,
  FileText,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

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
   Standalone Form Registry (Forms 1–20)
   Maps each service identifier (service.num) to its standalone form component.
   ========================================================================== */
const CUSTOM_FORMS = {
  1: ImportExportForm,
  2: OceanFreightForm,
  3: ClearingCustomsForm,
  4: GroupageLclForm,
  5: BondedTerminalForm,
  6: RoadHaulageForm,
  7: WarehousingForm,
  8: PackingRemovalForm,
  9: DomesticBulkHaulageForm,
  10: AutomobileForm,
  11: RealEstateForm,
  12: ProcurementForm,
  13: CleaningForm,
  14: EnergyForm,
  15: PetroleumForm,
  16: FabricationForm,
  17: OilServicingForm,
  18: MarineServicesForm,
  19: ChinaQuoteForm,
  20: OffshoreInvestmentForm,
};

/* ==========================================================================
   Services Data (20 services across 4 divisions + China Hub)
   ========================================================================== */
const DIVISIONS = [
  {
    id: "global-trade",
    nav: "Global Trade",
    num: "Division 01",
    title: "Global Trade Division",
    summary:
      "End-to-end import, export and customs execution across Nigerian ports and the Cotonou and Lomé corridors, with bonded terminal control.",
    Icon: Globe,
    image: "/images/divisions/division-global-trade.webp",
    bg: "bg-slate-50",
    services: [
      {
        num: 1,
        title: "Import and Export Facilitation",
        desc: "Documentation, compliance checks and coordination for goods moving into or out of Nigeria.",
      },
      {
        num: 2,
        title: "Ocean and Air Freight Forwarding",
        desc: "Consolidated and full-load freight on ocean and air lanes, with tracked milestones.",
      },
      {
        num: 3,
        title: "Clearing & Customs Brokerage",
        desc: "Licensed clearance at Nigerian ports and the airport, handled with full regulatory compliance.",
        icon: FileText,
      },
      {
        num: 4,
        title: "Groupage / LCL Services",
        desc: "Shared-container consolidation with protective packing for smaller shipments.",
      },
      {
        num: 5,
        title: "Bonded Terminal Operations",
        desc: "Secure bonded handling, storage and examination for containerised cargo.",
        icon: Anchor,
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
    image: "/images/divisions/division-logistics.webp",
    bg: "bg-white",
    flip: true,
    services: [
      {
        num: 6,
        title: "Road Haulage & Industrial Logistics",
        desc: "Fleet-matched haulage for general, heavy and hazardous industrial loads.",
      },
      {
        num: 7,
        title: "Warehousing & Storage",
        desc: "Secure storage at our China, Eleme and bonded-area facilities.",
      },
      {
        num: 8,
        title: "Packing & Removal",
        desc: "Residential, corporate and industrial plant relocation with careful handling.",
      },
      {
        num: 9,
        title: "Domestic Bulk Haulage",
        desc: "Mass commodity and liquid distribution loops across Nigeria.",
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
    image: "/images/divisions/division-commercial.webp",
    bg: "bg-slate-50",
    services: [
      {
        num: 10,
        title: "Automobile Dealership & Importation",
        desc: "Foreign-used (Tokunbo), brand-new and locally sourced vehicles.",
      },
      {
        num: 11,
        title: "Real Estate & Project Request",
        desc: "Land acquisition and project oversight, with mandate verification for brokers.",
      },
      {
        num: 12,
        title: "Procurement & Bulk Merchandise",
        desc: "Custom project sourcing and corporate buying at volume.",
      },
      {
        num: 20,
        title: "Real Estate Offshore Investment Enquiry",
        desc: "Offshore property acquisition enquiries for registered Elmivet members and new international investors.",
        icon: Globe,
        cta: "Make an Enquiry",
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
    image: "/images/divisions/division-industrial.webp",
    bg: "bg-white",
    flip: true,
    services: [
      {
        num: 13,
        title: "General Cleaning Services",
        desc: "Industrial tank and vessel cleaning, plus commercial janitorial contracts.",
      },
      {
        num: 14,
        title: "Energy Solutions",
        desc: "Industrial solar arrays, microgrids and energy audits.",
      },
      {
        num: 15,
        title: "Petroleum Marketing",
        desc: "Bulk PMS, AGO, DPK, LPG and LNG, priced ex-depot or loaded.",
      },
      {
        num: 16,
        title: "Fabrication & Construction",
        desc: "Tank construction, pipe welding and structural works to specification.",
      },
      {
        num: 17,
        title: "Oil Servicing",
        desc: "Offshore asset optimization, manpower supply and RFQ support for IOCs and indigenous operators.",
      },
      {
        num: 18,
        title: "Marine Services",
        desc: "OSV and tugboat chartering, bunkering and jetty logistics.",
        icon: Ship,
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
  image: "/images/divisions/division-china-operations.webp",
  service: {
    num: 19,
    title: "China Operational & Logistics",
    desc: "Door-to-door or port fulfilment from Guangdong, with on-the-ground communication support.",
  },
};

const NAV_ITEMS = [...DIVISIONS, CHINA].map((d) => ({ id: d.id, label: d.nav }));

/* ==========================================================================
   Page sections
   ========================================================================== */
function ServiceCard({ service, DivisionIcon, onOpen, className = "" }) {
  const Icon = service.icon || DivisionIcon;
  return (
    <Reveal className={`h-full ${className}`}>
      <article className="flex h-full flex-col border border-slate-200 border-t-4 border-t-[#0A2540] bg-white p-6 shadow-sm transition-shadow hover:shadow-lg sm:p-7">
        <div className="flex items-center justify-end">
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
          {service.cta || "Request a Quote"}
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
      <div id="china-hub" className="scroll-mt-24 container relative z-10">
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
            <p className="flex items-center gap-4 mt-4 font-sans font-bold text-sm text-slate-600">
              NOTICE FOR ONGOING/INCOMING SHIPMENTS:
            </p>
            <p className="flex items-center gap-1 italic pt-0 font-sans text-sm text-slate-600">
              If you have an active, ongoing, or incoming shipment arriving soon and require immediate inquires, processing or clearance, please bypass this form and email your shipment documents directly to quotes@elmivet.com for priority handling.
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
  const [modal, setModal] = useState(null); // { mode: 'form' | 'thanks', service, reference?, registered? }
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
          className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url("/images/hero/services-hero.webp")` }}
        />
        {/* Lighter gradient overlay to let the crisp hero image shine through */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0A2540]/90 via-[#0A2540]/40 to-transparent"
        />
        <div className="container relative z-10 py-20 lg:py-28">
          <Reveal>
            <span className="inline-flex items-center gap-2 bg-white px-3 py-1.5 font-sans text-xs font-semibold uppercase tracking-widest text-[#D9232D] shadow-md">
              <Globe className="h-4 w-4" aria-hidden="true" />
              Services &amp; Global Logistics Hub
            </span>
            <h1 className="mt-6 max-w-4xl font-serif text-4xl font-bold leading-tight tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] sm:text-5xl lg:text-6xl">
              Enterprise Solutions &amp; Global Logistics Execution.
            </h1>
            <p className="mt-6 max-w-2xl font-sans text-lg font-medium leading-relaxed text-slate-100 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
              Eliminating operational bottlenecks across global trade routes, maritime terminals,
              industrial supply chains, and specialized engineering sectors.
            </p>
            <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4 border-t border-white/20 pt-6 font-sans">
              {[
                ["20", "Services"],
                ["4", "Core Divisions"],
                ["1", "China Hub"],
                ["24h", "Quote Response"],
              ].map(([n, l]) => (
                <div key={l}>
                  <dt className="text-xs uppercase tracking-widest text-slate-200 drop-shadow-sm">{l}</dt>
                  <dd className="font-serif text-3xl font-bold text-white drop-shadow-md">{n}</dd>
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
      <section id="get-quote" className="scroll-mt-24">
        {DIVISIONS.map((d) => (
          <DivisionSection
            key={d.id}
            division={d}
            onOpen={(service) => setModal({ mode: "form", service })}
          />
        ))}
      </section>

      <ChinaSection onOpen={(service) => setModal({ mode: "form", service })} />

      {/* ---------------- Modals ---------------- */}
      {modal?.mode === "form" && (() => {
        const FormComponent = CUSTOM_FORMS[modal.service.num];
        if (!FormComponent) return null;
        return (
          <FormComponent
            key={modal.service.num}
            service={modal.service}
            onClose={closeModal}
            onSent={({ reference, registered }) =>
              setModal({ mode: "thanks", service: modal.service, reference, registered })
            }
          />
        );
      })()}

      {modal?.mode === "thanks" && modal.service.num === 20 && (
        <OffshoreThanksModal
          service={modal.service}
          reference={modal.reference}
          registered={modal.registered}
          onClose={closeModal}
        />
      )}

      {modal?.mode === "thanks" && modal.service.num !== 20 && (
        <ThanksModal
          service={modal.service}
          reference={modal.reference}
          onClose={closeModal}
        />
      )}
    </main>
  );
}
