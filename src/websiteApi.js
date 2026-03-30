const API_URL    = 'https://firststand.misfeets.com/api_bot.php';
const API_SECRET = process.env.WEBSITE_BOT_SECRET || 'MISFEETS_BOT_SECRET_2024';

/**
 * Envoie le résultat d'un match au site web First Stand.
 * @param {object} match - L'objet match complet (issu de getMatchById après mise à jour)
 */
async function sendScoreToWebsite(match) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        match_id:      match.id,
        tournament_id: match.tournament_id,
        score1:        match.score_team1,
        score2:        match.score_team2,
        winner_id:     match.winner_id,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      console.log(`[WebsiteAPI] Score match #${match.id} envoyé :`, data.message ?? 'OK');
    } else {
      console.error(`[WebsiteAPI] Erreur API site web (match #${match.id}) :`, data.message ?? response.status);
    }
  } catch (error) {
    console.error(`[WebsiteAPI] Impossible de contacter le site web (match #${match.id}) :`, error);
  }
}

module.exports = { sendScoreToWebsite };
