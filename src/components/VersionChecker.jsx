import React, { useEffect, useState } from 'react';

/**
 * Composant invisible qui vérifie si une nouvelle version du site a été déployée.
 * Si c'est le cas, il force un rafraîchissement propre du navigateur.
 */
const VersionChecker = () => {
  const [currentVersion, setCurrentVersion] = useState(null);

  useEffect(() => {
    // 1. Récupérer la version initiale au chargement
    const fetchInitialVersion = async () => {
      try {
        const res = await fetch('/version.json?t=' + Date.now());
        const data = await res.json();
        setCurrentVersion(data.version);
      } catch (err) {
        console.warn("VersionChecker: Impossible de lire la version initiale.");
      }
    };

    fetchInitialVersion();

    // 2. Vérifier périodiquement (toutes les 5 minutes)
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/version.json?t=' + Date.now());
        const data = await res.json();
        
        if (currentVersion && data.version && data.version !== currentVersion) {
          console.log("🚀 Nouvelle version détectée ! Déconnexion de sécurité et mise à jour...");
          
          try {
            // Importer dynamiquement pour éviter les dépendances lourdes si pas besoin
            const { supabase } = await import('../lib/supabase');
            await supabase.auth.signOut();
          } catch (e) {
            console.error("Erreur lors de la déconnexion auto:", e);
          }

          // Force le rechargement pour charger le nouveau JS
          window.location.reload();
        }
      } catch (err) {
        // Erreur silencieuse (ex: offline)
      }
    }, 1000 * 60 * 1); // 1 minute

    return () => clearInterval(interval);
  }, [currentVersion]);

  return null; // Composant invisible
};

export default VersionChecker;
