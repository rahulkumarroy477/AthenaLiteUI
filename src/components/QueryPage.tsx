import React, { useState, useEffect, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import {
  Database,
  Table as TableIcon,
  Play,
  Download,
  Plus,
  Minus,
  Search,
  ChevronRight,
  Columns,
  Terminal,
  Clock,
  Layout,
  Copy,
  Check,
  User,
  LogOut,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { cn } from '../lib/utils';
import { API_BASE } from '../api';

interface TableInfo {
  name: string;
  status: string;
  columns: { name: string; type: string }[];
}

interface Tab {
  id: string;
  title: string;
  query: string;
  results: any[];
  executionInfo: { time: string; queryId: string } | null;
  isQuerying: boolean;
  error: string | null;
  selectedTable: string | null;
}

interface QueryPageProps {
  initialData: any;
  userEmail: string;
  onSignOut: () => void;
}

const POLL_INTERVAL = 2000;

export default function QueryPage({ initialData, userEmail, onSignOut }: QueryPageProps) {
  const userId = userEmail || 'default';

  const [tabs, setTabs] = useState<Tab[]>(() => {
    const initialTable = initialData?.table || '';
    return [{
      id: '1',
      title: initialTable || 'New Query',
      query: initialTable ? `SELECT * FROM "${initialTable}" LIMIT 10;` : '-- Write your query here\n',
      results: [],
      executionInfo: null,
      isQuerying: false,
      error: null,
      selectedTable: initialTable || null
    }];
  });
  const [activeTabId, setActiveTabId] = useState('1');
  const [isCopied, setIsCopied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [tables, setTables] = useState<TableInfo[]>([]);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const updateTab = (tabId: string, updates: Partial<Tab>) => {
    setTabs(prev => {
      const updated = prev.map(t => t.id === tabId ? { ...t, ...updates } : t);
      return updated;
    });
  };

  const updateActiveTab = (updates: Partial<Tab>) => updateTab(activeTabId, updates);

  // Fetch tables from backend
  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/tables?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTables(data.map(t => ({ ...t, columns: [] })));
      }
    } catch (e) {
      console.error('Failed to fetch tables:', e);
    }
  }, [userId]);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  // Fetch columns for a table when expanded
  const fetchColumns = async (tableName: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/tables/${tableName}/metadata?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      setTables(prev => prev.map(t =>
        t.name === tableName ? { ...t, columns: data.columns || [] } : t
      ));
    } catch (e) {
      console.error('Failed to fetch columns:', e);
    }
  };

  const toggleTableExpand = (e: React.MouseEvent, tableName: string) => {
    e.stopPropagation();
    setExpandedTables(prev => {
      const next = new Set(prev);
      if (next.has(tableName)) {
        next.delete(tableName);
      } else {
        next.add(tableName);
        // Fetch columns if not loaded
        const t = tables.find(t => t.name === tableName);
        if (t && t.columns.length === 0) fetchColumns(tableName);
      }
      return next;
    });
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const getNextTitle = (baseTitle: string) => {
    const existingTitles = tabs.map(t => t.title);
    if (!existingTitles.includes(baseTitle)) return baseTitle;
    let count = 2;
    while (existingTitles.includes(`${baseTitle} (${count})`)) count++;
    return `${baseTitle} (${count})`;
  };

  const handleTableSelect = (tableName: string) => {
    const newTabId = Math.random().toString(36).substring(7);
    setTabs(prev => [...prev, {
      id: newTabId,
      title: getNextTitle(tableName),
      query: `SELECT * FROM "${tableName}" LIMIT 10;`,
      results: [],
      executionInfo: null,
      isQuerying: false,
      error: null,
      selectedTable: tableName
    }]);
    setActiveTabId(newTabId);
  };

  const handleNewQuery = () => {
    const newTabId = Math.random().toString(36).substring(7);
    setTabs(prev => [...prev, {
      id: newTabId,
      title: getNextTitle('New Query'),
      query: '-- Write your query here\n',
      results: [],
      executionInfo: null,
      isQuerying: false,
      error: null,
      selectedTable: null
    }]);
    setActiveTabId(newTabId);
  };

  const closeTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) setActiveTabId(newTabs[newTabs.length - 1].id);
  };

  const handleNewTableClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/api/upload?userId=${encodeURIComponent(userId)}`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.table) {
        await fetchTables();
        handleTableSelect(data.table);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Poll query status, then fetch CSV results
  const pollAndFetchResults = async (queryId: string, tabId: string) => {
    const poll = async (): Promise<void> => {
      try {
        console.log('Polling status for', queryId);
        const res = await fetch(`${API_BASE}/api/query/status/${queryId}?userId=${encodeURIComponent(userId)}`);
        const data = await res.json();
        console.log('Poll response:', data);

        if (data.status === 'COMPLETED') {
          const csvRes = await fetch(`${API_BASE}/api/query/results/${queryId}?userId=${encodeURIComponent(userId)}`);
          const csvText = await csvRes.text();
          // Response may be base64 encoded from Lambda proxy
          let decoded = csvText;
          try {
            const test = atob(csvText);
            if (test.includes(',') && test.includes('\n')) decoded = test;
          } catch {}
          console.log('CSV first 200 chars:', decoded.substring(0, 200));
          const results = parseCsv(decoded);
          console.log('Parsed rows:', results.length);
          updateTab(tabId, {
            results,
            executionInfo: { time: data.executionTime || '', queryId },
            isQuerying: false,
            error: null,
          });
        } else if (data.status === 'FAILED') {
          updateTab(tabId, {
            isQuerying: false,
            error: data.error || 'Query failed',
          });
        } else {
          setTimeout(poll, POLL_INTERVAL);
        }
      } catch (e) {
        console.error('Poll error:', e);
        updateTab(tabId, { isQuerying: false, error: 'Failed to check query status' });
      }
    };
    setTimeout(poll, POLL_INTERVAL);
  };

  const handleRunQuery = async () => {
    if (!activeTab) return;

    updateActiveTab({ isQuerying: true, results: [], executionInfo: null, error: null });

    try {
      const res = await fetch(`${API_BASE}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: activeTab.query,
          userId,
          tableName: activeTab.selectedTable || '',
        }),
      });
      const data = await res.json();

      if (data.error) {
        updateActiveTab({ isQuerying: false, error: data.error });
        return;
      }

      pollAndFetchResults(data.queryId, activeTabId);
    } catch (error) {
      console.error('Query failed:', error);
      updateActiveTab({ isQuerying: false, error: 'Network error' });
    }
  };

  const handleCopyJSON = () => {
    if (!activeTab || activeTab.results.length === 0) return;
    navigator.clipboard.writeText(JSON.stringify(activeTab.results, null, 2)).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleDownloadCsv = async () => {
    if (!activeTab?.executionInfo?.queryId) return;
    const url = `${API_BASE}/api/query/results/${activeTab.executionInfo.queryId}?userId=${encodeURIComponent(userId)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] text-neutral-300 overflow-hidden select-none">
      {/* Top Navbar */}
      <nav className="h-14 border-b border-neutral-800 bg-[#0d0d0d] flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center">
            <Database className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white tracking-tight text-lg">AthenaLite</span>
        </div>
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800">
            <User className="w-4 h-4 text-neutral-400" />
            <span className="text-sm font-medium text-neutral-300">{userEmail}</span>
          </div>
          <button onClick={onSignOut} className="flex items-center space-x-2 text-sm font-medium text-neutral-500 hover:text-red-400 transition-colors group">
            <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            <span>Sign Out</span>
          </button>
        </div>
      </nav>

      <div className="flex-1 overflow-hidden">
        <Group id="main-group" orientation="horizontal" className="h-full">
          {/* Sidebar */}
          <Panel id="sidebar-panel" defaultSize="25" minSize="200px" maxSize="40" className="h-full">
            <aside className="w-full h-full bg-[#0d0d0d] flex flex-col border-r border-neutral-900">
              <div className="p-4">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".csv,.json,.parquet" />
                <button onClick={handleNewTableClick} disabled={isUploading} className="w-full py-2 px-4 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-sm font-medium flex items-center justify-center transition-colors disabled:opacity-50">
                  {isUploading ? <Clock className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  {isUploading ? 'Uploading...' : 'New Table'}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-2 space-y-4">
                <div className="space-y-1">
                  <div className="px-2 py-1 flex items-center text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    <ChevronRight className="w-3 h-3 mr-1" />
                    default
                  </div>
                  {tables.length === 0 && (
                    <p className="px-3 py-2 text-xs text-neutral-600">No tables yet. Upload a file to get started.</p>
                  )}
                  {tables.map((table) => (
                    <div key={table.name} className="space-y-0.5">
                      <button
                        onClick={() => handleTableSelect(table.name)}
                        className={cn(
                          "w-full px-3 py-2 rounded-md text-sm flex items-center group transition-all relative z-10",
                          table.name === activeTab?.selectedTable ? "bg-blue-500/10 text-blue-400 font-medium" : "hover:bg-neutral-800 text-neutral-400"
                        )}
                      >
                        <div onClick={(e) => toggleTableExpand(e, table.name)} className="p-1 -ml-1 mr-1 hover:bg-neutral-700 rounded transition-colors">
                          {expandedTables.has(table.name) ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                        </div>
                        <TableIcon className="w-4 h-4 mr-2 opacity-70 shrink-0" />
                        <span className="truncate flex-1 text-left">{table.name}</span>
                        {table.status !== 'READY' && (
                          <span className="text-[10px] text-yellow-500 ml-1">{table.status}</span>
                        )}
                      </button>

                      {expandedTables.has(table.name) && (
                        <div className="ml-9 space-y-1 py-1 border-l border-neutral-800">
                          {table.columns.length === 0 ? (
                            <div className="px-3 py-1 text-[11px] text-neutral-600">Loading...</div>
                          ) : (
                            table.columns.map(col => (
                              <div key={col.name} className="flex items-center px-3 py-1 text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors cursor-default group">
                                <Columns className="w-3 h-3 mr-2 opacity-40 group-hover:opacity-100" />
                                <span>{col.name}</span>
                                <span className="ml-auto text-[10px] text-neutral-600">{col.type}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 border-t border-neutral-800 text-xs text-neutral-600">v1.0.4-stable</div>
            </aside>
          </Panel>

          <Separator id="main-separator" data-separator className="w-2 bg-neutral-900 hover:bg-blue-500/40 transition-all flex items-center justify-center group relative z-50 cursor-col-resize">
            <div className="w-[1px] h-32 bg-neutral-800 group-hover:bg-blue-500/80 transition-colors" />
          </Separator>

          {/* Main Content */}
          <Panel id="content-panel" className="h-full">
            <main className="h-full flex flex-col min-w-0">
              <Group id="content-group" orientation="vertical" className="h-full">
                {/* Editor */}
                <Panel id="editor-panel" defaultSize="50%" minSize="100px">
                  <div className="h-full flex flex-col bg-[#0a0a0a]">
                    <div className="flex items-center justify-between bg-[#0d0d0d] border-b border-neutral-800 shrink-0">
                      <div className="flex items-center flex-1 min-w-0">
                        <div className="flex items-center px-4 py-2.5 text-xs font-bold text-neutral-500 border-r border-neutral-800 shrink-0">
                          <Terminal className="w-3.5 h-3.5 mr-2" />
                          SQL EDITOR
                        </div>
                        <div className="flex items-center flex-1 overflow-x-auto no-scrollbar">
                          <AnimatePresence mode="popLayout">
                            {tabs.map((tab) => (
                              <motion.div layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} key={tab.id} onClick={() => setActiveTabId(tab.id)}
                                className={cn("flex items-center min-w-[120px] max-w-[200px] px-4 py-2.5 border-r border-neutral-800 cursor-pointer transition-colors relative group shrink-0",
                                  activeTabId === tab.id ? "bg-[#0a0a0a] text-blue-400" : "bg-[#0d0d0d] text-neutral-500 hover:bg-neutral-800/50"
                                )}
                              >
                                <span className="text-xs font-medium truncate flex-1">{tab.title}</span>
                                <button onClick={(e) => closeTab(e, tab.id)} className={cn("ml-2 p-0.5 rounded-sm hover:bg-neutral-700 transition-opacity", activeTabId === tab.id ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                                  <X className="w-3 h-3" />
                                </button>
                                {activeTabId === tab.id && <motion.div layoutId="active-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
                              </motion.div>
                            ))}
                          </AnimatePresence>
                          <button onClick={handleNewQuery} className="p-2.5 text-neutral-500 hover:text-neutral-300 transition-colors shrink-0" title="New Query Tab">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center px-4 py-2 space-x-4 shrink-0">
                        <button onClick={handleRunQuery} disabled={activeTab?.isQuerying}
                          className="flex items-center px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all disabled:opacity-50">
                          {activeTab?.isQuerying ? <Clock className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2 fill-current" />}
                          Run Query
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 relative overflow-hidden">
                      <CodeMirror value={activeTab?.query || ''} height="100%" theme={oneDark} extensions={[sql()]}
                        onChange={(value) => updateActiveTab({ query: value })} className="h-full text-sm"
                        basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true, autocompletion: true }} />
                    </div>
                  </div>
                </Panel>

                <Separator id="content-separator" data-separator className="h-2 bg-neutral-900 hover:bg-blue-500/40 transition-all flex items-center justify-center group relative z-50 cursor-row-resize">
                  <div className="h-[1px] w-32 bg-neutral-800 group-hover:bg-blue-500/80 transition-colors" />
                </Separator>

                {/* Results */}
                <Panel id="results-panel" defaultSize="50%" minSize="100px">
                  <div className="h-full flex flex-col bg-[#0a0a0a]">
                    <div className="flex items-center justify-between px-4 py-2 bg-[#0d0d0d] border-b border-neutral-800">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center text-xs font-medium text-neutral-500">
                          <Layout className="w-3 h-3 mr-1.5" />
                          RESULTS
                        </div>
                        {activeTab?.executionInfo && (
                          <span className="text-[10px] text-neutral-600 font-mono">Executed in {activeTab.executionInfo.time}</span>
                        )}
                      </div>
                      {activeTab?.executionInfo && (
                        <div className="flex items-center space-x-4">
                          <button onClick={handleCopyJSON} className="flex items-center text-xs text-neutral-400 hover:text-blue-400 transition-colors" title="Copy results as JSON">
                            {isCopied ? <><Check className="w-3 h-3 mr-1.5 text-green-500" /><span className="text-green-500">Copied!</span></> : <><Copy className="w-3 h-3 mr-1.5" />Copy JSON</>}
                          </button>
                          <div className="h-3 w-[1px] bg-neutral-800" />
                          <button onClick={handleDownloadCsv} className="flex items-center text-xs text-blue-400 hover:text-blue-300 transition-colors">
                            <Download className="w-3 h-3 mr-1.5" />
                            Download CSV
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 overflow-auto relative">
                      {activeTab?.isQuerying ? (
                        <div className="h-full flex flex-col items-center justify-center text-neutral-600 space-y-4">
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
                            <Database className="w-5 h-5 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                          </div>
                          <div className="text-center space-y-1">
                            <p className="text-sm font-medium text-neutral-400">Executing Query...</p>
                            <p className="text-[10px] text-neutral-600 uppercase tracking-widest">Scanning S3 Objects</p>
                          </div>
                        </div>
                      ) : activeTab?.error ? (
                        <div className="h-full flex flex-col items-center justify-center text-red-400 space-y-2 p-8">
                          <X className="w-8 h-8" />
                          <p className="text-sm font-medium">Query Failed</p>
                          <p className="text-xs text-red-500/70 text-center max-w-md font-mono">{activeTab.error}</p>
                        </div>
                      ) : activeTab && activeTab.results.length > 0 ? (
                        <table className="w-full text-left border-collapse">
                          <thead className="sticky top-0 bg-[#0d0d0d] z-10">
                            <tr>
                              {Object.keys(activeTab.results[0]).map((key) => (
                                <th key={key} className="px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-wider border-b border-neutral-800">{key}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-800/50">
                            {activeTab.results.map((row, i) => (
                              <tr key={i} className="hover:bg-neutral-900/30 transition-colors">
                                {Object.values(row).map((val: any, j) => (
                                  <td key={j} className="px-4 py-3 text-sm font-mono text-neutral-400 whitespace-nowrap">{val}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-neutral-600 space-y-4">
                          <div className="p-4 rounded-full bg-neutral-900/50 border border-neutral-800">
                            <Search className="w-8 h-8" />
                          </div>
                          <p className="text-sm">Run a query to see results here</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Panel>
              </Group>
            </main>
          </Panel>
        </Group>
      </div>
    </div>
  );
}

// Simple CSV parser
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h.trim()] = (values[i] || '').trim(); });
    return row;
  });
}
