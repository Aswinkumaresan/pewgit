import { motion } from "framer-motion";
import { useState } from "react";
import { useAppStore, ApprovalRole, ReportStatus, IntelligenceReport } from "../../store/appStore";
import { ShieldAlert, CheckCircle, XCircle, ArrowRight, Clock, MessageSquare, Edit2, Save, X, Download, FileText } from "lucide-react";

const getRoleStatusMap = (role: ApprovalRole): ReportStatus => {
  switch (role) {
    case 'DSP': return 'pending_dsp';
    case 'SPCIU': return 'pending_spciu';
    case 'DIG': return 'pending_dig';
    case 'ADGP': return 'pending_adgp';
    default: return 'pending_dsp';
  }
};

const getNextStatus = (role: ApprovalRole): ReportStatus => {
  switch (role) {
    case 'DSP': return 'pending_spciu';
    case 'SPCIU': return 'pending_dig';
    case 'DIG': return 'pending_adgp';
    case 'ADGP': return 'approved_adgp';
    default: return 'pending_dsp';
  }
};

export function ApprovalDashboard() {
  const { 
    currentUserRole, 
    setCurrentUserRole, 
    intelligenceReports, 
    updateReportStatus,
    updateOffenderDetails
  } = useAppStore();
  
  const [selectedReport, setSelectedReport] = useState<IntelligenceReport | null>(null);
  const [comment, setComment] = useState("");
  const [editingOffenderIndex, setEditingOffenderIndex] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});

  const pendingStatus = getRoleStatusMap(currentUserRole);
  const pendingReports = intelligenceReports.filter(r => r.status === pendingStatus);
  const historyReports = intelligenceReports.filter(
    r => r.history.some(h => h.role === currentUserRole && h.action !== 'submitted')
  );

  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  const handleApprove = () => {
    if (!selectedReport) return;
    const nextStatus = getNextStatus(currentUserRole);
    updateReportStatus(selectedReport.id, nextStatus, currentUserRole, 'approved', comment);
    setSelectedReport(null);
    setComment("");
  };

  const handleReject = () => {
    if (!selectedReport) return;
    updateReportStatus(selectedReport.id, 'rejected', currentUserRole, 'rejected', comment);
    setSelectedReport(null);
    setComment("");
    setEditingOffenderIndex(null);
  };

  const startEditing = (index: number, offender: any) => {
    setEditingOffenderIndex(index);
    setEditFormData({ ...offender });
  };

  const cancelEditing = () => {
    setEditingOffenderIndex(null);
    setEditFormData({});
  };

  const saveOffenderDetails = () => {
    if (!selectedReport || editingOffenderIndex === null) return;
    updateOffenderDetails(selectedReport.id, editingOffenderIndex, editFormData);
    // Update local selected report state to reflect changes immediately
    setSelectedReport(prev => {
      if (!prev) return prev;
      const newOffenders = [...prev.offenders];
      newOffenders[editingOffenderIndex] = { ...newOffenders[editingOffenderIndex], ...editFormData };
      return { ...prev, offenders: newOffenders };
    });
    setEditingOffenderIndex(null);
  };

  const exportToWord = () => {
    if (!selectedReport) return;
    
    // Create HTML content for the Word document
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>Intelligence Report ${selectedReport.id}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          h1, h2, h3 { color: #1a365d; margin-bottom: 10px; }
          .header { border-bottom: 2px solid #1a365d; padding-bottom: 10px; margin-bottom: 20px; }
          .meta-info { margin-bottom: 20px; font-size: 14px; }
          .section { margin-bottom: 25px; }
          .offender-card { border: 1px solid #ccc; padding: 15px; margin-bottom: 15px; background: #f9f9f9; }
          .timeline { margin-top: 20px; }
          .timeline-item { margin-bottom: 10px; font-size: 14px; }
          .label { font-weight: bold; color: #555; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Intelligence Report: ${selectedReport.id}</h1>
          <p><strong>District:</strong> ${selectedReport.district}</p>
          <p><strong>Location:</strong> ${selectedReport.location}</p>
        </div>
        
        <div class="meta-info">
          <p><span class="label">Initiated By:</span> ${selectedReport.source}</p>
          <p><span class="label">Date/Time:</span> ${selectedReport.date} ${selectedReport.time}</p>
          <p><span class="label">Current Status:</span> ${selectedReport.status.replace('_', ' ').toUpperCase()}</p>
        </div>

        <div class="section">
          <h2>Offenders Involved (${selectedReport.offenders.length})</h2>
          ${selectedReport.offenders.map(o => `
            <div class="offender-card">
              <h3>${[o.firstName, o.lastName, o.surName].filter(Boolean).join(' ') || 'Unknown'} ${o.aliasName ? `(Alias: ${o.aliasName})` : ''} (${o.type.toUpperCase()})</h3>
              <p><span class="label">Risk Level:</span> ${o.risk || 'Not Specified'}</p>
              <p><span class="label">Address:</span> ${o.address || 'N/A'}</p>
              ${o.idProofNumber ? `<p><span class="label">ID Proof Number:</span> ${o.idProofNumber}</p>` : ''}
              ${o.description ? `<p><span class="label">Description:</span> ${o.description}</p>` : ''}
              ${o.activity ? `<p><span class="label">Activity:</span> ${o.activity}</p>` : ''}
              ${o.vehicle ? `<p><span class="label">Vehicle:</span> ${o.vehicle}</p>` : ''}
            </div>
          `).join('')}
        </div>

        <div class="section timeline">
          <h2>Approval Timeline</h2>
          <ul>
            ${selectedReport.history.map(h => `
              <li class="timeline-item">
                <strong>${h.role}</strong> - ${h.action.toUpperCase()} on ${new Date(h.date).toLocaleString()}
                ${h.comment ? `<br/><em>Comment: "${h.comment}"</em>` : ''}
              </li>
            `).join('')}
          </ul>
        </div>
      </body>
      </html>
    `;

    // Create a Blob and trigger download
    const blob = new Blob(['\ufeff', htmlContent], {
      type: 'application/msword;charset=utf-8'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Intelligence_Report_${selectedReport.id}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    // In a real app we'd use a library like jspdf or react-to-pdf.
    // Here we use window.print() combined with a print stylesheet class to generate a functional PDF
    if (!selectedReport) return;
    
    // Add a class to body to trigger print-specific CSS rules (we will add these to index.css)
    document.body.classList.add('print-report-mode');
    setTimeout(() => {
      window.print();
      document.body.classList.remove('print-report-mode');
    }, 100);
  };

  // Only allow CIU, PEW_DSP and the active approval roles
  const roles: ApprovalRole[] = ['CIU', 'DSP', 'SPCIU', 'DIG', 'ADGP', 'PEW_DSP'];

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto space-y-6">
      
      {/* Dev Tool: Role Switcher */}
      <div className="bg-muted/20 p-4 rounded-xl border border-dashed text-sm flex items-center justify-between" style={{ borderColor: 'hsl(var(--border))' }}>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-muted-foreground">Demo Role Switcher:</span>
          <div className="flex gap-2">
            {roles.map(role => (
              <button
                key={role}
                onClick={() => setCurrentUserRole(role)}
                className={`px-3 py-1 rounded text-xs font-bold transition-colors ${currentUserRole === role ? 'bg-primary text-white' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Currently acting as <span className="font-bold text-foreground">{currentUserRole}</span>
        </div>
      </div>


      {/* ─── CIU VIEW: Shows Reports Submitted by CIU ──────────────── */}
      {currentUserRole === 'CIU' && (() => {
        const ciuReports = intelligenceReports.filter(r => r.source === 'CIU');
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground">My Submitted Reports</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{ciuReports.length} reports submitted by CIU</p>
              </div>
            </div>
            {ciuReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center bg-card border rounded-xl">
                <ShieldAlert className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
                <h3 className="text-sm font-bold text-foreground mb-1">No Reports Submitted Yet</h3>
                <p className="text-xs text-muted-foreground">Use the CIU Initiated tab to submit a new intelligence report.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {ciuReports.map(report => {
                  const lastHistory = report.history[report.history.length - 1];
                  const statusLabel: Record<string, { label: string; color: string }> = {
                    pending_dsp: { label: 'Pending DSP', color: 'text-yellow-600 bg-yellow-100' },
                    pending_spciu: { label: 'Pending SPCIU', color: 'text-orange-600 bg-orange-100' },
                    pending_dig: { label: 'Pending DIG', color: 'text-blue-600 bg-blue-100' },
                    pending_adgp: { label: 'Pending ADGP', color: 'text-purple-600 bg-purple-100' },
                    approved_adgp: { label: 'ADGP Approved ✓', color: 'text-green-700 bg-green-100' },
                    delegated: { label: 'Delegated', color: 'text-cyan-600 bg-cyan-100' },
                    rejected: { label: 'Rejected', color: 'text-red-600 bg-red-100' },
                  };
                  const statusInfo = statusLabel[report.status] || { label: report.status, color: 'text-muted-foreground bg-muted' };
                  return (
                    <div key={report.id} className="bg-card border rounded-xl overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>
                      {/* Header */}
                      <div className="flex justify-between items-start p-4 border-b bg-muted/10" style={{ borderColor: 'hsl(var(--border))' }}>
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="h-4 w-4 text-primary" />
                          <span className="font-bold text-sm text-foreground">{report.id}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusInfo.color}`}>{statusInfo.label}</span>
                      </div>
                      {/* Body */}
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                          <div><span className="text-muted-foreground">Date:</span> <span className="font-medium text-foreground">{report.date}</span></div>
                          <div><span className="text-muted-foreground">Time:</span> <span className="font-medium text-foreground">{report.time || '—'}</span></div>
                          <div><span className="text-muted-foreground">Location:</span> <span className="font-medium text-foreground">{report.location || '—'}</span></div>
                          <div><span className="text-muted-foreground">District:</span> <span className="font-medium text-foreground">{report.district || '—'}</span></div>
                        </div>
                        {/* Offenders */}
                        {report.offenders.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Offenders ({report.offenders.length})</p>
                            <div className="space-y-2">
                              {report.offenders.map((o, i) => (
                                <div key={i} className="flex justify-between items-start text-xs bg-muted/20 rounded-lg p-2.5 border" style={{ borderColor: 'hsl(var(--border))' }}>
                                  <div>
                                    <span className="font-semibold text-foreground">{[o.firstName, o.lastName, o.surName].filter(Boolean).join(' ') || 'Unknown'}</span>
                                    {(o as any).aliasName && <span className="text-muted-foreground ml-1">({(o as any).aliasName})</span>}
                                    {(o as any).idProofNumber && <p className="text-muted-foreground font-mono mt-0.5">ID: {(o as any).idProofNumber}</p>}
                                    {o.address && <p className="text-muted-foreground mt-0.5">{o.address}</p>}
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    <span className="uppercase text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded">{o.type}</span>
                                    {o.risk && <span className={`text-[10px] font-semibold ${o.risk.toLowerCase() === 'high' ? 'text-red-600' : o.risk.toLowerCase() === 'medium' ? 'text-yellow-600' : 'text-green-600'}`}>{o.risk} Risk</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Timeline */}
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Approval Timeline</p>
                          <div className="flex gap-2 flex-wrap">
                            {report.history.map((h, i) => (
                              <div key={i} className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-semibold ${h.action === 'approved' ? 'bg-green-100 text-green-700' : h.action === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-muted text-muted-foreground'}`}>
                                {h.role}: {h.action}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ─── PEW_DSP VIEW: ADGP-approved reports ready for delegation ── */}
      {currentUserRole === 'PEW_DSP' && (() => {
        const approvedReports = intelligenceReports.filter(r => r.status === 'approved_adgp' || r.status === 'delegated');
        return (
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-foreground">ADGP Approved Reports — Action Required</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Reports that have been approved by ADGP and forwarded to PEW DSP for delegation</p>
            </div>
            {approvedReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center bg-card border rounded-xl">
                <Clock className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
                <h3 className="text-sm font-bold text-foreground mb-1">No Reports Awaiting Action</h3>
                <p className="text-xs text-muted-foreground">Reports will appear here once ADGP approves them.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {approvedReports.map(report => {
                  const adgpAction = report.history.find(h => h.role === 'ADGP');
                  const isApproved = report.status === 'approved_adgp';
                  return (
                    <div key={report.id} className="bg-card border rounded-xl overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>
                      {/* Header */}
                      <div className="p-4 border-b bg-green-50 dark:bg-green-950/20 flex justify-between items-start" style={{ borderColor: 'hsl(var(--border))' }}>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="font-bold text-sm text-foreground">{report.id}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${isApproved ? 'bg-green-100 text-green-700' : 'bg-cyan-100 text-cyan-700'}`}>
                          {isApproved ? 'ADGP Approved — Awaiting Delegation' : 'Delegated ✓'}
                        </span>
                      </div>
                      {/* ADGP Approval stamp */}
                      {adgpAction && (
                        <div className="mx-4 mt-4 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                          <p className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase mb-1">ADGP Approval</p>
                          <div className="flex items-center gap-3 text-xs">
                            <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                            <div>
                              <span className="font-semibold text-foreground">Approved on {new Date(adgpAction.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              {adgpAction.comment && <p className="text-muted-foreground mt-0.5 italic">"{adgpAction.comment}"</p>}
                            </div>
                          </div>
                        </div>
                      )}
                      {/* Report Body */}
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                          <div><span className="text-muted-foreground">Date:</span> <span className="font-medium text-foreground">{report.date}</span></div>
                          <div><span className="text-muted-foreground">District:</span> <span className="font-medium text-foreground">{report.district || '—'}</span></div>
                          <div className="col-span-2"><span className="text-muted-foreground">Location:</span> <span className="font-medium text-foreground">{report.location || '—'}</span></div>
                        </div>
                        {/* Offenders summary */}
                        {report.offenders.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Offenders Involved ({report.offenders.length})</p>
                            <div className="space-y-1.5">
                              {report.offenders.map((o, i) => (
                                <div key={i} className="flex justify-between items-center text-xs rounded-lg p-2 bg-muted/20 border" style={{ borderColor: 'hsl(var(--border))' }}>
                                  <span className="font-semibold text-foreground">{[o.firstName, o.lastName].filter(Boolean).join(' ') || 'Unknown'} <span className={`font-normal ${o.risk?.toLowerCase() === 'high' ? 'text-red-600' : o.risk?.toLowerCase() === 'medium' ? 'text-yellow-600' : 'text-green-600'}`}>({o.risk})</span></span>
                                  <span className="uppercase text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded">{o.type}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Full approval chain */}
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Full Approval Chain</p>
                          <div className="space-y-1.5">
                            {report.history.map((h, i) => (
                              <div key={i} className={`flex items-center gap-3 p-2 rounded-lg text-xs border ${h.action === 'approved' ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' : h.action === 'rejected' ? 'bg-red-50 border-red-200' : 'bg-muted/20 border-border'}`}>
                                {h.action === 'approved' ? <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" /> : h.action === 'rejected' ? <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" /> : <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                                <span className="font-bold w-14">{h.role}</span>
                                <span className="capitalize text-muted-foreground flex-1">{h.action === 'submitted' ? 'Initiated report' : h.action}</span>
                                <span className="text-muted-foreground">{new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ─── APPROVER VIEW (DSP/SPCIU/DIG/ADGP) ────────────────────── */}
      {!['CIU', 'PEW_DSP'].includes(currentUserRole) && (
        <>
          <div className="flex items-center gap-1 border-b" style={{ borderColor: "hsl(var(--border))" }}>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-5 py-2.5 text-sm font-semibold transition-colors relative ${activeTab === 'pending' ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Pending Approvals ({pendingReports.length})
              {activeTab === 'pending' && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t" style={{ background: "hsl(var(--primary))" }} />}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-5 py-2.5 text-sm font-semibold transition-colors relative ${activeTab === 'history' ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              My History ({historyReports.length})
              {activeTab === 'history' && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t" style={{ background: "hsl(var(--primary))" }} />}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* List View */}
            <div className="space-y-4">
              {activeTab === 'pending' && pendingReports.length === 0 && (
                <div className="text-center p-8 bg-muted/10 border rounded-lg" style={{ borderColor: 'hsl(var(--border))' }}>
                  <p className="text-sm font-semibold text-muted-foreground">No pending reports for {currentUserRole}</p>
                </div>
              )}
              {activeTab === 'history' && historyReports.length === 0 && (
                <div className="text-center p-8 bg-muted/10 border rounded-lg" style={{ borderColor: 'hsl(var(--border))' }}>
                  <p className="text-sm font-semibold text-muted-foreground">No approval history found for {currentUserRole}</p>
                </div>
              )}

              {((activeTab === 'pending' ? pendingReports : historyReports)).map((report) => (
                <motion.div 
                  key={report.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => { setActiveTab('pending'); setSelectedReport(report); }}
                  className={`bg-card border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${selectedReport?.id === report.id ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}`}
                  style={{ borderColor: "hsl(var(--border))" }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-primary" />
                      <h4 className="font-bold text-sm text-foreground">{report.id}</h4>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-muted font-mono text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {report.date} {report.time}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    <span className="font-semibold text-foreground">Location:</span> {report.location}, {report.district}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded-md font-medium">
                      {report.offenders.length} Offender(s)
                    </span>
                    <span className="bg-muted px-2 py-1 rounded-md text-muted-foreground font-medium">
                      Source: {report.source}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Detail View */}
            {selectedReport ? (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-card border rounded-xl overflow-hidden shadow-sm flex flex-col h-full print-container"
                id="report-print-container"
                style={{ borderColor: "hsl(var(--border))" }}
              >
                <div className="p-4 border-b bg-muted/20 flex justify-between items-start" style={{ borderColor: "hsl(var(--border))" }}>
                  <div>
                    <h3 className="font-bold text-foreground">Report {selectedReport.id} Validation</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Please review the details below before acting.</p>
                  </div>
                  <div className="flex gap-2 no-print">
                    <button 
                      onClick={exportToPDF}
                      className="p-1.5 rounded-md border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors tooltip-trigger"
                      title="Download as PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={exportToWord}
                      className="p-1.5 rounded-md border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors tooltip-trigger"
                      title="Download as Word"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-2">
                      <Clock className="w-3 h-3" /> REPORT TIMELINE
                    </h4>
                    <div className="bg-muted/10 rounded-lg p-3 text-sm border space-y-2" style={{ borderColor: 'hsl(var(--border))' }}>
                      {selectedReport.history.map((h, i) => (
                        <div key={i} className="flex gap-3 text-xs">
                          <span className="text-muted-foreground w-12">{new Date(h.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          <span className="font-bold w-12 text-foreground">{h.role}</span>
                          <span className="flex-1 opacity-80">
                            {h.action === 'submitted' ? 'Initiated report' : h.action === 'approved' ? 'Approved report' : 'Rejected report'}
                            {h.comment && <div className="mt-1 italic opacity-70">"{h.comment}"</div>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground mb-2">OFFENDERS INVOLVED</h4>
                    <div className="space-y-3">
                      {selectedReport.offenders.map((o, i) => (
                        <div key={i} className="border rounded-lg p-3 bg-background relative group" style={{ borderColor: "hsl(var(--border))" }}>
                          
                          {editingOffenderIndex === i ? (
                            <div className="space-y-3">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-primary">Editing Offender</span>
                                <div className="flex gap-2">
                                  <button onClick={cancelEditing} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                                    <X className="w-4 h-4" />
                                  </button>
                                  <button onClick={saveOffenderDetails} className="p-1 text-primary hover:opacity-80 transition-colors">
                                    <Save className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[10px] font-semibold text-muted-foreground">First Name</label>
                                  <input type="text" className="w-full text-xs p-1.5 rounded border bg-muted/30 uppercase" 
                                    value={editFormData.firstName || ''} onChange={e => setEditFormData({...editFormData, firstName: e.target.value})} />
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold text-muted-foreground">Last Name</label>
                                  <input type="text" className="w-full text-xs p-1.5 rounded border bg-muted/30 uppercase" 
                                    value={editFormData.lastName || ''} onChange={e => setEditFormData({...editFormData, lastName: e.target.value})} />
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold text-muted-foreground">Sur Name</label>
                                  <input type="text" className="w-full text-xs p-1.5 rounded border bg-muted/30 uppercase" 
                                    value={editFormData.surName || ''} onChange={e => setEditFormData({...editFormData, surName: e.target.value})} />
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold text-muted-foreground">Alias Name</label>
                                  <input type="text" className="w-full text-xs p-1.5 rounded border bg-muted/30 uppercase" 
                                    value={editFormData.aliasName || ''} onChange={e => setEditFormData({...editFormData, aliasName: e.target.value})} />
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold text-muted-foreground">ID Proof Number</label>
                                  <input type="text" className="w-full text-xs p-1.5 rounded border bg-muted/30 uppercase" 
                                    value={editFormData.idProofNumber || ''} onChange={e => setEditFormData({...editFormData, idProofNumber: e.target.value})} />
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold text-muted-foreground">Risk Level</label>
                                  <select className="w-full text-xs p-1.5 rounded border bg-muted/30" 
                                    value={editFormData.risk || 'Low'} onChange={e => setEditFormData({...editFormData, risk: e.target.value})}>
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                  </select>
                                </div>
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold text-muted-foreground">Address</label>
                                <input type="text" className="w-full text-xs p-1.5 rounded border bg-muted/30" 
                                  value={editFormData.address || ''} onChange={e => setEditFormData({...editFormData, address: e.target.value})} />
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold text-muted-foreground">Activity Summary</label>
                                <textarea className="w-full text-xs p-1.5 rounded border bg-muted/30 resize-none h-16" 
                                  value={editFormData.activity || editFormData.description || ''} onChange={e => setEditFormData({...editFormData, activity: e.target.value})} />
                              </div>
                            </div>
                          ) : (
                            <>
                              <button 
                                onClick={() => startEditing(i, o)}
                                className="absolute top-3 right-3 p-1.5 rounded bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground no-print"
                                title="Edit Offender Details"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              
                              <div className="flex justify-between items-start mb-1 pr-8">
                                <div>
                                  <span className="font-bold text-sm text-foreground">{[o.firstName, o.lastName, o.surName].filter(Boolean).join(' ') || 'Unknown'}</span>
                                  {o.aliasName && <span className="text-xs text-muted-foreground ml-2 text-primary/80 font-medium">({o.aliasName})</span>}
                                </div>
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{o.type}</span>
                              </div>
                              {o.idProofNumber && <p className="text-xs text-muted-foreground mt-1 mb-1 font-mono">ID Proof: {o.idProofNumber}</p>}
                              <p className="text-xs text-muted-foreground">{o.address}</p>
                              {o.activity && <p className="text-xs mt-2 text-foreground p-2 rounded bg-muted/30 italic">"{o.activity}"</p>}
                              {o.description && !o.activity && <p className="text-xs mt-2 text-foreground p-2 rounded bg-muted/30 italic">"{o.description}"</p>}
                              {o.risk && <p className={`text-xs mt-2 font-semibold ${o.risk.toLowerCase() === 'high' ? 'text-destructive' : o.risk.toLowerCase() === 'medium' ? 'text-yellow-600' : 'text-primary'}`}>Risk: {o.risk}</p>}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t bg-muted/10 space-y-4 no-print" style={{ borderColor: "hsl(var(--border))" }}>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> Add Comment / Remarks (Optional)
                    </label>
                    <textarea 
                      className="w-full text-sm p-2 rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                      style={{ borderColor: "hsl(var(--border))" }}
                      rows={2}
                      placeholder="Type your notes here..."
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={handleReject}
                      className="flex-1 flex justify-center items-center gap-2 py-2.5 rounded-lg border text-sm font-bold text-destructive hover:bg-destructive/10 transition-colors"
                      style={{ borderColor: "hsl(var(--destructive)/0.5)" }}
                    >
                      <XCircle className="w-4 h-4" /> Reject Report
                    </button>
                    <button 
                      onClick={handleApprove}
                      className="flex-1 flex justify-center items-center gap-2 py-2.5 rounded-lg text-sm font-bold text-white transition-opacity hover:opacity-90 shadow-md"
                      style={{ background: "hsl(var(--primary))" }}
                    >
                      Approve Report <CheckCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'pending' ? (
              <div className="hidden lg:flex flex-col items-center justify-center p-8 text-center bg-card border rounded-xl" style={{ borderColor: 'hsl(var(--border))' }}>
                <ArrowRight className="h-8 w-8 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-sm font-bold text-foreground">Select a Report</h3>
                <p className="text-xs text-muted-foreground mt-1 text-balance">
                  Click on a pending report from the list to view details and take action.
                </p>
              </div>
            ) : null}
            
          </div>
        </>
      )}
    </div>
  );
}
