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
          console.log("🚀 Nouvelle version détectée ! Mise à jour...");
          
          // On peut afficher un petit toast ou forcer direct
          // Ici on force le rechargement en ignorant le cache
          window.location.reload(true);
        }
      } catch (err) {
        // Erreur silencieuse (ex: offline)
      }
    }, 1000 * 60 * 5); // 5 minutes

    return () => clearInterval(interval);
  }, [currentVersion]);

  return null; // Composant invisible
};

export default VersionChecker;
