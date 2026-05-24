import { useRef, useState } from 'react';
import { Upload, X, FileSpreadsheet, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { addHypothesis } from '../../services/storage';
import { useToastContext } from '../../context/ToastContext';

// Column mappings from Excel header → internal field name
const COLUMN_MAP = {
  // Hypothesis fields
  'Hypothesis Name': 'hypoName',
  'HypoName': 'hypoName',
  'MITRE ID': 'mitreId',
  'MitreID': 'mitreId',
  'Sub Technique': 'subTechnique',
  'SubTechnique': 'subTechnique',
  'Tactic': 'tactic',
  'Description': 'description',
  'Hunting Logic': 'huntingLogic',
  'HuntingLogic': 'huntingLogic',
  'SOC Rule': 'socDetectionRule',
  'SOC Detection Rule': 'socDetectionRule',
  'Splunk Query': 'splunkSPL',
  'SplunkSPL': 'splunkSPL',
  'QRadar Query': 'qradarAQL',
  'QRadarAQL': 'qradarAQL',
  'Sentinel Query': 'sentinelKQL',
  'SentinelKQL': 'sentinelKQL',
  // Assignment fields
  'Month': 'month',
  'Client Name': 'clientName',
  'ClientName': 'clientName',
  'Assigned Analyst': 'assignedAnalyst',
  'AssignedAnalyst': 'assignedAnalyst',
  'Status': 'status',
  'Result': 'result',
  'General Hunt': 'isGeneral',
  'IsGeneral': 'isGeneral',
  'Planned Date': 'planned',
  'PlannedDate': 'planned',
};

const parseRow = (row) => {
  const hyp = {};
  Object.entries(row).forEach(([excelCol, value]) => {
    const field = COLUMN_MAP[excelCol];
    if (field) {
      if (field === 'isGeneral') {
        hyp[field] = String(value).toLowerCase() === 'yes' || value === true;
      } else {
        hyp[field] = value !== undefined && value !== null ? String(value) : '';
      }
    }
  });
  return hyp;
};

// Template configs per mode
const TEMPLATES = {
  lead: {
    label: 'Lead Template',
    filename: 'Lead_Monthly_Upload_Template.xlsx',
    sheetName: 'Lead Upload',
    columns: {
      'Hypothesis Name': '',
      'MITRE ID': '',
      'Sub Technique': '',
      'Tactic': '',
      'Month': new Date().toISOString().slice(0, 7),
      'Client Name': '',
      'Assigned Analyst': '',
      'General Hunt': 'No',
      'Status': 'Planned',
      'Planned Date': '',
      'Description': '',
      'Hunting Logic': '',
      'SOC Rule': '',
      'Splunk Query': '',
      'QRadar Query': '',
      'Sentinel Query': '',
      'Result': '',
    }
  },
  hypotheses: {
    label: 'Hypotheses Template',
    filename: 'Hypotheses_Import_Template.xlsx',
    sheetName: 'Hypotheses',
    columns: {
      'Hypothesis Name': '',
      'MITRE ID': '',
      'Sub Technique': '',
      'Tactic': '',
      'Description': '',
      'Hunting Logic': '',
      'SOC Rule': '',
      'Splunk Query': '',
      'QRadar Query': '',
      'Sentinel Query': '',
    }
  }
};

const downloadTemplate = (mode) => {
  const tmpl = TEMPLATES[mode];
  const ws = XLSX.utils.json_to_sheet([tmpl.columns]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, tmpl.sheetName);
  XLSX.writeFile(wb, tmpl.filename);
};

/**
 * QuickImport — a compact import button that can be dropped anywhere.
 * @param {string} mode - 'lead' | 'hypotheses'
 * @param {string} defaultMonth - pre-fill month for lead imports
 * @param {function} onDone - called after successful import
 */
export default function QuickImport({ mode = 'lead', defaultMonth = '', onDone }) {
  const fileRef = useRef(null);
  const { showToast } = useToastContext();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    try {
      setImporting(true);
      const data = new Uint8Array(await file.arrayBuffer());
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);

      const valid = rows
        .map(parseRow)
        .map(h => ({
          ...h,
          month: h.month || defaultMonth || new Date().toISOString().slice(0, 7),
          status: h.status || 'Planned',
          isGeneral: h.isGeneral || false,
        }))
        .filter(h => h.hypoName && h.mitreId);

      if (valid.length === 0) {
        showToast('No valid rows found. Make sure Hypothesis Name and MITRE ID are filled.', 'error');
        setImporting(false);
        return;
      }

      setProgress({ done: 0, total: valid.length });

      for (let i = 0; i < valid.length; i++) {
        await addHypothesis(valid[i]);
        setProgress({ done: i + 1, total: valid.length });
      }

      showToast(`✅ ${valid.length} hypotheses imported successfully!`, 'success');
      setImporting(false);
      if (onDone) onDone();

    } catch (err) {
      console.error(err);
      showToast(`Import failed: ${err.message}`, 'error');
      setImporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFile}
      />

      {/* Download template button */}
      <button
        onClick={() => downloadTemplate(mode)}
        title="Download template"
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#2a2d3e] text-gray-400 hover:text-white hover:border-gray-500 text-xs font-medium transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        Template
      </button>

      {/* Import button */}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={importing}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-lg ${
          mode === 'lead'
            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
            : 'bg-green-600 hover:bg-green-700 text-white shadow-green-500/20'
        } disabled:opacity-60 disabled:cursor-not-allowed`}
      >
        {importing ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {progress.done}/{progress.total}
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            {mode === 'lead' ? '📋 Lead Import' : '📥 Import Hypotheses'}
          </>
        )}
      </button>
    </div>
  );
}
