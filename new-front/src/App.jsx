import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { saveAs } from "file-saver";

import {
  Send, User, Bot, Gavel, Sparkles, Play,
  RefreshCw, PauseCircle, PlayCircle, Clock, AlertCircle,
  ArrowRight, Download, FileText, File, Paperclip, X, History, Copy, Check
} from 'lucide-react';

const API_BASE_URL = "http://localhost:8080/api/discussion";

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

  const formatMessageContent = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, index) => {
      if (!line.trim()) return <div key={index} className="spacer"></div>;
      if (line.trim().startsWith('**') && line.trim().endsWith('**') && line.length < 60) {
        return <h3 key={index} className="msg-header">{line.replace(/\*\*/g, '')}</h3>;
      }
      if ((line.includes('**') && line.trim().endsWith(':')) || line.includes('Action Plan')) {
        return <div key={index} className="msg-subheader">{line.replace(/\*\*/g, '')}</div>;
      }
      const listMatch = line.match(/^(\d+)\.\s(.+)/);
      if (listMatch) {
        const content = listMatch[2];
        const parts = content.split(/(\*\*.*?\*\*)/g);
        return (
          <div key={index} className="msg-list-item">
            <span className="list-number">{listMatch[1]}.</span>
            <span className="list-content">
              {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="highlight-text">{part.slice(2, -2)}</strong>;
                return part;
              })}
            </span>
          </div>
        );
      }
      if (line.trim().startsWith('* ')) {
        const content = line.trim().substring(2);
        const parts = content.split(/(\*\*.*?\*\*)/g);
        return (
          <div key={index} className="msg-list-item">
            <span className="list-arrow"><ArrowRight size={16} strokeWidth={3} /></span>
            <span className="list-content">
              {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="highlight-text">{part.slice(2, -2)}</strong>;
                return part;
              })}
            </span>
          </div>
        );
      }
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <div key={index} className="msg-text">
          {parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
            return part;
          })}
        </div>
      );
    });
  };

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
        <div className={`message-content ${isUser ? 'content-user' : 'content-ai'}`}>
          {formatMessageContent(message.content)}
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
              <div key={s.id} className="session-item" onClick={() => onLoadSession(s)}>
                <div className="session-info">
                  <h3>{s.topic}</h3>
                  <span className="session-date">{new Date(s.createdAt).toLocaleDateString()} {new Date(s.createdAt).toLocaleTimeString()}</span>
                  <span className={`status-badge-sm ${s.mode === 'DEBATE' ? 'debate-bg' : 'collab-bg'}`}>{s.mode}</span>
                  {s.fileName && <span className="file-badge"><Paperclip size={10} /> {s.fileName}</span>}
                </div>
                <ArrowRight size={18} className="arrow-icon" />
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
      }, 4000);
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

  // --- DOWNLOADS (UPDATED FOR BETTER PDF FORMATTING) ---
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

      // Content Parsing
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(50);

      const lines = msg.content.split('\n');
      lines.forEach(line => {
        if (!line.trim()) { yPos += 3; return; }

        let indent = margin;
        let text = line.trim();
        let isBold = false;
        let isHeader = false;

        // Detect Formatting
        if (text.startsWith('###') || (text.startsWith('**') && text.endsWith('**') && text.length < 50)) {
          isHeader = true;
          text = text.replace(/###/g, '').replace(/\*\*/g, '').trim();
        } else if (text.match(/^\d+\./) || text.startsWith('- ')) {
          indent = margin + 5; // Indent lists
        }

        // Clean text for PDF (simple bold stripping for body to avoid alignment issues)
        const cleanText = text.replace(/\*\*/g, '');

        // Font Styles
        if (isHeader) {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(79, 70, 229); // Accent color for headers
        } else {
          doc.setFont("helvetica", "normal");
          doc.setTextColor(50);
        }

        const splitText = doc.splitTextToSize(cleanText, maxLineWidth - (indent - margin));

        if (yPos + (splitText.length * 5) > pageHeight - 15) {
          doc.addPage();
          yPos = 20;
        }

        doc.text(splitText, indent, yPos);
        yPos += (splitText.length * 5) + 1;
      });
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

      // Content Parsing
      const lines = msg.content.split('\n');
      lines.forEach(line => {
        if (!line.trim()) { children.push(new Paragraph({ text: "" })); return; }

        let isHeader = false;
        let indentLevel = 0;
        let cleanLine = line.trim();

        if (cleanLine.startsWith('###')) {
          isHeader = true;
          cleanLine = cleanLine.replace(/###/g, '').trim();
        }

        // Detect List
        if (cleanLine.match(/^\d+\./) || cleanLine.startsWith('- ')) {
          indentLevel = 1;
        }

        // Parse Bold Segments (**text**)
        const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
        const textRuns = parts.map(part => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return new TextRun({ text: part.slice(2, -2), bold: true, size: isHeader ? 24 : 22 });
          }
          return new TextRun({ text: part, size: isHeader ? 24 : 22 });
        });

        children.push(new Paragraph({
          children: textRuns,
          heading: isHeader ? HeadingLevel.HEADING_3 : undefined,
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
      <div className="landing-panel">
        <div className="landing-header">
          <button className="history-btn-top" onClick={() => setShowHistory(true)} title="History"><History size={24} /></button>
          <h1 className="landing-title">PolyArguMinds</h1>
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
              <Download size={18} /> Download
            </button>
            {showDownloads && (
              <div style={{
                position: 'absolute', top: '110%', right: 0, background: 'white',
                border: '1px solid #e2e8f0', borderRadius: '12px', padding: '5px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', display: 'flex', flexDirection: 'column', gap: '5px', zIndex: 50
              }}>
                <button onClick={downloadPDF} className="header-toggle-button" style={{ justifyContent: 'flex-start', border: 'none' }}><FileText size={16} /> PDF</button>
                <button onClick={downloadDOC} className="header-toggle-button" style={{ justifyContent: 'flex-start', border: 'none' }}><File size={16} /> DOCX</button>
              </div>
            )}
          </div>

          {session.status !== 'COMPLETED' && (
            <button
              onClick={handleFinishClick}
              disabled={isFinishingEarly}
              className="header-toggle-button"
              style={{ color: '#b91c1c', borderColor: '#fecaca', background: '#fef2f2' }}
            >
              End & Summarize
            </button>
          )}

          {/* PAUSE BUTTON: NOW DISABLED WHEN ENDING OR COMPLETED */}
          <button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            disabled={isFinishingEarly || session.status === 'COMPLETED'}
            className="header-toggle-button"
          >
            {isAutoPlaying ? <PauseCircle size={18} /> : <PlayCircle size={18} />} {isAutoPlaying ? "Pause" : "Resume"}
          </button>
          <button onClick={() => { setSession(null); setIsAutoPlaying(false); }} className="header-exit-button">Exit</button>
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