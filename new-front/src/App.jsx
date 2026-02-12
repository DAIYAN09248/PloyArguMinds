import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { saveAs } from "file-saver";

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import {
  Send, User, Bot, Gavel, Sparkles, Play,
  RefreshCw, PauseCircle, PlayCircle, Clock, AlertCircle,
  ArrowRight, Download, FileText, File, Paperclip, X, History, Copy, Check, Trash2,
  ChevronDown, ChevronUp, Info
} from 'lucide-react';

const API_BASE_URL = window.location.hostname === 'localhost'
  ? `http://localhost:8080/api/discussion`
  : `https://ployarguminds.onrender.com/api/discussion`;
//daiyan
// --- COUNTDOWN TIMER ---
// --- TURN PROGRESS INDICATOR ---
const TurnProgress = ({ currentTurn, maxTurns, stopped }) => {
  const progress = Math.min((currentTurn / maxTurns) * 100, 100);
  const isApproachingLimit = currentTurn >= maxTurns - 2;

  return (
    <div className={`timer-wrapper ${isApproachingLimit ? 'timer-warning' : 'timer-normal'}`}>
      <div className="timer-circle-wrapper">
        <svg className="timer-circle-svg">
          <circle cx="10" cy="10" r="8" className="timer-circle-bg" />
          <circle cx="10" cy="10" r="8"
            className={`timer-circle-progress ${isApproachingLimit ? 'warning-color' : 'progress-color'}`}
            strokeDasharray="50" strokeDashoffset={50 - (50 * progress) / 100}
          />
        </svg>
      </div>
      <span className="timer-text">{currentTurn} / {maxTurns} Turns</span>
    </div>
  );
};

// --- MESSAGE BUBBLE ---
const MessageBubble = ({ message }) => {
  const isUser = !message.ai;
  const getRoleTheme = (name) => {
    const lower = name.toLowerCase();
    if (lower.includes('pro')) return "bubble-pro";
    if (lower.includes('con')) return "bubble-con";
    if (lower.includes('judge')) return "bubble-judge";
    if (lower.includes('logic')) return "bubble-logic";
    if (lower.includes('idea')) return "bubble-idea";
    if (lower.includes('wrap')) return "bubble-wrap";
    return "bubble-default";
  };

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Pre-process content to upgrade "Bold Lines" to Headers for better styling
  // e.g. "**Project Name:**" -> "### Project Name"
  const processedContent = message.content.replace(/^(\s*)\*\*(.+?)\*\*:?$/gm, '$1### $2');

  return (
    <div className={`message-row ${isUser ? 'user-row' : 'ai-row'}`}>
      <div className={`message-bubble ${isUser ? 'bubble-user' : getRoleTheme(message.senderName)}`}>
        {!isUser && <div className="quote-icon">❝</div>}
        <div className="message-header">
          {isUser ? <User size={14} className="icon-user" /> : <Bot size={14} className="icon-bot" />}
          <span className="sender-name">{message.senderName}</span>
          <span className="message-time">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className={`message-content ${isUser ? 'content-user' : 'content-ai'} markdown-body`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {processedContent}
          </ReactMarkdown>
        </div>

        {/* Copy Button */}
        <button className="copy-btn" onClick={handleCopy} title="Copy Message">
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
};



// --- HISTORY MODAL ---
// --- HISTORY MODAL ---
const HistoryModal = ({ onClose, onLoadSession }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterMode, setFilterMode] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetch(`${API_BASE_URL}/sessions`)
      .then(res => res.json())
      .then(data => { setSessions(data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  const filteredSessions = sessions.filter(s => {
    // Mode Filter
    if (filterMode !== 'ALL' && s.mode !== filterMode) return false;

    // Date Filter
    if (startDate || endDate) {
      const date = new Date(s.createdAt);
      date.setHours(0, 0, 0, 0); // compare dates only

      if (startDate) {
        const start = new Date(startDate);
        if (date < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (date > end) return false;
      }
    }
    return true;
  });

  const deleteSession = async (sessionId) => {
    if (!window.confirm("Are you sure you want to delete this session? This cannot be undone.")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/session/${sessionId}`, { method: 'DELETE' });
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
      } else {
        alert("Failed to delete session.");
      }
    } catch (e) {
      alert("Error deleting session.");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Session History</h2>
          <button onClick={onClose} className="close-btn"><X size={24} /></button>
        </div>

        {/* FILTER BAR */}
        <div className="modal-filters">
          <select value={filterMode} onChange={(e) => setFilterMode(e.target.value)} className="filter-select">
            <option value="ALL">All Modes</option>
            <option value="DEBATE">Debate</option>
            <option value="COLLABORATION">Collab</option>
          </select>

          <div className="date-picker-wrapper">
            <DatePicker
              selected={startDate ? new Date(startDate) : null}
              onChange={(date) => setStartDate(date ? date.toISOString().split('T')[0] : '')}
              placeholderText="Start Date"
              className="filter-date-custom"
              dateFormat="yyyy-MM-dd"
              popperProps={{ strategy: 'fixed' }}
              maxDate={new Date()}
            />
          </div>

          <span className="filter-separator">-</span>

          <div className="date-picker-wrapper">
            <DatePicker
              selected={endDate ? new Date(endDate) : null}
              onChange={(date) => setEndDate(date ? date.toISOString().split('T')[0] : '')}
              placeholderText="End Date"
              className="filter-date-custom"
              dateFormat="yyyy-MM-dd"
              popperProps={{ strategy: 'fixed' }}
              maxDate={new Date()}
            />
          </div>
          {(filterMode !== 'ALL' || startDate || endDate) &&
            <button onClick={() => { setFilterMode('ALL'); setStartDate(''); setEndDate(''); }} className="filter-clear">Clear</button>
          }
        </div>

        {loading ? <div className="loading-spinner"><RefreshCw className="icon-spin" /> Loading...</div> : (
          <div className="session-list">
            {filteredSessions.length === 0 ? <p className="empty-state">No matching sessions.</p> : filteredSessions.map(s => (
              <div key={s.id} className="session-item">
                <div className="session-info" onClick={() => onLoadSession(s)} style={{ cursor: 'pointer', flex: 1 }}>
                  <h3>{s.topic}</h3>
                  <span className="session-date">{new Date(s.createdAt).toLocaleDateString()} {new Date(s.createdAt).toLocaleTimeString()}</span>
                  <span className={`status-badge-sm ${s.mode === 'DEBATE' ? 'debate-bg' : 'collab-bg'}`}>{s.mode}</span>
                  {s.fileName && <span className="file-badge"><Paperclip size={10} /> {s.fileName}</span>}
                </div>
                <div className="session-actions">
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                    className="delete-btn"
                    title="Delete Session"
                  >
                    <Trash2 size={16} />
                  </button>
                  <ArrowRight size={18} className="arrow-icon" onClick={() => onLoadSession(s)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- MAIN APP ---
export default function App() {
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);

  // Logic States
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [loadingAgent, setLoadingAgent] = useState(null);
  const [isFinishingEarly, setIsFinishingEarly] = useState(false);
  const [showDownloads, setShowDownloads] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [mobileInfoOpen, setMobileInfoOpen] = useState(false);
  const [mobileInfoTab, setMobileInfoTab] = useState('debate');

  const [topic, setTopic] = useState("Artificial Intelligence will replace programmers");
  const [instructions, setInstructions] = useState("");
  const [mode, setMode] = useState("DEBATE");
  const [turns, setTurns] = useState(20);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // --- EXTEND SESSION ---
  const [extending, setExtending] = useState(false);
  const [extensionTurns, setExtensionTurns] = useState(5);

  const handleExtend = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/${session.id}/extend?extraMinutes=${extensionTurns}`, { method: 'POST' });
      if (res.ok) {
        const updatedSession = await res.json();
        setSession(updatedSession);
        setIsFinishingEarly(false);
        setExtending(false);
        // Resume Auto-Play
        setIsAutoPlaying(true);
      }
    } catch (e) { alert("Failed to extend session"); }
    finally { setLoading(false); }
  };


  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loadingAgent]);

  // --- AUTO PLAY LOOP ---
  useEffect(() => {
    let intervalId;
    // Don't run loop if we are in the "Waiting to Finish" state
    if (isAutoPlaying && session && session.status === 'ACTIVE' && !isFinishingEarly) {
      intervalId = setInterval(async () => {
        if (loadingAgent) return;
        try {
          setLoadingAgent("Thinking...");
          const response = await fetch(`${API_BASE_URL}/${session.id}/next-turn`, { method: 'POST' });
          if (response.ok) {
            const text = await response.text();
            if (!text) return; // Handle empty response gracefully
            const data = JSON.parse(text);
            if (data && data.id) {
              setMessages(prev => [...prev, data]);
              if (data.senderName.includes("Judge") || data.senderName.includes("WrapUp")) {
                setIsAutoPlaying(false);
                setSession(prev => ({ ...prev, status: 'COMPLETED' }));
              }
            }
          }
        } catch (error) { console.error(error); }
        finally { setLoadingAgent(null); }
      }, 2000);
    }
    return () => clearInterval(intervalId);
  }, [isAutoPlaying, session, loadingAgent, isFinishingEarly]);

  // --- GRACEFUL ENDING (Trigger Summary when bot finishes) ---
  useEffect(() => {
    const triggerSummary = async () => {
      // Run ONLY if: We clicked end, the previous bot finished (agent is null), and session isn't closed yet.
      if (isFinishingEarly && loadingAgent === null && session?.status !== 'COMPLETED') {

        // 1. Set specific text based on mode
        const summaryText = session.mode === 'DEBATE'
          ? "The Judge is deliberating..."
          : "Generating Final Report...";

        setLoadingAgent(summaryText);

        try {
          const res = await fetch(`${API_BASE_URL}/${session.id}/end`, { method: 'POST' });
          if (res.ok) {
            const summaryMsg = await res.json();
            setMessages(prev => [...prev, summaryMsg]);
            setSession(prev => ({ ...prev, status: 'COMPLETED' }));
          }
        } catch (e) {
          alert("Failed to end session.");
        } finally {
          setLoadingAgent(null);
          setIsFinishingEarly(false);
        }
      }
    };

    triggerSummary();
  }, [isFinishingEarly, loadingAgent, session]);

  // --- HELPER FOR LOADING TEXT ---
  const getLoadingText = () => {
    if (!loadingAgent) return "Processing...";

    // If we have a specific status message (Judge/Report), show it directly
    if (loadingAgent.includes("Judge") || loadingAgent.includes("Report")) {
      return loadingAgent;
    }

    // If we clicked "End" but a bot is still typing
    if (isFinishingEarly) {
      return "Finishing final thought...";
    }

    return `${loadingAgent} is typing`;
  };

  // --- ACTIONS ---
  const startSession = async () => {
    setLoading(true);
    setIsFinishingEarly(false);
    try {
      let response;
      if (selectedFile) {
        const finalTopic = instructions.trim() ? instructions : "Analyze the attached document and discuss its key points, problems, or proposed solutions.";

        const formData = new FormData();
        formData.append("topic", finalTopic);
        formData.append("mode", mode);
        formData.append("totalTurns", turns === '' ? 20 : parseInt(turns));
        formData.append("file", selectedFile);

        response = await fetch(`${API_BASE_URL}/start-with-file`, {
          method: 'POST',
          body: formData
        });
      } else {
        response = await fetch(`${API_BASE_URL}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, mode, totalTurns: turns === '' ? 20 : parseInt(turns) })
        });
      }

      if (!response.ok) throw new Error("Backend Error");
      const data = await response.json();
      setSession(data);
      setIsAutoPlaying(true);
    } catch (error) { alert("Could not start session."); }
    finally { setLoading(false); }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setIsAutoPlaying(false);
    const text = inputText;
    setInputText("");
    try {
      const res = await fetch(`${API_BASE_URL}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, content: text })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, data]);
        setIsAutoPlaying(true);
      }
    } catch (err) { setInputText(text); setIsAutoPlaying(true); }
  };

  const handleFinishClick = () => {
    setIsAutoPlaying(false);
    setIsFinishingEarly(true); // This triggers the useEffect logic
  };

  const loadHistorySession = async (s) => {
    setLoading(true);
    setShowHistory(false);
    try {
      const res = await fetch(`${API_BASE_URL}/${s.id}/history`);
      if (res.ok) {
        const hist = await res.json();
        setMessages(hist);
        setSession(s);
        // Don't auto-play, just view
        setIsAutoPlaying(false);
      }
    } catch (e) { alert("Failed to load history"); }
    finally { setLoading(false); }
  };

  // --- DOWNLOADS (UPDATED FOR BETTER PDF FORMATTING + AUTOTABLE) ---
  const downloadPDF = () => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const margin = 14;
    const maxLineWidth = 170;
    let yPos = 20;

    // Title
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229);
    doc.setFont("helvetica", "bold");
    doc.text("PolyArguMinds Transcript", margin, yPos);
    yPos += 10;

    // Info
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    const topicText = doc.splitTextToSize(`Topic: ${session.topic}`, maxLineWidth);
    doc.text(topicText, margin, yPos);
    yPos += (topicText.length * 5) + 2;
    doc.text(`Mode: ${session.mode} | Date: ${new Date().toLocaleDateString()}`, margin, yPos);
    yPos += 8;
    doc.setDrawColor(220);
    doc.line(margin, yPos, 210 - margin, yPos);
    yPos += 10;

    // Loop Messages
    messages.forEach(msg => {
      // Header
      if (yPos > pageHeight - 20) { doc.addPage(); yPos = 20; }
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      doc.text(`${msg.senderName} [${timeStr}]:`, margin, yPos);
      yPos += 6;

      // Pre-process: Upgrade bold lines to headers (Expanded Regex to allow optional colon)
      let content = msg.content.replace(/^(\s*)\*\*(.+?)\*\*:?$/gm, '$1### $2');

      const lines = content.split('\n');

      let tableBuffer = [];
      let inTable = false;

      const renderTable = () => {
        if (tableBuffer.length === 0) return;

        // Parse Markdown Table
        // remove separator row (contains ---)
        const filteredRows = tableBuffer.filter(row => !row.includes('---'));

        if (filteredRows.length === 0) return;

        const tableData = filteredRows.map(row => {
          // split by | and remove empty first/last if consistent
          return row.split('|').filter((cell, i, arr) => {
            // Keep cell if it's not the empty start/end created by |row| logic
            // Simple heuristic: trim and check
            if (i === 0 && cell.trim() === '') return false;
            if (i === arr.length - 1 && cell.trim() === '') return false;
            return true;
          }).map(c => c.trim().replace(/\*\*/g, '')); // Clean bold markers
        });

        if (tableData.length > 0) {
          const head = [tableData[0]];
          const body = tableData.slice(1);

          autoTable(doc, {
            startY: yPos,
            head: head,
            body: body,
            margin: { left: margin },
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [50, 229, 207], textColor: 255, fontStyle: 'bold' }, // Teal Header
            theme: 'grid'
          });

          yPos = doc.lastAutoTable.finalY + 10; // Update Y pos
        }

        tableBuffer = [];
        inTable = false;
      };

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        let text = line.trim();

        // Table Detection
        if (text.startsWith('|')) {
          inTable = true;
          tableBuffer.push(text);
          continue; // Skip immediate printing
        } else if (inTable) {
          // End of table block found
          renderTable();
        }

        if (!text) { yPos += 3; continue; }

        // Horizontal Rule Detection (---)
        if (text === '---' || text === '***' || text === '___') {
          yPos += 2;
          doc.setDrawColor(200); // Light Grey
          doc.setLineWidth(0.5);
          doc.line(margin, yPos, 210 - margin, yPos);
          yPos += 8;
          continue;
        }

        // Normal Line Processing (Same as before)
        let indent = margin;
        let headingLevel = 0; // 0=Body, 1=H1, 2=H2, 3=H3

        // Detect Formatting
        if (text.startsWith('# ')) { headingLevel = 1; text = text.replace('# ', '').trim(); }
        else if (text.startsWith('## ')) { headingLevel = 2; text = text.replace('## ', '').trim(); }
        else if (text.startsWith('### ')) { headingLevel = 3; text = text.replace(/^###\s*/, '').trim(); }
        else if (text.match(/^\d+\./) || text.startsWith('- ')) {
          indent = margin + 5; // Indent lists
        }

        const handleTextPart = (str, isBold) => {
          // Font Styles
          if (headingLevel === 1) {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(50, 229, 207); // Teal
          } else if (headingLevel === 2) {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(255, 111, 145); // Pink
          } else if (headingLevel === 3) {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(243, 198, 35); // Gold
          } else if (isBold) {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(74, 222, 128); // Green
          } else {
            doc.setFont("helvetica", "normal");
            doc.setTextColor(50); // Default Grey
          }
          return str;
        };

        const parts = text.split(/(\*\*.*?\*\*)/g);

        if (headingLevel > 0) {
          handleTextPart(text, false);
          doc.text(text.replace(/\*\*/g, ''), indent, yPos);
        } else {
          // Mixed Style Text Wrapping Logic
          let xOffset = indent;
          const maxWidth = 190 - margin; // A4 width is ~210mm

          parts.forEach(part => {
            let chunk = part;
            let isBold = false;
            if (chunk.startsWith('**') && chunk.endsWith('**')) {
              chunk = chunk.slice(2, -2);
              isBold = true;
            }

            // Set font style for width calculation
            handleTextPart(chunk, isBold);

            // Allow splitting by words
            const words = chunk.split(' ');

            words.forEach((word, index) => {
              const wordWithSpace = word + (index < words.length - 1 ? ' ' : '');
              const wordWidth = doc.getTextWidth(wordWithSpace);

              if (xOffset + wordWidth > maxWidth) {
                yPos += 5; // New Line
                if (yPos > pageHeight - 15) {
                  doc.addPage();
                  yPos = 20;
                }
                xOffset = margin;
              }

              doc.text(wordWithSpace, xOffset, yPos);
              xOffset += wordWidth;
            });
          });
        }

        yPos += 5; // Line height

        if (yPos > pageHeight - 15) {
          doc.addPage();
          yPos = 20;
        }
      }

      // Flush any remaining table at end of message matches
      if (inTable) renderTable();

      yPos += 6;
    });

    doc.save(`PolyArguMinds_Report.pdf`);
  };

  const downloadDOC = () => {
    const children = [
      new Paragraph({ text: "PolyArguMinds Transcript", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
      new Paragraph({ text: `Topic: ${session.topic}`, spacing: { after: 200 } }),
      new Paragraph({ text: `Mode: ${session.mode} | Date: ${new Date().toLocaleDateString()}`, spacing: { after: 400 } }),
    ];

    messages.forEach(msg => {
      // Message Header
      children.push(new Paragraph({
        children: [
          new TextRun({ text: msg.senderName, bold: true, size: 24, color: "4F46E5" }),
          new TextRun({ text: `  [${new Date(msg.timestamp).toLocaleTimeString()}]`, italics: true, size: 20, color: "64748B" })
        ],
        spacing: { before: 200, after: 100 }
      }));

      // Pre-process
      const content = msg.content.replace(/^(\s*)\*\*(.+?)\*\*:?$/gm, '$1### $2');

      // Content Parsing
      const lines = content.split('\n');
      lines.forEach(line => {
        if (!line.trim()) { children.push(new Paragraph({ text: "" })); return; }

        let indentLevel = 0;
        let cleanLine = line.trim();
        let headingStyle = undefined;
        let headingColor = undefined; // Hex no hash

        // Detect Headers
        if (cleanLine.startsWith('# ')) {
          headingStyle = HeadingLevel.HEADING_1; cleanLine = cleanLine.replace('# ', ''); headingColor = "32E5CF"; // Teal
        } else if (cleanLine.startsWith('## ')) {
          headingStyle = HeadingLevel.HEADING_2; cleanLine = cleanLine.replace('## ', ''); headingColor = "FF6F91"; // Pink
        } else if (cleanLine.startsWith('### ')) {
          headingStyle = HeadingLevel.HEADING_3; cleanLine = cleanLine.replace('### ', ''); headingColor = "F3C623"; // Gold
        }

        // Detect List
        if (cleanLine.match(/^\d+\./) || cleanLine.startsWith('- ')) {
          indentLevel = 1;
        }

        // Parse Bold Segments (**text**)
        const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
        const textRuns = parts.map(part => {
          if (part.startsWith('**') && part.endsWith('**')) {
            // If it's a heading line, use heading color, else use Green
            return new TextRun({
              text: part.slice(2, -2),
              bold: true,
              size: headingStyle ? 24 : 22,
              color: headingStyle ? headingColor : "4ADE80" // Green for bold body text
            });
          }
          // Normal Text
          return new TextRun({
            text: part,
            size: headingStyle ? 24 : 22,
            color: headingStyle ? headingColor : "auto"
          });
        });

        children.push(new Paragraph({
          children: textRuns,
          heading: headingStyle,
          indent: { left: indentLevel * 720 }, // 0.5 inch indent
          spacing: { after: 100 }
        }));
      });

      children.push(new Paragraph({ text: "", spacing: { after: 200 } })); // Spacer
    });

    const doc = new Document({ sections: [{ children }] });
    Packer.toBlob(doc).then(blob => { saveAs(blob, "PolyArguMinds_Report.docx"); });
  };

  if (!session) return (
    <div className="landing-page">
      {/* --- MOBILE-ONLY DROPDOWN --- */}
      <div className="mobile-info-dropdown">
        <button className="mobile-info-trigger" onClick={() => setMobileInfoOpen(!mobileInfoOpen)}>
          <Info size={18} />
          <span>About & How to Use</span>
          {mobileInfoOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {mobileInfoOpen && (
          <div className="mobile-info-content">
            <div className="mobile-info-tabs">
              <button
                className={`mobile-info-tab ${mobileInfoTab === 'debate' ? 'active-tab-debate' : ''}`}
                onClick={() => setMobileInfoTab('debate')}
              >
                <Gavel size={16} /> Debate Mode
              </button>
              <button
                className={`mobile-info-tab ${mobileInfoTab === 'collab' ? 'active-tab-collab' : ''}`}
                onClick={() => setMobileInfoTab('collab')}
              >
                <Sparkles size={16} /> Collab Mode
              </button>
            </div>

            {mobileInfoTab === 'debate' ? (
              <div className="mobile-info-body">
                <p className="instruction-desc"><strong>Setup a Clash.</strong> Best for evaluating decisions or controversial topics.</p>
                <ul className="instruction-steps">
                  <li><strong>1. Topic:</strong> Enter a clear statement or upload a doc to analyze.</li>
                  <li><strong>2. Turns:</strong> Set <strong>12-20 turns</strong> for a deep discussion.</li>
                  <li><strong>3. Flow:</strong> Pro & Con agents argue, then a Judge delivers the verdict.</li>
                </ul>
                <div className="file-instruction-box">
                  <p><strong>📎 Context Mode:</strong> Attach a PDF/Docx to unlock the <strong>Instructions</strong> field.</p>
                </div>
                <div className="agent-roster">
                  <h4><User size={14} /> Meet the Squad</h4>
                  <div className="agent-item"><span className="agent-name pro">ProBot</span> The Optimist</div>
                  <div className="agent-item"><span className="agent-name con">ConBot</span> The Skeptic</div>
                  <div className="agent-item"><span className="agent-name judge">JudgeDredd</span> The Decider</div>
                </div>
              </div>
            ) : (
              <div className="mobile-info-body">
                <p className="instruction-desc"><strong>Build a Solution.</strong> Best for brainstorming, planning, or creative writing.</p>
                <ul className="instruction-steps">
                  <li><strong>1. Topic:</strong> Describe your goal or problem clearly.</li>
                  <li><strong>2. Turns:</strong> Set <strong>16+ turns</strong> for enough refinement time.</li>
                  <li><strong>3. Flow:</strong> Agents brainstorm, critique, and build a comprehensive solution.</li>
                </ul>
                <div className="file-instruction-box">
                  <p><strong>📎 Context Mode:</strong> Attach a file to ground the brainstorm. Use <strong>Instructions</strong> to focus the swarm.</p>
                </div>
                <div className="agent-roster">
                  <h4><User size={14} /> Meet the Squad</h4>
                  <div className="agent-item"><span className="agent-name idea">IdeaSpark</span> The Creative</div>
                  <div className="agent-item"><span className="agent-name logic">LogicLens</span> The Analyst</div>
                  <div className="agent-item"><span className="agent-name wrap">WrapUp</span> The Closer</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="landing-side left">
        <div className="instruction-card debate-card">
          <h3><Gavel size={28} className="icon-debate" /> How to Debate</h3>
          <p className="instruction-desc"><strong>Setup a Clash.</strong> Best for evaluating decisions or controversial topics.</p>
          <ul className="instruction-steps">
            <li><strong>1. Topic:</strong> Enter a clear statement (e.g., "Remote work is better") or upload a doc to analyze.</li>
            <li><strong>2. Turns:</strong> Set <strong>12-20 turns</strong> for a deep, balanced discussion.</li>
            <li><strong>3. Flow:</strong> Pro & Con agents argue, then a Judge delivers the final verdict.</li>
          </ul>

          <div className="file-instruction-box">
            <p><strong>📎 Context Mode:</strong> Attach a PDF/Docx to unlock the <strong>Instructions</strong> field. Tell agents exactly what to analyze (e.g., <em>"Find legal loopholes in this contract"</em>).</p>
          </div>

          <div className="agent-roster">
            <h4><User size={14} /> Meet the Squad</h4>
            <div className="agent-item"><span className="agent-name pro">ProBot</span> The Optimist</div>
            <div className="agent-item"><span className="agent-name con">ConBot</span> The Skeptic</div>
            <div className="agent-item"><span className="agent-name judge">JudgeDredd</span> The Decider</div>
          </div>
        </div>
      </div>

      <div className="landing-panel">
        <div className="landing-header">
          <div className="title-wrapper">
            <h1 className="landing-title">PolyArguMinds</h1>
            <button className="history-btn-inline" onClick={() => setShowHistory(true)} title="History"><History size={24} /></button>
          </div>
          <p className="landing-subtitle">The Multi-Agent AI Arena</p>
        </div>
        <div className="landing-controls">
          <div className="control-topic">
            <label>{selectedFile ? "Instructions (Optional)" : "Topic"}</label>
            <textarea
              value={selectedFile ? instructions : topic}
              onChange={(e) => selectedFile ? setInstructions(e.target.value) : setTopic(e.target.value)}
              rows="3"
              placeholder={selectedFile ? "Explain how to debate this file (e.g., 'Find flaws in this contract'). If empty, I will analyze the doc automatically." : "Enter your debate topic..."}
            />
          </div>

          <div className="control-file" style={{ marginTop: '-1rem' }}>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".pdf,.docx,.doc,image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSelectedFile(e.target.files[0]);
                  setInstructions(""); // Reset instructions on new file
                }
              }}
            />
            <button
              className={`file-upload-btn ${selectedFile ? 'has-file' : ''}`}
              onClick={() => {
                if (selectedFile) {
                  setSelectedFile(null);
                  setInstructions("");
                } else {
                  fileInputRef.current.click();
                }
              }}
            >
              {selectedFile ? <X size={18} /> : <Paperclip size={18} />}
              {selectedFile ? selectedFile.name : "Attach Context (PDF/Img)"}
            </button>
          </div>

          <div className="control-mode">
            <button onClick={() => setMode('DEBATE')} className={`mode-button ${mode === 'DEBATE' ? 'active-debate' : ''}`}><Gavel size={24} /> Debate</button>
            <button onClick={() => setMode('COLLABORATION')} className={`mode-button ${mode === 'COLLABORATION' ? 'active-collab' : ''}`}><Sparkles size={24} /> Collab</button>
          </div>
          <div className="control-duration"><label>Turn Limit</label><input type="number" value={turns} onChange={(e) => setTurns(e.target.value)} min="2" max="100" /></div>

          <button onClick={startSession} disabled={loading || (!topic && !selectedFile)} className="start-session-button">{loading ? <RefreshCw className="icon-spin" /> : <Play fill="currentColor" />} Start</button>
        </div>
      </div>

      <div className="landing-side right">
        <div className="instruction-card collab-card">
          <h3><Sparkles size={28} className="icon-collab" /> How to Collab</h3>
          <p className="instruction-desc"><strong>Build a Solution.</strong> Best for brainstorming, planning, or creative writing.</p>
          <ul className="instruction-steps">
            <li><strong>1. Topic:</strong> Describe your goal or problem clearly (e.g., "Plan a marketing campaign").</li>
            <li><strong>2. Turns:</strong> Set <strong>16+ turns</strong> to allow enough time for refinement.</li>
            <li><strong>3. Flow:</strong> Agents brainstorm, critique, and build a comprehensive solution together.</li>
          </ul>

          <div className="file-instruction-box">
            <p><strong>📎 Context Mode:</strong> Attach a file to ground the brainstorm. Use <strong>Instructions</strong> to focus the swarm (e.g., <em>"Analyze this data and propose a strategy"</em>).</p>
          </div>

          <div className="agent-roster">
            <h4><User size={14} /> Meet the Squad</h4>
            <div className="agent-item"><span className="agent-name idea">IdeaSpark</span> The Creative</div>
            <div className="agent-item"><span className="agent-name logic">LogicLens</span> The Analyst</div>
            <div className="agent-item"><span className="agent-name wrap">WrapUp</span> The Closer</div>
          </div>
        </div>
      </div>

      {showHistory && <HistoryModal onClose={() => setShowHistory(false)} onLoadSession={loadHistorySession} />}
    </div>
  );



  return (
    <div className="app-container">
      <header className="chat-header">
        <div className="chat-header-left">
          <div className={`mode-icon ${session.mode === 'DEBATE' ? 'debate-color' : 'collab-color'}`}>{session.mode === 'DEBATE' ? <Gavel size={24} /> : <Sparkles size={24} />}</div>
          <div className="chat-header-topic">
            <h2>{session.topic}</h2>
            <div className="chat-header-status">
              <span className={`status-badge ${isAutoPlaying ? 'status-live' : 'status-paused'}`}>{isAutoPlaying ? 'Live' : 'Paused'}</span>
              <TurnProgress
                currentTurn={messages.filter(m => !["Judge", "WrapUp", "System", "You", "User"].some(excluded => m.senderName.includes(excluded))).length}
                maxTurns={session.maxTurns || 20}
                stopped={session.status === 'COMPLETED' || isFinishingEarly}
              />
              {session.fileName && (
                <a href={`${API_BASE_URL}/${session.id}/file`} target="_blank" rel="noopener noreferrer" className="file-chip" title="Download Original Context">
                  <Paperclip size={12} /> {session.fileName}
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="chat-header-right">
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowDownloads(!showDownloads)} className="header-toggle-button" title="Download">
              <Download size={18} /> <span>Download</span>
            </button>
            {showDownloads && (
              <div style={{
                position: 'absolute', top: '110%', right: 0, background: 'white',
                border: '1px solid #e2e8f0', borderRadius: '12px', padding: '5px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', display: 'flex', flexDirection: 'column', gap: '5px', zIndex: 50
              }}>
                <button onClick={downloadPDF} className="header-toggle-button" style={{ justifyContent: 'flex-start', border: 'none' }}><FileText size={16} /> <span>PDF</span></button>
                <button onClick={downloadDOC} className="header-toggle-button" style={{ justifyContent: 'flex-start', border: 'none' }}><File size={16} /> <span>DOCX</span></button>
              </div>
            )}
          </div>

          {session.status !== 'COMPLETED' && (
            <button
              onClick={handleFinishClick}
              disabled={isFinishingEarly}
              className="header-toggle-button"
              style={{ color: '#b91c1c', borderColor: '#fecaca', background: '#fef2f2' }}
              title="End & Summarize"
            >
              <AlertCircle size={18} /> <span>End & Summarize</span>
            </button>
          )}

          {/* PAUSE BUTTON: NOW DISABLED WHEN ENDING OR COMPLETED */}
          <button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            disabled={isFinishingEarly || session.status === 'COMPLETED'}
            className="header-toggle-button"
            title={isAutoPlaying ? "Pause" : "Resume"}
          >
            {isAutoPlaying ? <PauseCircle size={18} /> : <PlayCircle size={18} />} <span>{isAutoPlaying ? "Pause" : "Resume"}</span>
          </button>
          <button onClick={() => { setSession(null); setIsAutoPlaying(false); }} className="header-exit-button" title="Exit"><X size={18} /> <span>Exit</span></button>
        </div>
      </header>

      <div className="chat-area">
        {messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)}

        {(loadingAgent || isFinishingEarly) && (
          <div className="typing-indicator">
            <div className="typing-bubble">
              <div className="dot dot1"></div><div className="dot dot2"></div><div className="dot dot3"></div>
              <span>{getLoadingText()}</span>
            </div>
          </div>
        )}

        {session.status === 'COMPLETED' && (
          <div className="session-ended">
            <div className="ended-badge"><AlertCircle size={16} /><span>Session Ended</span></div>

            {extending ? (
              <div className="extend-controls">
                <input
                  type="number"
                  min="1"
                  value={extensionTurns}
                  onChange={(e) => setExtensionTurns(parseInt(e.target.value))}
                  className="extend-input"
                />
                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>turns</span>
                <button onClick={handleExtend} className="extend-confirm-btn">Confirm</button>
                <button onClick={() => setExtending(false)} className="extend-cancel-btn">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setExtending(true)} className="extend-btn">
                <PlayCircle size={16} /> Extend Session
              </button>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <form onSubmit={sendMessage} className="chat-input-form">
          <input
            type="text"
            placeholder={session.status === 'COMPLETED' ? "Session ended." : "Interject..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={loading || session.status === 'COMPLETED' || isFinishingEarly}
            className="chat-text-input"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || loading || session.status === 'COMPLETED' || isFinishingEarly}
            className="send-icon-btn"
          >
            <Send size={24} />
          </button>
        </form>
      </div>
      {showHistory && <HistoryModal onClose={() => setShowHistory(false)} onLoadSession={loadHistorySession} />}
    </div>
  );
}