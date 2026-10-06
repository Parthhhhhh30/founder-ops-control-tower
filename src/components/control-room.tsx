"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  CheckCheck,
  ChevronRight,
  CircleDot,
  ClipboardList,
  Clock3,
  FileCheck2,
  Layers3,
  ListFilter,
  PanelLeftClose,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  X,
  CalendarDays,
  RotateCcw,
  Printer,
  AlertTriangle,
  Building2,
} from "lucide-react";
import { createSeed, DEMO_DATE } from "@/data/seed";
import {
  SeedRepository,
  OperatorCommand,
  stateSchema,
} from "@/data/repository";
import {
  deriveQueue,
  days,
  forwardLook,
  founderQueue,
  starterReady,
  weeklyBrief,
} from "@/domain/rules";
import { DemoState, Mode, OperationalItem } from "@/domain/types";
import { MockDraftingProvider } from "@/providers/drafting";
const modules = [
  {
    name: "Command Desk",
    icon: Layers3,
    kicker: "Your operating queue",
    description:
      "Move the routine. Prepare the sensitive. Escalate with context.",
  },
  {
    name: "Revenue Ops",
    icon: Wallet,
    kicker: "Collections & reconciliation",
    description: "Payment truth first. Every follow-up has a reason.",
  },
  {
    name: "People Ops",
    icon: Users,
    kicker: "Hiring & new starters",
    description: "Keep the process moving. Keep the decisions human.",
  },
  {
    name: "Contracts & Compliance",
    icon: FileCheck2,
    kicker: "Document control & human review",
    description:
      "Surface deviations. Track administration. Preserve accountability.",
  },
  {
    name: "Company Ops",
    icon: Building2,
    kicker: "Commitments & infrastructure",
    description: "The details that keep the company working.",
  },
  {
    name: "Weekly Brief",
    icon: ClipboardList,
    kicker: "Prepared for founder review",
    description:
      "A clear account of what moved, what matters, and what needs a decision.",
  },
  {
    name: "Forward Look",
    icon: TrendingUp,
    kicker: "Transparent operational foresight",
    description: "What will break if nothing changes?",
  },
];
const money = (value: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
const displayDate = (date: string) =>
  new Date(date + "T12:00:00Z").toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
const storageKey = "backbone-demo-v1";
function Badge({ mode }: { mode: Mode }) {
  return (
    <span className={`mode mode-${mode.toLowerCase()}`}>
      <span />
      {mode}
    </span>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <CheckCheck size={24} />
      <strong>Clear for now</strong>
      <p>{text}</p>
    </div>
  );
}
function QueueTable({
  items,
  selected,
  choose,
}: {
  items: OperationalItem[];
  selected: string | null;
  choose: (id: string) => void;
}) {
  return items.length ? (
    <div className="table-scroll">
      <table className="queue-table">
        <thead>
          <tr>
            <th>Judgment</th>
            <th>Operational record</th>
            <th>Owner / dependency</th>
            <th>Due</th>
            <th className="numeric">Impact</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className={selected === i.id ? "selected" : ""}>
              <td>
                <Badge mode={i.mode} />
              </td>
              <td>
                <button className="row-button" onClick={() => choose(i.id)}>
                  <span className="record-meta">
                    {i.id} <span> / {i.area}</span>
                  </span>
                  <strong>{i.title.replace(" (synthetic)", "")}</strong>
                  <small>{i.nextAction}</small>
                </button>
              </td>
              <td>
                <span className="owner">{i.owner}</span>
                <small className="muted">{i.externalDependency}</small>
              </td>
              <td>
                <span
                  className={`mono ${i.status === "open" && days(DEMO_DATE, i.dueDate) > 0 ? "overdue" : ""}`}
                >
                  {displayDate(i.dueDate)}
                </span>
                <small className="muted">
                  {i.status === "closed"
                    ? "Closed"
                    : days(DEMO_DATE, i.dueDate) > 0
                      ? `${days(DEMO_DATE, i.dueDate)}d overdue`
                      : i.dueDate === DEMO_DATE
                        ? "Today"
                        : "Upcoming"}
                </small>
              </td>
              <td className="numeric mono">
                {i.financialImpact ? money(i.financialImpact) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty text="No records match this view. Try another filter." />
  );
}
const mobileQuery = "(max-width: 720px)";
function subscribeMobile(callback: () => void) {
  const query = window.matchMedia(mobileQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
function mobileSnapshot() {
  return window.matchMedia(mobileQuery).matches;
}
function desktopSnapshot() {
  return false;
}
export function ControlRoom() {
  const inspectorRef = useRef<HTMLElement>(null);
  const isMobile = useSyncExternalStore(
    subscribeMobile,
    mobileSnapshot,
    desktopSnapshot,
  );
  const [state, setState] = useState<DemoState>(createSeed);
  const repository = useRef<SeedRepository>(new SeedRepository());
  const [module, setModule] = useState("Command Desk");
  const [selected, setSelected] = useState<string | null>("INV-1042");
  const [view, setView] = useState("Operator queue");
  const [filter, setFilter] = useState("All modes");
  const [search, setSearch] = useState("");
  const [horizon, setHorizon] = useState<7 | 14>(7);
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [evidence, setEvidence] = useState("");
  const [approver, setApprover] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = stateSchema.parse(JSON.parse(raw));
          repository.current = new SeedRepository(parsed);
          setState(parsed);
        }
      } catch {
        setNotice(
          "Saved demo data could not be restored. Fresh synthetic data loaded.",
        );
      }
      setReady(true);
    });
  }, []);
  const queue = deriveQueue(state, DEMO_DATE);
  const selectedItem = queue.find((i) => i.id === selected);
  const item =
    module === "Command Desk" &&
    view === "Need from founders" &&
    (selectedItem?.decisionOwner !== "Founder" ||
      selectedItem.status !== "open")
      ? undefined
      : selectedItem;
  const open = queue.filter((i) => i.status === "open");
  const decisions = founderQueue(queue);
  const atRisk = state.invoices
    .filter(
      (i) => i.paymentStatus === "unpaid" && days(DEMO_DATE, i.dueDate) > 0,
    )
    .reduce((n, i) => n + i.amount, 0);
  const overdue = open.filter((i) => days(DEMO_DATE, i.dueDate) > 0);
  const risks = forwardLook(state, DEMO_DATE, horizon);
  function choose(id: string) {
    if (isMobile)
      requestAnimationFrame(() =>
        inspectorRef.current?.scrollIntoView({ block: "start" }),
      );
    setSelected(id);
    setDraft("");
    setEvidence("");
    setApprover("");
    setConfirmed(false);
  }
  function changeView(nextView: string) {
    setView(nextView);
    if (nextView === "Need from founders") {
      if (decisions[0]) choose(decisions[0].itemId);
      else setSelected(null);
    }
  }
  function navigate(name: string) {
    setModule(name);
    setNavOpen(false);
    setSearch("");
    setFilter("All modes");
    setSelected(
      name === "Revenue Ops"
        ? "INV-1042"
        : name === "People Ops"
          ? "CAN-021"
          : name === "Contracts & Compliance"
            ? "CON-018"
            : name === "Company Ops"
              ? "EVT-011"
              : name === "Command Desk"
                ? "INV-1042"
                : null,
    );
    setDraft("");
    setEvidence("");
    setConfirmed(false);
  }
  function execute(command: OperatorCommand) {
    try {
      const next = repository.current.execute(command);
      setState(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
        setNotice("Saved locally · audit evidence recorded");
      } catch {
        setNotice(
          "Action recorded in this session. Browser storage unavailable.",
        );
      }
      setEvidence("");
      setConfirmed(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Action failed.");
    }
  }
  function reset() {
    if (!window.confirm("Reset all synthetic demo actions?")) return;
    const next = repository.current.reset();
    setState(next);
    localStorage.removeItem(storageKey);
    setNotice("Synthetic demo reset");
    choose("INV-1042");
  }
  async function generateDraft() {
    const invoice = state.invoices.find((i) => i.id === selected);
    if (!invoice) return;
    setDrafting(true);
    try {
      setDraft(
        await new MockDraftingProvider().draftCollection({
          client: invoice.client,
          invoiceNumber: invoice.number,
          amount: invoice.amount,
          currency: invoice.currency,
          dueDate: invoice.dueDate,
          context: invoice.notes,
        }),
      );
      setNotice("Draft prepared · no message sent");
    } catch {
      setNotice("Draft could not be prepared. Retry.");
    } finally {
      setDrafting(false);
    }
  }
  const current = modules.find((m) => m.name === module)!;
  let visible = queue.filter((i) =>
    view === "Need from founders"
      ? i.decisionOwner === "Founder" && i.status === "open"
      : view === "Closed"
        ? i.status === "closed"
        : view === "Due today"
          ? i.status === "open" && i.dueDate === DEMO_DATE
          : view === "This week"
            ? i.status === "open" &&
              days(i.dueDate, DEMO_DATE) >= 0 &&
              days(i.dueDate, DEMO_DATE) <= 7
            : view === "Overdue"
              ? i.status === "open" && days(DEMO_DATE, i.dueDate) > 0
              : view === "Blockers"
                ? i.status === "open" && i.externalDependency !== "None"
                : i.status === "open",
  );
  visible = visible.filter(
    (i) =>
      (filter === "All modes" || i.mode === filter) &&
      `${i.title} ${i.id} ${i.owner}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  function sourceButton(id: string, title: string) {
    return (
      <button className="record-link" onClick={() => choose(id)}>
        {title}
        <ChevronRight size={14} />
      </button>
    );
  }

  const invoice = state.invoices.find((i) => i.id === selected);
  const starter = state.starters.find((i) => i.id === selected);
  const candidate = state.candidates.find((i) => i.id === selected);
  const hiringEvent = state.hiringEvents.find(
    (e) => e.candidateId === selected,
  );
  const contract = state.contracts.find((i) => i.id === selected);
  const event = state.events.find((i) => i.id === selected);
  const rtw = state.rtw.find((i) => i.id === selected);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to workspace
      </a>
      {isMobile && navOpen && (
        <button
          className="nav-backdrop"
          aria-label="Dismiss navigation"
          onClick={() => setNavOpen(false)}
        />
      )}
      <aside
        className={`navigation ${navOpen ? "nav-open" : ""}`}
        aria-label="Main navigation"
        inert={isMobile && !navOpen}
      >
        <div className="brand">
          <div className="brand-mark">
            <Layers3 size={24} />
          </div>
          <div>
            <strong>BACKBONE</strong>
            <span>FOUNDER OPERATIONS</span>
          </div>
          <button
            className="mobile-close icon-button"
            onClick={() => setNavOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>
        <div className="workspace-label">
          <span className="live-dot" /> SYNTHETIC WORKSPACE{" "}
          <span className="workspace-number">01</span>
        </div>
        <div className="nav-section-label">OPERATING SYSTEM</div>
        <nav>
          {modules.map((m, index) => (
            <button
              key={m.name}
              className={`nav-item ${module === m.name ? "active" : ""}`}
              onClick={() => navigate(m.name)}
              aria-current={module === m.name ? "page" : undefined}
            >
              <m.icon size={18} />
              <span>{m.name}</span>
              {index === 0 ? (
                <span className="nav-count">{open.length}</span>
              ) : index === 6 ? (
                <span className="nav-count">
                  {forwardLook(state, DEMO_DATE, 14).length}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="navigation-footer">
          <div className="policy-marker">
            <ShieldCheck size={18} />
            <div>
              <strong>Human judgment, preserved</strong>
              <span>Demo policy v1 · deterministic rules</span>
            </div>
          </div>
          <p>
            Independent portfolio prototype.
            <br />
            All people and records are synthetic.
          </p>
          <button className="reset-button" onClick={reset}>
            <RotateCcw size={14} /> Reset demo
          </button>
          <div className="operator-avatar">
            <span>OP</span>
            <div>
              <strong>Operations owner</strong>
              <small>Operator workspace</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="command-strip">
          <div className="breadcrumb">
            <button
              className="icon-button menu-toggle"
              onClick={() => setNavOpen(true)}
              aria-label="Open navigation"
              aria-expanded={navOpen}
            >
              <PanelLeftClose size={18} />
            </button>
            <span>Workspace 01</span>
            <ChevronRight size={13} />
            <strong>{module}</strong>
          </div>
          <div className="command-meta">
            <span className="synthetic-label">SYNTHETIC DEMO</span>
            <span className="demo-clock">
              <CalendarDays size={14} />
              06 OCT 2026
            </span>
            <span className="operator-dot" />
          </div>
        </header>
        <main id="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">{current.kicker}</div>
              <h1>{module}</h1>
              <p>{current.description}</p>
            </div>
            <div className="heading-meta">
              {module === "Weekly Brief" ? (
                <button
                  className="secondary-button"
                  onClick={() => window.print()}
                >
                  <Printer size={15} /> Print brief
                </button>
              ) : (
                <>
                  <span className="mono">TUESDAY / WEEK 41</span>
                  <small>Fixed demo date · dates drive the rules</small>
                </>
              )}
            </div>
          </div>
          <div className="notice" role="status" aria-live="polite">
            {notice ||
              (!ready
                ? "Restoring workspace…"
                : "Demo workspace · changes stay in this browser. No external messages or transactions.")}
          </div>
          {module === "Command Desk" && (
            <>
              <section className="attention-band">
                <div>
                  <span className="attention-label">
                    <CircleDot size={14} /> NEED FROM FOUNDERS
                  </span>
                  <strong>
                    {decisions.length} decisions require founder judgment
                  </strong>
                  <span>
                    Everything else stays with the accountable operator or
                    specialist.
                  </span>
                </div>
                <button onClick={() => changeView("Need from founders")}>
                  Review decisions <ArrowRight size={16} />
                </button>
              </section>
              <div className="signal-line">
                <span>
                  <b>
                    {view === "Need from founders"
                      ? decisions.length
                      : open.length}
                  </b>{" "}
                  {view === "Need from founders"
                    ? "founder decisions"
                    : "open actions"}
                </span>
                <span>
                  <b>
                    {view === "Need from founders"
                      ? overdue.filter(
                          (i) =>
                            i.decisionOwner === "Founder" &&
                            i.severity === "material",
                        ).length
                      : overdue.length}
                  </b>{" "}
                  {view === "Need from founders"
                    ? "material overdue decisions"
                    : "overdue"}
                </span>
                <span>
                  <b className="mono">{money(atRisk)}</b> money at risk
                </span>
                {view !== "Need from founders" && (
                  <span>
                    <b>{forwardLook(state, DEMO_DATE, 7).length}</b> commitments
                    at risk in 7 days
                  </span>
                )}
              </div>
            </>
          )}
          <div
            className={`workspace-grid ${item && module !== "Weekly Brief" && module !== "Forward Look" ? "with-inspector" : ""}`}
          >
            <div className="module-content">
              {module === "Command Desk" && (
                <section className="work-panel">
                  <div
                    className="view-tabs"
                    role="group"
                    aria-label="Queue view"
                  >
                    {[
                      "Operator queue",
                      "Need from founders",
                      "Due today",
                      "This week",
                      "Overdue",
                      "Blockers",
                      "Closed",
                    ].map((v) => (
                      <button
                        key={v}
                        aria-pressed={view === v}
                        className={view === v ? "active" : ""}
                        onClick={() => changeView(v)}
                      >
                        {v}
                        {v === "Need from founders" && (
                          <span>{decisions.length}</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="table-toolbar">
                    <label className="search">
                      <Search size={15} />
                      <input
                        aria-label="Search operational records"
                        placeholder="Search records, owners or IDs…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                    <label className="filter">
                      <ListFilter size={14} />
                      <select
                        aria-label="Filter judgment mode"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      >
                        {["All modes", "ACT", "REVIEW", "ESCALATE"].map((m) => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                    </label>
                    <span className="result-count">
                      {visible.length} RECORDS
                    </span>
                  </div>
                  <QueueTable
                    items={visible}
                    selected={selected}
                    choose={choose}
                  />
                  <div className="panel-footer">
                    <span>
                      Explicit rules. Named owners. No opaque priority score.
                    </span>
                    <span>
                      <span className="live-dot" /> DEMO POLICY V1
                    </span>
                  </div>
                </section>
              )}
              {module === "Revenue Ops" && (
                <>
                  <div className="module-note">
                    <Wallet size={17} />
                    <span>
                      <strong>{money(atRisk)} overdue exposure</strong> · Demo
                      collection policy: 1–6d ACT / 7–13d REVIEW / 14+d
                      ESCALATE.
                    </span>
                  </div>
                  <section className="work-panel">
                    <div className="section-title">
                      <h2>Accounts receivable ledger</h2>
                      <span>GBP · synthetic records</span>
                    </div>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Invoice / client</th>
                            <th className="numeric">Amount</th>
                            <th>Ageing</th>
                            <th>Judgment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {state.invoices.map((i) => (
                            <tr
                              key={i.id}
                              className={selected === i.id ? "selected" : ""}
                            >
                              <td>
                                {sourceButton(
                                  i.id,
                                  `#${i.number} · ${i.client.replace(" (synthetic)", "")}`,
                                )}
                                <small className="muted">
                                  Issued {displayDate(i.issueDate)} · due{" "}
                                  {displayDate(i.dueDate)}
                                </small>
                              </td>
                              <td className="mono numeric">
                                {money(i.amount)}
                              </td>
                              <td>
                                <span
                                  className={
                                    i.paymentStatus === "paid"
                                      ? "verified"
                                      : days(DEMO_DATE, i.dueDate) >= 14
                                        ? "escalation-text"
                                        : "mono"
                                  }
                                >
                                  {i.paymentStatus === "paid"
                                    ? "Payment recorded"
                                    : days(DEMO_DATE, i.dueDate) > 0
                                      ? `${days(DEMO_DATE, i.dueDate)}d overdue`
                                      : `Due ${displayDate(i.dueDate)}`}
                                </span>
                                <small className="muted">
                                  {i.reconciled
                                    ? "Reconciled"
                                    : i.paymentStatus === "paid"
                                      ? "Reconciliation required"
                                      : `Next follow-up ${displayDate(queue.find((q) => q.id === i.id)!.dueDate)}`}
                                </small>
                              </td>
                              <td>
                                {i.reconciled ? (
                                  <span className="verified">
                                    <Check size={13} /> CLOSED
                                  </span>
                                ) : (
                                  <Badge
                                    mode={
                                      queue.find((q) => q.id === i.id)!.mode
                                    }
                                  />
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                  <section className="work-panel collection-policy">
                    <div className="section-title">
                      <h2>Collection timeline</h2>
                      <span>
                        Demo policy choices · not accounting standards
                      </span>
                    </div>
                    <div className="policy-timeline">
                      {[
                        {
                          label: "−3 days",
                          text: "Prepare reminder",
                          mode: "ACT",
                        },
                        {
                          label: "Due date",
                          text: "Confirm status",
                          mode: "ACT",
                        },
                        {
                          label: "1–6 overdue",
                          text: "Routine follow-up",
                          mode: "ACT",
                        },
                        {
                          label: "7–13 overdue",
                          text: "Review history",
                          mode: "REVIEW",
                        },
                        {
                          label: "14+ overdue",
                          text: "Material decision",
                          mode: "ESCALATE",
                        },
                      ].map((p) => (
                        <div key={p.label}>
                          <span className="mono">{p.label}</span>
                          <i className={p.mode.toLowerCase()} />
                          <strong>{p.text}</strong>
                          <small>{p.mode}</small>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}
              {module === "People Ops" && (
                <>
                  <section className="work-panel">
                    <div className="section-title">
                      <h2>Hiring pipeline</h2>
                      <span>Human decisions only · no candidate ranking</span>
                    </div>
                    <div className="pipeline">
                      {["Screen", "Interview", "Decision"].map((stage) => (
                        <div className="pipeline-lane" key={stage}>
                          <h3>
                            {stage}
                            <span>
                              {
                                state.candidates.filter(
                                  (c) => c.stage === stage,
                                ).length
                              }
                            </span>
                          </h3>
                          {state.candidates
                            .filter((c) => c.stage === stage)
                            .map((c) => (
                              <button
                                className={`candidate-card ${selected === c.id ? "selected" : ""}`}
                                key={c.id}
                                onClick={() => choose(c.id)}
                              >
                                <span className="record-meta">{c.id}</span>
                                <strong>{c.name}</strong>
                                <span>{c.role}</span>
                                <small>{c.nextAction}</small>
                                <span className="candidate-date">
                                  <Clock3 size={12} /> Decision{" "}
                                  {displayDate(c.decisionDate)}
                                </span>
                              </button>
                            ))}
                        </div>
                      ))}
                    </div>
                  </section>
                  <section className="work-panel">
                    <div className="section-title">
                      <h2>Operational follow-ups</h2>
                      <span>Evidence, scheduling & communication</span>
                    </div>
                    <QueueTable
                      items={queue.filter((i) => i.id.startsWith("CAN"))}
                      selected={selected}
                      choose={choose}
                    />
                  </section>
                  <section className="work-panel">
                    <div className="section-title">
                      <h2>New-starter readiness</h2>
                      <span>Mandatory checks gate Ready</span>
                    </div>
                    {state.starters.map((st) => (
                      <div className="starter-block" key={st.id}>
                        <div className="starter-heading">
                          <div>
                            {sourceButton(st.id, st.name)}
                            <p>
                              {st.role} · starts {displayDate(st.startDate)} ·{" "}
                              {st.manager}
                            </p>
                          </div>
                          <strong
                            className={
                              starterReady(st) ? "verified" : "attention-text"
                            }
                          >
                            {starterReady(st) ? "READY" : "NOT READY"} ·{" "}
                            {
                              st.checklist.filter(
                                (c) => c.mandatory && c.complete,
                              ).length
                            }
                            /{st.checklist.filter((c) => c.mandatory).length}
                          </strong>
                        </div>
                        <div className="checklist">
                          {st.checklist.map((check) => (
                            <button
                              key={check.id}
                              onClick={() => choose(st.id)}
                              className={
                                check.complete ? "complete" : "incomplete"
                              }
                            >
                              <span className="check-box">
                                {check.complete && <Check size={12} />}
                              </span>
                              <span>
                                {check.label}
                                {!check.mandatory && <small>Optional</small>}
                              </span>
                            </button>
                          ))}
                        </div>
                        <p className="inline-note">
                          Record checklist evidence in the inspector. RTW
                          completion means a named human review, never software
                          eligibility assessment.
                        </p>
                      </div>
                    ))}
                  </section>
                </>
              )}
              {module === "Contracts & Compliance" && (
                <>
                  <div className="module-note">
                    <ShieldCheck size={17} />
                    <span>
                      Contract operations and administrative tracking. Legal and
                      eligibility judgments remain with humans.
                    </span>
                  </div>
                  <section className="work-panel">
                    <div className="section-title">
                      <h2>Document register</h2>
                      <span>Synthetic templates & counterparties</span>
                    </div>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Counterparty / document</th>
                            <th>Template</th>
                            <th>Owner</th>
                            <th>Judgment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {state.contracts.map((c) => (
                            <tr
                              key={c.id}
                              className={selected === c.id ? "selected" : ""}
                            >
                              <td>
                                {sourceButton(
                                  c.id,
                                  c.counterparty.replace(" (synthetic)", ""),
                                )}
                                <small className="muted">
                                  {c.type} · {c.status}
                                </small>
                              </td>
                              <td className="mono">{c.template}</td>
                              <td>{c.owner}</td>
                              <td>
                                {queue.find((i) => i.id === c.id)!.status ===
                                "closed" ? (
                                  <span className="verified">
                                    Review resolved
                                  </span>
                                ) : (
                                  <Badge
                                    mode={
                                      queue.find((i) => i.id === c.id)!.mode
                                    }
                                  />
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                  <section className="work-panel">
                    <div className="section-title">
                      <h2>Synthetic NDA comparison</h2>
                      <span>Standard NDA v1.2 → incoming version</span>
                    </div>
                    <div className="comparison">
                      {(
                        state.contracts.find((c) => c.type === "Mutual NDA")
                          ?.clauses ?? []
                      ).map((c) => (
                        <div
                          key={c.title}
                          className={
                            c.standard !== c.incoming ? "changed-clause" : ""
                          }
                        >
                          <div className="clause-title">
                            <strong>{c.title}</strong>
                            <span>
                              {c.standard === c.incoming
                                ? "Unchanged"
                                : "Clause differs from template"}
                            </span>
                          </div>
                          <div className="clause-columns">
                            <p>
                              <small>STANDARD TEMPLATE</small>
                              {c.standard}
                            </p>
                            <p>
                              <small>INCOMING SYNTHETIC NDA</small>
                              {c.incoming}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="legal-notice">
                      <AlertTriangle size={16} /> Governing law and term
                      changed. Human/legal review required. This comparison
                      provides no signing recommendation.
                    </div>
                  </section>
                  <section className="work-panel">
                    <div className="section-title">
                      <h2>Right-to-work administration</h2>
                      <span>Evidence & review dates only</span>
                    </div>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Employee</th>
                            <th>Evidence / reviewer</th>
                            <th>Follow-up</th>
                            <th>Judgment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {state.rtw.map((r) => (
                            <tr key={r.id}>
                              <td>
                                {sourceButton(r.id, r.employee)}
                                <small className="muted">
                                  Expiry {displayDate(r.expiryDate)}
                                </small>
                              </td>
                              <td>
                                {r.evidenceReceived ? "Received" : "Missing"}
                                <small className="muted">{r.reviewer}</small>
                              </td>
                              <td className="mono">
                                {displayDate(r.followUpDate)}
                              </td>
                              <td>
                                <Badge
                                  mode={queue.find((i) => i.id === r.id)!.mode}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              )}
              {module === "Company Ops" && (
                <>
                  <section className="work-panel">
                    <div className="section-title">
                      <h2>Upcoming commitments</h2>
                      <span>Calendar & client logistics</span>
                    </div>
                    <div className="event-list">
                      {state.events.map((e) => (
                        <button
                          key={e.id}
                          className={`event-row ${selected === e.id ? "selected" : ""}`}
                          onClick={() => choose(e.id)}
                        >
                          <div className="calendar-tile">
                            <span>OCT</span>
                            <strong>{e.date.slice(-2)}</strong>
                          </div>
                          <div>
                            <strong>{e.title}</strong>
                            <p>
                              {e.time} · {e.place}
                            </p>
                            <small>
                              {e.openActions.length
                                ? `${e.openActions.length} open actions · ${e.openActions.join(" / ")}`
                                : "Calendar, materials and NDA confirmed"}
                            </small>
                          </div>
                          <Badge
                            mode={queue.find((i) => i.id === e.id)!.mode}
                          />
                          <ChevronRight size={16} />
                        </button>
                      ))}
                    </div>
                  </section>
                  <section className="work-panel">
                    <div className="section-title">
                      <h2>Office & supplier actions</h2>
                      <span>Approved work moves; exceptions are reviewed</span>
                    </div>
                    <QueueTable
                      items={queue.filter(
                        (i) => i.id.startsWith("VEN") || i.id.startsWith("STK"),
                      )}
                      selected={selected}
                      choose={choose}
                    />
                  </section>
                  <section className="work-panel">
                    <div className="section-title">
                      <h2>Asset register</h2>
                      <span>Equipment & handover</span>
                    </div>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Asset / ID</th>
                            <th>Assigned to</th>
                            <th>Cost / warranty</th>
                            <th>Condition</th>
                          </tr>
                        </thead>
                        <tbody>
                          {state.assets.map((a) => (
                            <tr key={a.id}>
                              <td>
                                <strong>{a.name}</strong>
                                <small className="mono muted">
                                  {a.id} · {a.supplier}
                                </small>
                              </td>
                              <td>
                                {a.assignedUser}
                                <small className="muted">
                                  {a.replacementState}
                                </small>
                              </td>
                              <td className="mono">
                                {money(a.cost)}
                                <small className="muted">
                                  Warranty {a.warranty}
                                </small>
                              </td>
                              <td>{a.condition}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                  <section className="work-panel">
                    <div className="section-title">
                      <h2>Stock register</h2>
                      <span>Transparent minimum thresholds</span>
                    </div>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Available / minimum</th>
                            <th>Supplier</th>
                            <th>Reorder state</th>
                          </tr>
                        </thead>
                        <tbody>
                          {state.stock.map((s) => (
                            <tr key={s.id}>
                              <td>{s.name}</td>
                              <td className="mono">
                                {s.quantity} / {s.minimum}
                              </td>
                              <td>{s.supplier}</td>
                              <td
                                className={
                                  s.quantity < s.minimum
                                    ? "attention-text"
                                    : "verified"
                                }
                              >
                                {s.quantity < s.minimum
                                  ? `Reorder · ${displayDate(s.reorderDate)}`
                                  : "Above minimum"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              )}
              {module === "Weekly Brief" && (
                <article className="brief">
                  <div className="brief-masthead">
                    <span>BACKBONE / FOUNDER MEMO</span>
                    <span>WEEK 41 · 06 OCTOBER 2026</span>
                  </div>
                  <h2>The operating week.</h2>
                  <p className="brief-deck">
                    Routine work stays with the operator. {decisions.length}{" "}
                    material decisions need your attention.
                  </p>
                  <p className="brief-source">
                    Generated from source states and demo rules. Synthetic data
                    only.
                  </p>
                  {weeklyBrief(state, DEMO_DATE).sections.map(
                    (section, index) => (
                      <section className="brief-section" key={section.title}>
                        <span className="brief-index">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <h3>{section.title}</h3>
                          {section.lines.length ? (
                            <ul>
                              {section.lines.map((line, i) => (
                                <li key={i}>{line}</li>
                              ))}
                            </ul>
                          ) : (
                            <p>No open exceptions in this section.</p>
                          )}
                        </div>
                      </section>
                    ),
                  )}
                  <section className="brief-decisions">
                    <span className="eyebrow">THE DECISIONS THAT MATTER</span>
                    <h3>NEED FROM FOUNDERS</h3>
                    {decisions.length ? (
                      decisions.map((d) => (
                        <div key={d.itemId}>
                          <strong>{d.title.replace(" (synthetic)", "")}</strong>
                          <p>{d.reason}</p>
                          <div className="decision-action">
                            <span>{d.nextAction}</span>
                            <span className="mono">
                              Due {displayDate(d.dueDate)}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p>No founder decisions outstanding.</p>
                    )}
                  </section>
                  <footer>
                    Independent portfolio prototype · deterministic memo · no
                    external distribution
                  </footer>
                </article>
              )}
              {module === "Forward Look" && (
                <>
                  <div className="forward-header">
                    <div
                      className="segmented"
                      aria-label="Forward look horizon"
                    >
                      {([7, 14] as const).map((n) => (
                        <button
                          className={horizon === n ? "active" : ""}
                          key={n}
                          aria-pressed={horizon === n}
                          onClick={() => setHorizon(n)}
                        >
                          {n} days
                        </button>
                      ))}
                    </div>
                    <p>
                      {risks.length} dated exceptions · inclusive horizon · no
                      predictive AI
                    </p>
                  </div>
                  <section className="forward-timeline">
                    {risks.length ? (
                      risks.map((r, index) => (
                        <div className="future-risk" key={r.id}>
                          <div className="future-date">
                            <span className="mono">{displayDate(r.date)}</span>
                            <small>+{days(r.date, DEMO_DATE)} days</small>
                          </div>
                          <div className="timeline-marker">
                            <span />
                            {index < risks.length - 1 && <i />}
                          </div>
                          <div className="future-body">
                            <div className="record-meta">
                              {r.sourceId} / {r.ruleId}
                            </div>
                            <button
                              onClick={() => {
                                choose(r.sourceId);
                                setModule(
                                  r.sourceId.startsWith("INV")
                                    ? "Revenue Ops"
                                    : r.sourceId.startsWith("CAN") ||
                                        r.sourceId.startsWith("ONB")
                                      ? "People Ops"
                                      : r.sourceId.startsWith("CON") ||
                                          r.sourceId.startsWith("RTW")
                                        ? "Contracts & Compliance"
                                        : "Company Ops",
                                );
                              }}
                            >
                              {r.title.replace(" (synthetic)", "")}
                              <ArrowRight size={16} />
                            </button>
                            <p>{r.reason}</p>
                            <span className="future-owner">
                              Accountable owner: {r.owner}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <Empty text="No dated operational risks within this horizon." />
                    )}
                  </section>
                  <div className="module-note">
                    <TrendingUp size={18} />
                    <span>
                      Every risk comes from a date, an incomplete state and a
                      named rule. Resolve the source to remove the risk.
                    </span>
                  </div>
                </>
              )}
            </div>
            {item && module !== "Weekly Brief" && module !== "Forward Look" && (
              <aside
                className="inspector"
                ref={inspectorRef}
                aria-label="Record inspector"
              >
                <header>
                  <span className="eyebrow">RECORD INSPECTOR</span>
                  <button
                    className="icon-button"
                    onClick={() => setSelected(null)}
                    aria-label="Close inspector"
                  >
                    <X size={17} />
                  </button>
                </header>
                <div className="inspector-body">
                  <div className="inspector-id">
                    {item.id} <span>{item.area.toUpperCase()}</span>
                  </div>
                  <h2>{item.title.replace(" (synthetic)", "")}</h2>
                  <div className="inspector-status">
                    <Badge mode={item.mode} />
                    <span
                      className={
                        item.status === "closed" ? "verified" : "muted"
                      }
                    >
                      {item.status === "closed" ? "Resolved" : "Open exception"}
                    </span>
                  </div>
                  <section
                    className={`judgment-box ${item.mode.toLowerCase()}`}
                  >
                    <span className="eyebrow">WHY {item.mode}?</span>
                    <p>{item.reason}</p>
                    <code>{item.rule_id} / DEMO POLICY V1</code>
                  </section>
                  <dl className="record-details">
                    <div>
                      <dt>Operator</dt>
                      <dd>{item.owner}</dd>
                    </div>
                    <div>
                      <dt>Decision owner</dt>
                      <dd>{item.decisionOwner || "Operator within policy"}</dd>
                    </div>
                    <div>
                      <dt>Due date</dt>
                      <dd className="mono">{item.dueDate}</dd>
                    </div>
                    <div>
                      <dt>Severity</dt>
                      <dd>{item.severity}</dd>
                    </div>
                    <div>
                      <dt>Dependency</dt>
                      <dd>{item.externalDependency}</dd>
                    </div>
                  </dl>
                  <section className="inspector-section">
                    <h3>Next action</h3>
                    <p className="next-action">
                      <ArrowRight size={15} />
                      {item.nextAction}
                    </p>
                  </section>
                  <section className="inspector-section">
                    <h3>Source evidence</h3>
                    <dl className="source-fields">
                      {Object.entries(item.sourceFields).map(([key, val]) => (
                        <div key={key}>
                          <dt>{key.replace(/([A-Z])/g, " $1")}</dt>
                          <dd>{String(val)}</dd>
                        </div>
                      ))}
                    </dl>
                    {invoice && (
                      <p className="source-note">
                        {invoice.notes}
                        <br />
                        Last contact {invoice.lastContact} · source follow-up{" "}
                        {invoice.nextFollowUp}
                      </p>
                    )}
                    {contract && (
                      <p className="source-note">
                        {contract.notes}
                        <br />
                        Document placeholder: {contract.documentLocation}
                        <br />
                        Renewal: {contract.renewalDate}
                      </p>
                    )}
                    {event && (
                      <dl className="source-fields">
                        <div>
                          <dt>Attendees</dt>
                          <dd>{event.attendees.join(", ")}</dd>
                        </div>
                        <div>
                          <dt>Travel</dt>
                          <dd>{event.travel}</dd>
                        </div>
                        <div>
                          <dt>Dietary</dt>
                          <dd>{event.dietary}</dd>
                        </div>
                        <div>
                          <dt>Time / place</dt>
                          <dd>
                            {event.time} / {event.place}
                          </dd>
                        </div>
                      </dl>
                    )}
                    {rtw && (
                      <p className="source-note">
                        Human check date {rtw.checkDate}. Status: {rtw.status}.
                        Tracks administration only; does not determine
                        eligibility.
                      </p>
                    )}
                    {candidate && (
                      <p className="source-note">
                        Screen: {candidate.screenStatus}
                        <br />
                        Communication: {candidate.communicationStatus}
                        <br />
                        Travel:{" "}
                        {candidate.travelRequired ? "Required" : "Not required"}
                        <br />
                        Interview: {hiringEvent?.at || "Not scheduled"} ·{" "}
                        {hiringEvent?.availability || "Awaiting scheduling"}
                      </p>
                    )}
                  </section>
                  {invoice && invoice.paymentStatus === "unpaid" && (
                    <section className="inspector-section">
                      <h3>Collection communication</h3>
                      <p className="muted">
                        Draft only. Review manually; this app cannot send.
                      </p>
                      <button
                        className="secondary-button full"
                        onClick={generateDraft}
                        disabled={drafting}
                      >
                        {drafting
                          ? "Preparing draft…"
                          : "Prepare collection draft"}
                        <ClipboardList size={14} />
                      </button>
                      {draft && (
                        <>
                          <label
                            className="field-label"
                            htmlFor="collection-draft"
                          >
                            Reviewable draft
                          </label>
                          <textarea
                            id="collection-draft"
                            className="draft-text"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                          />
                          <button
                            className="text-button"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(draft);
                                setNotice(
                                  "Draft copied for manual review. Nothing sent.",
                                );
                              } catch {
                                setNotice(
                                  "Select draft text to copy manually.",
                                );
                              }
                            }}
                          >
                            <ArrowDownToLine size={14} />
                            Copy draft
                          </button>
                        </>
                      )}
                    </section>
                  )}
                  <section className="inspector-section action-section">
                    <h3>Record operator action</h3>
                    <p className="muted">
                      Demo evidence only. Named approval is recorded, not
                      identity-verified.
                    </p>
                    <label className="field-label" htmlFor="action-evidence">
                      Action / approval evidence
                    </label>
                    <textarea
                      id="action-evidence"
                      placeholder="What was checked or approved? Include reference…"
                      value={evidence}
                      onChange={(e) => setEvidence(e.target.value)}
                      rows={3}
                    />
                    {invoice?.paymentStatus === "unpaid" && (
                      <>
                        <label className="confirm-label">
                          <input
                            type="checkbox"
                            checked={confirmed}
                            onChange={(e) => setConfirmed(e.target.checked)}
                          />
                          I manually verified payment receipt against evidence.
                        </label>
                        <button
                          className="primary-button full"
                          disabled={!evidence.trim() || !confirmed}
                          onClick={() =>
                            execute({
                              type: "record-payment",
                              recordId: item.id,
                              evidence,
                              confirmed,
                            })
                          }
                        >
                          Record payment received <Check size={14} />
                        </button>
                      </>
                    )}
                    {invoice?.paymentStatus === "paid" &&
                      !invoice.reconciled && (
                        <>
                          <label className="confirm-label">
                            <input
                              type="checkbox"
                              checked={confirmed}
                              onChange={(e) => setConfirmed(e.target.checked)}
                            />
                            Finance owner has checked reconciliation.
                          </label>
                          <button
                            className="primary-button full"
                            disabled={!evidence.trim() || !confirmed}
                            onClick={() =>
                              execute({
                                type: "reconcile",
                                recordId: item.id,
                                evidence,
                                approver: "Finance owner",
                              })
                            }
                          >
                            Record finance check
                          </button>
                        </>
                      )}
                    {starter && (
                      <div className="action-checklist">
                        {starter.checklist.map((c) => (
                          <button
                            key={c.id}
                            disabled={!evidence.trim()}
                            onClick={() =>
                              execute({
                                type: "checklist",
                                recordId: starter.id,
                                checkId: c.id,
                                complete: !c.complete,
                                evidence,
                              })
                            }
                          >
                            <span
                              className={`check-box ${c.complete ? "checked" : ""}`}
                            >
                              {c.complete && <Check size={12} />}
                            </span>
                            {c.label}
                            <small>
                              {c.complete ? "Reopen" : "Record complete"}
                            </small>
                          </button>
                        ))}
                        <span className="inline-note">
                          Enter evidence before changing a checklist item.
                        </span>
                      </div>
                    )}
                    {candidate &&
                      hiringEvent &&
                      hiringEvent.interviewers
                        .filter(
                          (p) => !hiringEvent.feedbackReceived.includes(p),
                        )
                        .map((p) => (
                          <button
                            className="secondary-button full"
                            key={p}
                            disabled={!evidence.trim()}
                            onClick={() =>
                              execute({
                                type: "feedback",
                                recordId: candidate.id,
                                interviewer: p,
                                evidence,
                              })
                            }
                          >
                            Record feedback · {p}
                          </button>
                        ))}
                    {!invoice &&
                      !starter &&
                      !candidate &&
                      item.status === "open" && (
                        <>
                          <label className="field-label" htmlFor="approver">
                            Named approver
                          </label>
                          <select
                            id="approver"
                            value={approver}
                            onChange={(e) => setApprover(e.target.value)}
                          >
                            <option value="">Select accountable person</option>
                            <option>
                              {item.decisionOwner || "Operations owner"}
                            </option>
                          </select>
                          <label className="confirm-label">
                            <input
                              type="checkbox"
                              checked={confirmed}
                              onChange={(e) => setConfirmed(e.target.checked)}
                            />
                            I have explicit human approval and closure evidence.
                          </label>
                          <button
                            className="primary-button full"
                            disabled={
                              !confirmed || !approver || !evidence.trim()
                            }
                            onClick={() =>
                              execute({
                                type: "close",
                                recordId: item.id,
                                approver,
                                evidence,
                              })
                            }
                          >
                            Record approved closure
                          </button>
                        </>
                      )}
                    <button
                      className="text-button"
                      disabled={!evidence.trim()}
                      onClick={() =>
                        execute({ type: "note", recordId: item.id, evidence })
                      }
                    >
                      Save note to audit history
                    </button>
                  </section>
                  <section className="inspector-section">
                    <h3>
                      Audit trail <span>{item.auditEvents.length}</span>
                    </h3>
                    <p className="audit-policy">{item.auditEvidence}</p>
                    {item.auditEvents.length ? (
                      item.auditEvents
                        .slice()
                        .reverse()
                        .map((a) => (
                          <div className="audit-event" key={a.id}>
                            <span className="audit-dot" />
                            <div>
                              <strong>{a.action}</strong>
                              <p>{a.evidence}</p>
                              <small>
                                {a.actor} ·{" "}
                                {new Date(a.at).toLocaleString("en-GB", {
                                  timeZone: "UTC",
                                })}{" "}
                                UTC
                              </small>
                            </div>
                          </div>
                        ))
                    ) : (
                      <p className="muted">
                        No operator changes yet. Source seeded for the synthetic
                        demo.
                      </p>
                    )}
                    <div className="record-times">
                      <span>Created {item.createdAt.slice(0, 10)}</span>
                      <span>Updated {item.updatedAt.slice(0, 10)}</span>
                    </div>
                  </section>
                </div>
              </aside>
            )}
          </div>
          <footer className="workspace-footer">
            <span>BACKBONE / Founder Operations Control System</span>
            <span>
              Independent portfolio prototype · not affiliated with Artificial
              Societies
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
