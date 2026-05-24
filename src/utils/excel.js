import * as XLSX from 'xlsx';

export const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet);
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

export const mapRowToHypothesis = (row, columnMap) => {
  const hypothesis = {};
  
  Object.keys(columnMap).forEach(key => {
    const excelColumnName = columnMap[key];
    hypothesis[key] = row[excelColumnName] !== undefined ? row[excelColumnName] : '';
  });
  
  return hypothesis;
};

export const exportToExcel = (hypotheses, filename) => {
  if (!hypotheses || hypotheses.length === 0) return;

  const exportData = hypotheses.map(h => ({
    "Hypothesis Name": h.hypoName || '',
    "MITRE ID": h.mitreId || '',
    "Sub Technique": h.subTechnique || '',
    "Tactic": h.tactic || '',
    "Month": h.month || '',
    "Status": h.status || '',
    "Planned Date": h.planned || '',
    "Client Name": h.clientName || '',
    "Assigned Analyst": h.assignedAnalyst || '',
    "General Hunt": h.isGeneral ? 'Yes' : 'No',
    "Description": h.description || '',
    "Hunting Logic": h.huntingLogic || '',
    "SOC Rule": h.socDetectionRule || '',
    "Splunk Query": h.splunkSPL || '',
    "QRadar Query": h.qradarAQL || '',
    "Sentinel Query": h.sentinelKQL || '',
    "Result": h.result || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Hypotheses");

  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const generateExcelTemplate = () => {
  const emptyRow = {
    "Hypothesis Name": "",
    "MITRE ID": "",
    "Sub Technique": "",
    "Tactic": "",
    "Month": "",
    "Status": "",
    "Planned Date": "",
    "Client Name": "",
    "Assigned Analyst": "",
    "General Hunt": "No",
    "Description": "",
    "Hunting Logic": "",
    "SOC Rule": "",
    "Splunk Query": "",
    "QRadar Query": "",
    "Sentinel Query": "",
    "Result": "",
  };

  const worksheet = XLSX.utils.json_to_sheet([emptyRow]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template");

  XLSX.writeFile(workbook, "Hypothesis_Template.xlsx");
};
