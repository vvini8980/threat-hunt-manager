import { supabase } from './supabase';

// ── Helpers ──────────────────────────────────
export const normalizeMonth = (monthStr) => {
  if (!monthStr) return new Date().toISOString().slice(0, 7);
  if (/^\d{4}-\d{2}$/.test(monthStr)) return monthStr;
  
  const currentYear = new Date().getFullYear();
  const lower = monthStr.toLowerCase().trim();
  const monthMap = {
    jan: '01', january: '01', feb: '02', february: '02',
    mar: '03', march: '03', apr: '04', april: '04',
    may: '05', jun: '06', june: '06', jul: '07', july: '07',
    aug: '08', august: '08', sep: '09', september: '09',
    oct: '10', october: '10', nov: '11', november: '11',
    dec: '12', december: '12'
  };
  
  if (monthMap[lower]) return `${currentYear}-${monthMap[lower]}`;
  
  const d = new Date(monthStr);
  if (!isNaN(d.getTime())) {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}`;
  }
  return monthStr;
};

const hypoNameKey = (name) => (name || '').trim().toLowerCase();

const rowTimestamp = (row) => {
  const t = row?.updated_at || row?.updatedAt || row?.created_at || row?.createdAt;
  return t ? new Date(t).getTime() : 0;
};

/** One row per hypothesis name; newest updated_at wins. */
export const dedupeHypothesesByName = (rows = []) => {
  const groups = new Map();

  for (const row of rows) {
    const key = hypoNameKey(row.hypoName) || row.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const unique = [];
  for (const group of groups.values()) {
    group.sort((a, b) => rowTimestamp(b) - rowTimestamp(a));
    unique.push(group[0]);
  }

  return unique.sort((a, b) =>
    (a.hypoName || '').localeCompare(b.hypoName || '', undefined, { sensitivity: 'base' })
  );
};

export const getHypothesisByName = async (hypoName) => {
  const key = hypoNameKey(hypoName);
  if (!key) return null;

  const { data, error } = await supabase
    .from('hypotheses')
    .select('id, hypoName, updated_at, created_at');

  if (error) return null;

  const matches = (data || []).filter(h => hypoNameKey(h.hypoName) === key);
  if (!matches.length) return null;

  matches.sort((a, b) => rowTimestamp(b) - rowTimestamp(a));
  return matches[0];
};

// ── CRUD - Hypotheses Library ─────────────────

export const getAllHypotheses = async () => {
  try {
    const { data, error } = await supabase
      .from('hypotheses')
      .select('*, comments(*)');
      
    if (error) {
      console.error('Supabase error fetching hypotheses:', error);
      return [];
    }
    
    const rows = (data || []).map(h => ({
      ...h,
      month: normalizeMonth(h.month),
    }));

    const unique = dedupeHypothesesByName(rows);
    const keepIds = new Set(unique.map(h => h.id));
    const duplicateIds = rows.filter(h => !keepIds.has(h.id)).map(h => h.id);

    if (duplicateIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('hypotheses')
        .delete()
        .in('id', duplicateIds);

      if (deleteError) {
        console.warn('Could not remove duplicate hypotheses from database:', deleteError.message);
      }
    }

    return unique;
  } catch (err) {
    console.error('Exception fetching hypotheses:', err);
    return [];
  }
};

export const getHypothesisById = async (id) => {
  const { data, error } = await supabase
    .from('hypotheses')
    .select('*, comments(*)')
    .eq('id', id)
    .single();
    
  if (error) return null;
  return { ...data, month: normalizeMonth(data.month) };
};

const buildTrackingFields = ({ clientName, assignedAnalyst, month, status, planned, isGeneral, result }) => {
  if (!month) return null;
  return {
    month: normalizeMonth(month),
    clientName: clientName || '',
    assignedAnalyst: assignedAnalyst || '',
    status: status || 'Pending',
    planned: planned || '',
    isGeneral: isGeneral || false,
    result: result || '',
  };
};

/** Create or update monthly assignment row for a hypothesis */
export const upsertAssignmentForMonth = async (hypothesisId, trackingFields) => {
  if (!hypothesisId || !trackingFields?.month) return null;

  const payload = {
    hypothesis_id: hypothesisId,
    ...trackingFields,
    updated_at: new Date().toISOString(),
  };

  const { data: existing, error: findError } = await supabase
    .from('assignments')
    .select('id')
    .eq('hypothesis_id', hypothesisId)
    .eq('month', trackingFields.month)
    .maybeSingle();

  if (findError) {
    console.warn('Assignment lookup failed:', findError.message);
  }

  if (existing?.id) {
    const { data, error } = await supabase
      .from('assignments')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();

    if (!error) return data;
  } else {
    const { data, error } = await supabase
      .from('assignments')
      .insert([payload])
      .select()
      .single();

    if (!error) return data;
    console.warn('Assignment insert failed (check Supabase RLS):', error?.message);
  }

  // Legacy fallback: store campaign fields on hypotheses when assignments blocked
  await supabase
    .from('hypotheses')
    .update({
      month: trackingFields.month,
      clientName: trackingFields.clientName,
      assignedAnalyst: trackingFields.assignedAnalyst,
      status: trackingFields.status,
      planned: trackingFields.planned,
      isGeneral: trackingFields.isGeneral,
      result: trackingFields.result,
      updated_at: new Date().toISOString(),
    })
    .eq('id', hypothesisId);

  return null;
};

/**
 * @param {object} data - hypothesis + optional campaign fields
 * @param {{ campaign?: boolean }} options - campaign=true for lead monthly uploads
 */
export const addHypothesis = async (data, { campaign = false } = {}) => {
  const { id, comments, createdAt, updatedAt, ...insertData } = data;
  const { clientName, assignedAnalyst, month, status, planned, isGeneral, result, ...hypoData } = insertData;

  const trackingFields = buildTrackingFields({
    clientName, assignedAnalyst, month, status, planned, isGeneral, result,
  });
  const isCampaign = campaign && trackingFields;

  let hypothesisId;

  const existing = hypoData.hypoName ? await getHypothesisByName(hypoData.hypoName) : null;

  if (existing) {
    hypothesisId = existing.id;
    const { error: updateError } = await supabase
      .from('hypotheses')
      .update({ ...hypoData, updated_at: new Date().toISOString() })
      .eq('id', hypothesisId);

    if (updateError) {
      console.error('Error updating library hypothesis:', updateError);
      throw updateError;
    }
  } else {
    const insertPayload = isCampaign
      ? { ...hypoData, ...trackingFields }
      : { ...hypoData };

    const { data: inserted, error } = await supabase
      .from('hypotheses')
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      console.error('Error adding hypothesis:', error);
      throw error;
    }
    hypothesisId = inserted.id;
  }

  if (isCampaign) {
    await upsertAssignmentForMonth(hypothesisId, trackingFields);
  }

  return getHypothesisById(hypothesisId);
};

export const updateHypothesis = async (id, data) => {
  const { comments, created_at, updated_at, id: hypoId, createdAt, updatedAt, ...updateData } = data;
  
  const { clientName, assignedAnalyst, month, status, planned, isGeneral, result, ...hypoData } = updateData;

  const payload = {
    ...hypoData,
    updated_at: new Date().toISOString(),
  };

  const trackingFields = buildTrackingFields({
    clientName, assignedAnalyst, month, status, planned, isGeneral, result,
  });

  if (trackingFields) {
    if (clientName !== undefined) payload.clientName = clientName;
    if (assignedAnalyst !== undefined) payload.assignedAnalyst = assignedAnalyst;
    if (status !== undefined) payload.status = status;
    if (planned !== undefined) payload.planned = planned;
    if (isGeneral !== undefined) payload.isGeneral = isGeneral;
    if (result !== undefined) payload.result = result;
    payload.month = trackingFields.month;
  }

  const { data: updated, error } = await supabase
    .from('hypotheses')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
    
  if (error) {
    console.error('Error updating hypothesis:', error);
    throw error;
  }

  if (trackingFields) {
    await upsertAssignmentForMonth(id, trackingFields);
  }

  return updated;
};

export const deleteHypothesis = async (id) => {
  const { error } = await supabase
    .from('hypotheses')
    .delete()
    .eq('id', id);
    
  if (error) {
    console.error('Error deleting hypothesis:', error);
    return false;
  }
  return true;
};

// ── CRUD - Assignments ───────────────────────

const mapAssignmentRow = (a) => ({
  id: a.id,
  month: normalizeMonth(a.month),
  clientName: a.clientName || '',
  assignedAnalyst: a.assignedAnalyst || '',
  status: a.status || 'Pending',
  planned: a.planned || '',
  isGeneral: a.isGeneral || false,
  result: a.result || '',
  created_at: a.created_at,
  updated_at: a.updated_at,
  hypothesis_id: a.hypothesis_id,
  hypoName: a.hypotheses?.hypoName || 'Untitled Hypothesis',
  mitreId: a.hypotheses?.mitreId || '--',
  subTechnique: a.hypotheses?.subTechnique || '',
  tactic: a.hypotheses?.tactic || '',
  description: a.hypotheses?.description || '',
  huntingLogic: a.hypotheses?.huntingLogic || '',
  socDetectionRule: a.hypotheses?.socDetectionRule || '',
  splunkSPL: a.hypotheses?.splunkSPL || '',
  qradarAQL: a.hypotheses?.qradarAQL || '',
  sentinelKQL: a.hypotheses?.sentinelKQL || '',
  comments: a.comments || a.hypotheses?.comments || [],
  _source: 'assignment',
});

/** Legacy rows: campaign fields stored directly on hypotheses (pre-assignments split). */
const mapHypothesisAsAssignment = (h) => ({
  id: h.id,
  month: normalizeMonth(h.month),
  clientName: h.clientName || '',
  assignedAnalyst: h.assignedAnalyst || '',
  status: h.status || 'Pending',
  planned: h.planned || '',
  isGeneral: h.isGeneral || false,
  result: h.result || '',
  created_at: h.created_at,
  updated_at: h.updated_at,
  hypothesis_id: h.id,
  hypoName: h.hypoName || 'Untitled Hypothesis',
  mitreId: h.mitreId || '--',
  subTechnique: h.subTechnique || '',
  tactic: h.tactic || '',
  description: h.description || '',
  huntingLogic: h.huntingLogic || '',
  socDetectionRule: h.socDetectionRule || '',
  splunkSPL: h.splunkSPL || '',
  qradarAQL: h.qradarAQL || '',
  sentinelKQL: h.sentinelKQL || '',
  comments: h.comments || [],
  _source: 'hypothesis',
});

export const getAssignmentForHypothesisMonth = async (hypothesisId, month) => {
  const normalized = normalizeMonth(month);
  if (!hypothesisId || !normalized) return null;

  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .eq('hypothesis_id', hypothesisId)
    .eq('month', normalized)
    .maybeSingle();

  if (!error && data) return { ...data, month: normalized };

  const hypo = await getHypothesisById(hypothesisId);
  if (hypo && normalizeMonth(hypo.month) === normalized) {
    return mapHypothesisAsAssignment(hypo);
  }
  return null;
};

export const getAllAssignments = async () => {
  try {
    const { data, error } = await supabase
      .from('assignments')
      .select('*, hypotheses(*), comments(*)');
      
    if (error) {
      console.error('Supabase error fetching assignments:', error);
      return [];
    }

    if (data?.length) {
      return data.map(mapAssignmentRow);
    }

    // Fallback: data imported into hypotheses only (assignments empty or blocked by RLS)
    const hypotheses = await getAllHypotheses();
    return hypotheses
      .filter(h => h.month)
      .map(mapHypothesisAsAssignment);
  } catch (err) {
    console.error('Exception fetching assignments:', err);
    return [];
  }
};

export const updateAssignment = async (id, data) => {
  const { comments, created_at, updated_at, id: assignId, hypothesis_id, _source, ...updateData } = data;

  const { data: updated, error } = await supabase
    .from('assignments')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (!error) return updated;

  // Legacy path: campaign row lives on hypotheses
  const { data: hypoUpdated, error: hypoError } = await supabase
    .from('hypotheses')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (hypoError) {
    console.error('Error updating assignment:', error);
    console.error('Error updating hypothesis fallback:', hypoError);
    throw hypoError;
  }
  return hypoUpdated;
};

export const deleteAssignment = async (id) => {
  const { error } = await supabase
    .from('assignments')
    .delete()
    .eq('id', id);
    
  if (error) {
    console.error('Error deleting assignment:', error);
    return false;
  }
  return true;
};

// ── Comments ──────────────────────────────────

export const addComment = async (id, commentText, analyst = 'Analyst') => {
  const { data, error } = await supabase
    .from('comments')
    .insert([{
      hypothesis_id: id,
      text: commentText,
      analyst: analyst
    }])
    .select()
    .single();
    
  if (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
  return data;
};

// ── Stats (Synchronous logic over passed array) ──────────────────

export const getStats = (all = []) => {
  return {
    total: all.length,
    planned: all.filter(h => h.status === 'Planned').length,
    active: all.filter(h => h.status === 'Active').length,
    pending: all.filter(h => h.status === 'Pending').length,
    completed: all.filter(h => h.status === 'Completed').length,
    closed: all.filter(h => h.status === 'Closed').length,
    tp: all.filter(h => h.result === 'TP').length,
    fp: all.filter(h => h.result === 'FP').length,
    undetermined: all.filter(h => h.result === 'Undetermined').length,
  };
};

export const getMonthlyStats = (all = []) => {
  const months = {};
  all.forEach(h => {
    if (!h.month) return;
    if (!months[h.month]) {
      months[h.month] = { month: h.month, total: 0, tp: 0, fp: 0 };
    }
    months[h.month].total++;
    if (h.result === 'TP') months[h.month].tp++;
    if (h.result === 'FP') months[h.month].fp++;
  });
  return Object.values(months).sort((a, b) =>
    a.month.localeCompare(b.month)
  );
};

export const seedTestData = async () => {
  // Emptying seed function as data comes from the live database now
};
