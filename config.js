const READERS = [
  'Emiline',
  'Emilie',
  'Julie',
  'Laura M',
  'Laura V',
  'Zoé'
];
const COLORS = {
  'Emiline': '#ca8a04',
  'Emilie': '#0891b2',
  'Julie': '#db2777',
  'Laura M': '#365cca',
  'Laura V': '#1ab46a',
  'Zoé': '#836bdd'
};
const EMOJI = {
  'Emiline': '🌸',
  'Emilie': '🦋',
  'Julie': '🌺',
  'Laura M': '📖',
  'Laura V': '☀️',
  'Zoé': '✨'
};
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const MSHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const GC = { 'BD': '#1a2f5e', 'Roman graphique': '#2a4480', 'Manga': '#1e40af', 'Romance': '#e85d3a', 'Romantasy': '#d4820a', '(Auto-)biographie': '#0891b2', 'Littérature contemporaine': '#0e7490', 'Fantasy': '#059669', 'Jeunesse': '#7c3aed', 'Essai': '#6b7fa8', 'Nouvelles': '#94a3b8', 'Thriller': '#c4512e', 'Littérature historique': '#78716c', 'Webtoon': '#db2777', 'SF': '#2563eb' };
const GE = { 'BD': '📕', 'Roman graphique': '📗', 'Romance': '💕', 'Romantasy': '🐉', '(Auto-)biographie': '📔', 'Fantasy': '⚔️', 'Jeunesse': '🌟', 'Essai': '📝', 'Nouvelles': '📄', 'Thriller': '🔪', 'Littérature contemporaine': '📖', 'Manga': '🎌' };
const gc = g => GC[g] || '#94a3b8';
const ge = g => GE[g] || '📚';

// ════════════════════════════════════════════════
//  ⚙️  CONFIGURATION — seule ligne à modifier
//  si l'URL du Apps Script venait à changer
// Now using the real Gsheet file, owned by Laura V
// ════════════════════════════════════════════════
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxtk_FIGTuZ2NyM5ZT-9n2NOMaMvVe9yQulpv6NZyHkOR_TXj9ghUQHlMkWS5FA7BNr/exec';
