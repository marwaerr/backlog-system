// Créez src/DebugAuth.js
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const DebugAuth = () => {
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    const testAuth = async () => {
      let info = '=== DÉBOGAGE SUPABASE ===\n\n';
      
      // Test 1: Configuration
      info += `1. Configuration:\n`;
      info += `   - NODE_ENV: ${process.env.NODE_ENV}\n`;
      info += `   - REACT_APP_SUPABASE_URL: ${process.env.REACT_APP_SUPABASE_URL ? '✓ DÉFINI' : '✗ MANQUANT'}\n`;
      info += `   - REACT_APP_SUPABASE_ANON_KEY: ${process.env.REACT_APP_SUPABASE_ANON_KEY ? '✓ DÉFINI' : '✗ MANQUANT'}\n\n`;

      // Test 2: Connexion simple
      try {
        info += `2. Test de connexion:\n`;
        const { data, error } = await supabase.auth.signInWithPassword({
          email: 'admin@ocpnutricrops.ma',
          password: 'AdminOCP2024!'
        });

        if (error) {
          info += `   ✗ Erreur: ${error.message}\n`;
        } else {
          info += `   ✓ Connecté: ${data.user.email}\n`;
        }
      } catch (err) {
        info += `   ✗ Exception: ${err.message}\n`;
      }

      // Test 3: Vérification session
      try {
        info += `\n3. Session actuelle:\n`;
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          info += `   ✓ Session active: ${session.user.email}\n`;
        } else {
          info += `   ✗ Aucune session\n`;
        }
      } catch (err) {
        info += `   ✗ Erreur session: ${err.message}\n`;
      }

      setDebugInfo(info);
    };

    testAuth();
  }, []);

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto mt-8">
      <h2 className="text-xl font-bold text-red-600 mb-4">Debug Authentication</h2>
      <pre className="whitespace-pre-wrap bg-gray-100 p-4 rounded text-sm">
        {debugInfo || 'Chargement...'}
      </pre>
    </div>
  );
};

export default DebugAuth;