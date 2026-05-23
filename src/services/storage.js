import { supabase } from './supabase';

// ── Helpers ──────────────────────────────────
const normalizeMonth = (monthStr) => {
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

// ── CRUD ─────────────────────────────────────

export const getAllHypotheses = async () => {
  try {
    const { data, error } = await supabase
      .from('hypotheses')
      .select('*, comments(*)');
      
    if (error) {
      console.error('Supabase error fetching hypotheses:', error);
      return [];
    }
    
    return (data || []).map(h => ({
      ...h,
      month: normalizeMonth(h.month)
    }));
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

export const addHypothesis = async (data) => {
  // Strip out UI-only or nested arrays like comments if they were passed
  const { id, comments, createdAt, updatedAt, ...insertData } = data;
  
  const { data: inserted, error } = await supabase
    .from('hypotheses')
    .insert([insertData])
    .select()
    .single();
    
  if (error) {
    console.error('Error adding hypothesis:', error);
    throw error;
  }
  return inserted;
};

export const updateHypothesis = async (id, data) => {
  const { comments, created_at, updated_at, id: hypoId, createdAt, updatedAt, ...updateData } = data;
  
  const { data: updated, error } = await supabase
    .from('hypotheses')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
    
  if (error) {
    console.error('Error updating hypothesis:', error);
    throw error;
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
