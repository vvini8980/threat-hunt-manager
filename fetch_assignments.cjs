const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://rjuvlpyxmwyglaukqgly.supabase.co', 'sb_publishable_5mc5I6wxO4T71Xu3VbCSXA__uWAL6FQ');
(async () => {
  const { data, error } = await supabase.from('assignments').select('*, hypotheses(*, comments(*))');
  if (error) console.error(error);
  else {
    console.log(`Fetched ${data.length} assignments.`);
    data.forEach((a, i) => {
      console.log(`[${i}] ID: ${a.id}, Client: ${a.clientName}, Analyst: ${a.assignedAnalyst}, General: ${a.isGeneral}, Hypo: ${a.hypotheses ? 'Yes' : 'No'}`);
    });
  }
})();
