const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://rjuvlpyxmwyglaukqgly.supabase.co', 'sb_publishable_5mc5I6wxO4T71Xu3VbCSXA__uWAL6FQ');
(async () => {
  const { data, error } = await supabase.from('assignments').update({ isGeneral: false }).in('clientName', ['Wayne Enterprises', 'Stark Industries']);
  if (error) console.error(error);
  else console.log('Successfully updated Wayne and Stark to isGeneral = false.');
})();
