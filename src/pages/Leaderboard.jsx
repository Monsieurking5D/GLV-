// src/pages/Leaderboard.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import './Leaderboard.css';

export default function Leaderboard() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        // Obtenir le top 20 par solde du portefeuille
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, wallet_balance, games_won, games_played')
          .order('wallet_balance', { ascending: false })
          .limit(20);

        if (error) throw error;
        setPlayers(data || []);
      } catch (err) {
        console.error("Erreur de chargement du leaderboard:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="leaderboard-page loading-state">
        <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
        <p>Recherche des légendes en cours...</p>
      </div>
    );
  }

  // Sépare le top 3 pour le podium
  const top3 = players.slice(0, 3);
  const others = players.slice(3);

  // Pour l'affichage, on re-ordonne le podium visuellement : 2ème, 1er, 3ème
  const podiumOrder = [];
  if (top3[1]) podiumOrder.push({ ...top3[1], rank: 2 });
  if (top3[0]) podiumOrder.push({ ...top3[0], rank: 1 });
  if (top3[2]) podiumOrder.push({ ...top3[2], rank: 3 });

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-header">
        <h1 className="leaderboard-title">Hall of Fame</h1>
        <p className="leaderboard-subtitle">Affrontez l'élite. Découvrez les joueurs les plus riches et les plus victorieux de GoldenLudo.</p>
      </div>

      {players.length === 0 ? (
        <div className="empty-state">
          <h2>Aucun joueur pour le moment.</h2>
          <p>Soyez le premier à inscrire votre nom dans l'histoire !</p>
        </div>
      ) : (
        <>
          {/* Podium */}
          {podiumOrder.length > 0 && (
            <div className="podium-container">
              {podiumOrder.map(player => (
                <div key={player.id} className={`podium-item rank-${player.rank}`}>
                  <div className="podium-avatar">
                    {player.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="podium-base">
                    <span className="podium-rank-number">{player.rank}</span>
                    <span className="podium-name">{player.username}</span>
                    <span className="podium-score gold">{player.wallet_balance.toFixed(0)}€</span>
                    <span className="podium-score">{player.games_won} victoires</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Liste complète des joueurs */}
          <div className="leaderboard-list">
            <div className="list-header">
              <div>Rang</div>
              <div>Joueur</div>
              <div className="hide-mobile">Victoires</div>
              <div>Solde</div>
            </div>

            {players.map((player, index) => (
              <div className="list-row" key={player.id}>
                <div className="list-rank">#{index + 1}</div>
                <div className="list-user">
                  <div className="mini-avatar">{player.username.charAt(0).toUpperCase()}</div>
                  <span>{player.username}</span>
                </div>
                <div className="list-value hide-mobile">
                  {player.games_won} / {player.games_played}
                </div>
                <div className="list-value highlight">
                  {player.wallet_balance.toFixed(2)}€
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
