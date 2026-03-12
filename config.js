const READERS = [
  'Emiline',
  'Emilie',
  'Julie',
  'Laura M',
  'Laura V',
  'Zoé'
];

// Reader accent colors (CSS variables defined in styles.css)
const COLORS = {
  'Emiline': 'var(--reader-emiline)',
  'Emilie': 'var(--reader-emilie)',
  'Julie': 'var(--reader-julie)',
  'Laura M': 'var(--reader-laura-m)',
  'Laura V': 'var(--reader-laura-v)',
  'Zoé': 'var(--reader-zoe)'
};
const EMOJI = {
  'Emiline': '🌸',
  'Emilie': '🦋',
  'Julie': '🍂',
  'Laura M': '👻',
  'Laura V': '☀️',
  'Zoé': '✨'
};
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const MSHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

// Genre colors map to CSS tokens (see styles.css :root)
const GC = {
  'BD': 'var(--navy)',
  'Roman graphique': 'var(--navy-mid)',
  'Manga': 'var(--indigo)',
  'Romance': 'var(--coral)',
  'Romantasy': 'var(--gold)',
  '(Auto-)biographie': 'var(--teal)',
  'Littérature contemporaine': 'var(--teal-deep)',
  'Fantasy': 'var(--mint)',
  'Jeunesse': 'var(--violet)',
  'Essai': 'var(--text-light)',
  'Nouvelles': 'var(--slate)',
  'Thriller': 'var(--rust)',
  'Littérature historique': 'var(--stone)',
  'Webtoon': 'var(--pink)',
  'SF': 'var(--blue)'
};
const GE = { 'BD': '📕', 'Roman graphique': '📗', 'Romance': '💕', 'Romantasy': '🐉', '(Auto-)biographie': '📔', 'Fantasy': '⚔️', 'Jeunesse': '🌟', 'Essai': '📝', 'Nouvelles': '📄', 'Thriller': '🔪', 'Littérature contemporaine': '📖', 'Manga': '🎌' };
const gc = g => GC[g] || 'var(--slate)';
const ge = g => GE[g] || '📚';

// ════════════════════════════════════════════════
//  ⚙️  CONFIGURATION — seule ligne à modifier
//  si l'URL du Apps Script venait à changer
// Now using the real Gsheet file, owned by Laura V
// ════════════════════════════════════════════════
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxtk_FIGTuZ2NyM5ZT-9n2NOMaMvVe9yQulpv6NZyHkOR_TXj9ghUQHlMkWS5FA7BNr/exec';
