import { motion } from "framer-motion";
import { useState } from "react";
import { Shield, Brain, ChevronRight, User, Check, AlertTriangle, FileText, Send, MapPin, Map, Clock } from "lucide-react";
import { useAppStore, IntelligenceReport } from "../../store/appStore";

export function PEWOfficerPage() {
  const { intelligenceReports, delegateReport, submitDspActionToAdgp } = useAppStore();
  
  // Filter data based on report status
  const incomingInputs = intelligenceReports.filter(r => r.status === 'approved_adgp');
  const delegations = intelligenceReports.filter(r => r.status === 'delegated');
  const fieldReports = intelligenceReports.filter(r => r.fieldReport);

  const [activeTab, setActiveTab] = useState("Incoming CIU Input");
  const [selectedInput, setSelectedInput] = useState<IntelligenceReport | null>(null);
  const [delegationForm, setDelegationForm] = useState(false);
  const [dspActionReports, setDspActionReports] = useState<Record<string, string>>({});

  // Field states
  const [fieldOfficer, setFieldOfficer] = useState("");
  const [district, setDistrict] = useState("");

  const handleDelegate = () => {
    if (selectedInput && district && fieldOfficer) {
      delegateReport(selectedInput.id, district, fieldOfficer);
      setDelegationForm(false);
      setSelectedInput(null);
      setDistrict("");
      setFieldOfficer("");
      setActiveTab("Active Delegations");
    }
  };

  const handleSubmitDspAction = (id: string) => {
    const actionContent = dspActionReports[id];
    if (actionContent) {
      submitDspActionToAdgp(id, actionContent);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6" style={{ color: "hsl(var(--primary))" }} />
            PEW Operations
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage intelligence inputs, field delegation, and action reports</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b mx-6 mt-4" style={{ borderColor: "hsl(var(--border))" }}>
        {["Incoming CIU Input", "Active Delegations", "Field Reports & DSP Action"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-semibold transition-colors relative ${
              activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t" style={{ background: "hsl(var(--primary))" }} />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        
        {/* ── INCOMING CIU INPUT ── */}
        {activeTab === "Incoming CIU Input" && (
          <div className="space-y-4 max-w-4xl">
            {incomingInputs.length === 0 ? (
              <div className="text-center p-8 bg-muted/10 border rounded-lg" style={{ borderColor: 'hsl(var(--border))' }}>
                <p className="text-sm font-semibold text-muted-foreground">No pending CIU inputs awaiting delegation.</p>
              </div>
            ) : incomingInputs.map((input, idx) => {
               // Use the first offender data for summary display
               const primaryOffender = input.offenders[0] || {};
               return (
                <motion.div 
                  key={input.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="stat-card"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-lg text-foreground">Intelligence Report: {input.location}</p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: "hsl(var(--risk-low) / 0.15)", color: "hsl(var(--risk-low))" }}>
                          Approved by ADGP
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Target: <span className="font-mono text-accent">{primaryOffender.name || 'Unknown'}</span> · District: {input.district} · Date: {input.date}
                      </p>
                    </div>
                    <span className={`risk-badge-${(primaryOffender.risk || 'low').toLowerCase()}`}>{(primaryOffender.risk || 'Low').toUpperCase()}</span>
                  </div>
                  
                  <div className="p-3 rounded-md mb-4" style={{ background: "hsl(var(--muted) / 0.5)" }}>
                    <p className="text-sm text-foreground"><span className="font-semibold">Summary:</span> {primaryOffender.description || primaryOffender.activity || 'No detailed summary provided.'}</p>
                  </div>

                  <div className="flex justify-end">
                    <button 
                      onClick={() => {
                        setSelectedInput(input);
                        setDelegationForm(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded shadow text-sm font-semibold transition-opacity hover:opacity-90"
                      style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
                    >
                      <User className="h-4 w-4" /> Delegate to Field Officer
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ── ACTIVE DELEGATIONS ── */}
        {activeTab === "Active Delegations" && (
          <div className="rounded-lg border overflow-hidden max-w-4xl" style={{ borderColor: "hsl(var(--border))" }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40" style={{ borderColor: "hsl(var(--border))" }}>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">Intelligence ID</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">Field Officer</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">District</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">Date Assigned</th>
                </tr>
              </thead>
              <tbody>
                {delegations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">No active delegations at this time.</td>
                  </tr>
                ) : delegations.map((del, i) => (
                  <tr key={del.id} className={`border-b transition-colors hover:bg-muted/30 ${i % 2 === 0 ? "" : "bg-muted/10"}`} style={{ borderColor: "hsl(var(--border))" }}>
                    <td className="py-3 px-4 font-mono text-xs font-semibold" style={{ color: "hsl(var(--accent))" }}>{del.id}</td>
                    <td className="py-3 px-4 text-foreground font-medium">{del.delegation?.officer}</td>
                    <td className="py-3 px-4 text-muted-foreground">{del.delegation?.district}</td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: "hsl(var(--risk-medium) / 0.15)", color: "hsl(var(--risk-medium))" }}>
                        In Progress
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {del.delegation?.assignedDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── FIELD REPORTS & DSP ACTION ── */}
        {activeTab === "Field Reports & DSP Action" && (
          <div className="space-y-4 max-w-4xl">
            {fieldReports.length === 0 ? (
              <div className="text-center p-8 bg-muted/10 border rounded-lg" style={{ borderColor: 'hsl(var(--border))' }}>
                <p className="text-sm font-semibold text-muted-foreground">No field reports submitted yet.</p>
              </div>
            ) : fieldReports.map((report, idx) => (
              <div key={report.id} className="stat-card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-foreground">Report from {report.delegation?.officer}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Intelligence ID: <span className="font-mono text-accent">{report.id}</span> · {report.fieldReport?.date}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ 
                    background: report.fieldReport?.status === 'Pending DSP Action' ? "hsl(var(--risk-high) / 0.15)" : "hsl(var(--risk-low) / 0.15)", 
                    color: report.fieldReport?.status === 'Pending DSP Action' ? "hsl(var(--risk-high))" : "hsl(var(--risk-low))"
                  }}>
                    {report.fieldReport?.status}
                  </span>
                </div>
                
                <div className="p-4 border rounded-md mb-4 bg-muted/20" style={{ borderColor: "hsl(var(--border))" }}>
                  <p className="text-sm text-foreground">{report.fieldReport?.content}</p>
                </div>

                {report.fieldReport?.status === 'Pending DSP Action' ? (
                  <div className="border-t pt-4 mt-2" style={{ borderColor: "hsl(var(--border))" }}>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Send className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
                      DSP Action Report to ADGP
                    </h4>
                    <textarea 
                      className="w-full h-24 rounded-lg border p-3 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary transition-all resize-none" 
                      style={{ borderColor: "hsl(var(--border))" }}
                      placeholder="Enter final action details and remarks for ADGP approval..."
                      value={dspActionReports[report.id] || ""}
                      onChange={(e) => setDspActionReports(prev => ({ ...prev, [report.id]: e.target.value }))}
                    />
                    <div className="flex justify-end mt-3">
                      <button 
                        onClick={() => handleSubmitDspAction(report.id)}
                        disabled={!dspActionReports[report.id]}
                        className="flex items-center gap-2 px-5 py-2 rounded-lg shadow text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                        style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
                      >
                        <Check className="h-4 w-4" /> Submit Report to ADGP
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-t pt-4 mt-2" style={{ borderColor: "hsl(var(--border))" }}>
                     <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      DSP Action Submitted to ADGP
                    </h4>
                    <div className="p-4 border rounded-md bg-muted/10 opacity-70" style={{ borderColor: "hsl(var(--border))" }}>
                      <p className="text-sm text-foreground">{report.fieldReport?.adgpAction}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delegation Form Overlay */}
      {delegationForm && selectedInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-card border rounded-xl shadow-lg relative flex flex-col p-6"
            style={{ borderColor: "hsl(var(--border))" }}
          >
            <h2 className="text-lg font-bold text-foreground mb-1">Delegate Task</h2>
            <p className="text-sm text-muted-foreground mb-6">Assign Intelligence <span className="font-mono text-accent">{selectedInput.id}</span> to a field officer.</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Select District</label>
                <select 
                  className="w-full rounded-md border p-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  style={{ borderColor: "hsl(var(--border))" }}
                  value={district}
                  onChange={e => setDistrict(e.target.value)}
                >
                  <option value="">-- Choose District --</option>
                  <option value="Madurai">Madurai</option>
                  <option value="Coimbatore">Coimbatore</option>
                  <option value="Chennai">Chennai</option>
                  <option value="Trichy">Trichy</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Assign Field Officer</label>
                <select 
                  className="w-full rounded-md border p-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  style={{ borderColor: "hsl(var(--border))" }}
                  value={fieldOfficer}
                  onChange={e => setFieldOfficer(e.target.value)}
                >
                  <option value="">-- Choose Officer --</option>
                  <option value="Inspector Rajan">Inspector Rajan</option>
                  <option value="SI Murugan">SI Murugan</option>
                  <option value="DSP Kavitha">DSP Kavitha</option>
                </select>
              </div>
              
              <div className="pt-4 flex items-center justify-end gap-3 border-t mt-2" style={{ borderColor: "hsl(var(--border))" }}>
                <button 
                  onClick={() => setDelegationForm(false)}
                  className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDelegate}
                  disabled={!district || !fieldOfficer}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg shadow text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
                >
                  Confirm Delegation
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
