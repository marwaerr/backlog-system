import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Search, TrendingUp, Clock, CheckCircle, AlertCircle, BarChart3, List, X, MessageSquare, Bell, CalendarX, LogOut, User, Lock, Key, Eye, EyeOff } from 'lucide-react';
import { supabase } from './supabaseClient';

const BacklogSystem = () => {
  // État d'authentification
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [appLoading, setAppLoading] = useState(true);

  // États pour le changement de mot de passe
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // États de l'application
  const [activeTab, setActiveTab] = useState('dashboard');
  const [requests, setRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('Tous');
  const [filterPriority, setFilterPriority] = useState('Tous');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  
  const [newFollowUp, setNewFollowUp] = useState({
    date: new Date().toISOString().split('T')[0],
    personne: '',
    action: ''
  });

  const [newRequest, setNewRequest] = useState({
    date_reception: new Date().toISOString().split('T')[0],
    title: '',
    description: '',
    demandeur: '',
    assignee: '',
    statut: 'En attente',
    deadline: '', // Maintenant facultatif
    frequence_rappel: null,
    date_cloture: null, // Date de clôture séparée
    priority: 'Moyenne'
  });

  const statuts = ['En attente', 'En cours', 'Clôturé'];
  const priorities = ['Basse', 'Moyenne', 'Haute', 'Urgente'];
  const frequences = ['Quotidien', 'Hebdomadaire', 'Bimensuel', 'Mensuel'];

  // Vérifier la session au chargement
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await checkUser();
      } catch (error) {
        console.error('Erreur initialisation:', error);
      } finally {
        setAppLoading(false);
      }
    };
    
    initializeApp();
  }, []);

  // Charger les requêtes quand l'utilisateur est authentifié
  useEffect(() => {
    if (isAuthenticated) {
      fetchRequests();
    }
  }, [isAuthenticated]);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (!error && profile) {
          setIsAuthenticated(true);
          setCurrentUser(profile);
        }
      }
    } catch (error) {
      console.error('Erreur vérification session:', error);
    }
  };

  // Fonction de connexion avec Supabase Auth
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      });

      if (error) throw error;

      // Récupérer le profil utilisateur
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) throw profileError;

      setIsAuthenticated(true);
      setCurrentUser(profile);
      setLoginForm({ email: '', password: '' });
      
    } catch (error) {
      setLoginError('Email ou mot de passe incorrect');
      console.error('Erreur connexion:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fonction de déconnexion
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setCurrentUser(null);
      setRequests([]);
    } catch (error) {
      console.error('Erreur déconnexion:', error);
    }
  };

  // Fonction pour changer le mot de passe
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess('');

    // Validation
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Les nouveaux mots de passe ne correspondent pas');
      setPasswordLoading(false);
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 6 caractères');
      setPasswordLoading(false);
      return;
    }

    try {
      // Vérifier d'abord le mot de passe actuel
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: passwordForm.currentPassword,
      });

      if (signInError) {
        setPasswordError('Mot de passe actuel incorrect');
        setPasswordLoading(false);
        return;
      }

      // Changer le mot de passe
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (updateError) throw updateError;

      setPasswordSuccess('Mot de passe changé avec succès!');
      
      // Réinitialiser le formulaire
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      // Fermer le modal après 2 secondes
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess('');
      }, 2000);

    } catch (error) {
      console.error('Erreur changement mot de passe:', error);
      setPasswordError('Erreur lors du changement de mot de passe');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Récupérer toutes les requêtes
  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select(`
          *,
          follow_ups (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transformer les données pour l'interface
      const transformedData = data.map(request => ({
        id: request.id,
        dateReception: request.date_reception,
        title: request.title,
        description: request.description,
        demandeur: request.demandeur,
        assignee: request.assignee,
        statut: request.statut,
        followUps: request.follow_ups || [],
        deadline: request.deadline,
        frequenceRappel: request.frequence_rappel,
        dateCloture: request.date_cloture,
        priority: request.priority
      }));

      setRequests(transformedData);
    } catch (error) {
      console.error('Erreur lors du chargement des requêtes:', error);
    }
  };

  // Ajouter une nouvelle requête
  const addRequest = async () => {
    if (!newRequest.title || !newRequest.description || !newRequest.demandeur) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const requestData = {
        date_reception: newRequest.date_reception,
        title: newRequest.title,
        description: newRequest.description,
        demandeur: newRequest.demandeur,
        assignee: newRequest.assignee,
        statut: newRequest.statut,
        deadline: newRequest.deadline || null, // Accepte null pour deadline facultatif
        frequence_rappel: newRequest.frequence_rappel,
        priority: newRequest.priority,
        created_by: currentUser.id
      };

      const { error } = await supabase
        .from('requests')
        .insert([requestData]);

      if (error) throw error;

      // Réinitialiser le formulaire
      setNewRequest({
        date_reception: new Date().toISOString().split('T')[0],
        title: '',
        description: '',
        demandeur: '',
        assignee: '',
        statut: 'En attente',
        deadline: '',
        frequence_rappel: null,
        date_cloture: null,
        priority: 'Moyenne'
      });
      
      setShowForm(false);
      await fetchRequests();
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la requête:', error);
      alert('Erreur lors de l\'ajout de la requête');
    }
  };

  // Ajouter un follow-up
  const addFollowUp = async () => {
    if (!newFollowUp.personne || !newFollowUp.action || !selectedRequest) {
      alert('Veuillez remplir tous les champs du follow-up');
      return;
    }

    try {
      const followUpData = {
        request_id: selectedRequest.id,
        date: newFollowUp.date,
        personne: newFollowUp.personne,
        action: newFollowUp.action
      };

      const { error } = await supabase
        .from('follow_ups')
        .insert([followUpData]);

      if (error) throw error;

      setNewFollowUp({
        date: new Date().toISOString().split('T')[0],
        personne: '',
        action: ''
      });
      
      setShowFollowUpModal(false);
      setSelectedRequest(null);
      await fetchRequests();
    } catch (error) {
      console.error('Erreur lors de l\'ajout du follow-up:', error);
      alert('Erreur lors de l\'ajout du follow-up');
    }
  };

  // Mettre à jour une requête
  const updateRequest = async (id, field, value) => {
    try {
      const updateData = {};
      
      // Mapper les champs pour la base de données
      const fieldMapping = {
        'assignee': 'assignee',
        'statut': 'statut',
        'deadline': 'deadline',
        'dateCloture': 'date_cloture',
        'priority': 'priority'
      };

      const dbField = fieldMapping[field];
      if (!dbField) return;

      updateData[dbField] = value;

      // Logique métier pour les statuts
      const request = requests.find(req => req.id === id);
      if (field === 'assignee') {
        if (value && request?.statut === 'En attente') {
          updateData.statut = 'En cours';
        } else if (!value) {
          updateData.statut = 'En attente';
        }
      }

      // MODIFICATION : Logique améliorée pour la date de clôture
      if (field === 'statut' && value === 'Clôturé') {
        // Si le statut passe à "Clôturé" mais qu'aucune date de clôture n'est définie,
        // on utilise la date actuelle par défaut
        if (!request.dateCloture) {
          updateData.date_cloture = new Date().toISOString().split('T')[0];
        }
        updateData.frequence_rappel = null;
      } else if (field === 'statut' && value !== 'Clôturé') {
        // Si on revient d'un statut "Clôturé", on garde la date de clôture précédente
        // L'utilisateur peut la modifier manuellement s'il le souhaite
        // Ne pas réinitialiser automatiquement la date_cloture
      }

      const { error } = await supabase
        .from('requests')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      await fetchRequests();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
    }
  };

  // Supprimer une requête
  const deleteRequest = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette requête ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('requests')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchRequests();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  // Reste des fonctions utilitaires
  const isEnRetard = (req) => {
    if (req.statut === 'Clôturé' || !req.deadline) return false;
    const today = new Date();
    const deadline = new Date(req.deadline);
    return deadline < today;
  };

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const matchSearch = req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         req.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (req.assignee && req.assignee.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         req.demandeur.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatut = filterStatut === 'Tous' || req.statut === filterStatut;
      const matchPriority = filterPriority === 'Tous' || req.priority === filterPriority;
      
      let matchDate = true;
      if (dateDebut && dateFin) {
        const reqDate = new Date(req.dateReception);
        matchDate = reqDate >= new Date(dateDebut) && reqDate <= new Date(dateFin);
      } else if (dateDebut) {
        matchDate = new Date(req.dateReception) >= new Date(dateDebut);
      } else if (dateFin) {
        matchDate = new Date(req.dateReception) <= new Date(dateFin);
      }
      
      return matchSearch && matchStatut && matchPriority && matchDate;
    });
  }, [requests, searchTerm, filterStatut, filterPriority, dateDebut, dateFin]);

  // KPIs Calculation
  const kpis = useMemo(() => {
    const total = requests.length;
    const clotures = requests.filter(r => r.statut === 'Clôturé').length;
    const enCours = requests.filter(r => r.statut === 'En cours').length;
    const enAttente = requests.filter(r => r.statut === 'En attente').length;
    
    const tauxCloture = total > 0 ? ((clotures / total) * 100).toFixed(1) : 0;
    
    const requestsWithDates = requests.filter(r => r.dateCloture && r.dateReception);
    const tempsTraitement = requestsWithDates.length > 0
      ? (requestsWithDates.reduce((acc, r) => {
          const debut = new Date(r.dateReception);
          const fin = new Date(r.dateCloture);
          return acc + (fin - debut) / (1000 * 60 * 60 * 24);
        }, 0) / requestsWithDates.length).toFixed(1)
      : 0;

    const enRetard = requests.filter(r => isEnRetard(r)).length;

    const parPriorite = priorities.reduce((acc, p) => {
      acc[p] = requests.filter(r => r.priority === p && r.statut !== 'Clôturé').length;
      return acc;
    }, {});

    const parAssignee = {};
    requests.filter(r => r.statut !== 'Clôturé').forEach(r => {
      if (r.assignee) {
        parAssignee[r.assignee] = (parAssignee[r.assignee] || 0) + 1;
      }
    });

    return {
      total,
      clotures,
      enCours,
      enAttente,
      tauxCloture,
      tempsTraitement,
      enRetard,
      parPriorite,
      parAssignee
    };
  }, [requests, priorities]); // CORRECTION: Ajout de 'priorities' dans les dépendances

  const getStatutColor = (statut, enRetard = false) => {
    if (enRetard) {
      return 'bg-gradient-to-r from-red-500 to-red-600 text-white';
    }
    const colors = {
      'En attente': 'bg-gradient-to-r from-orange-500 to-orange-600 text-white',
      'En cours': 'bg-gradient-to-r from-blue-500 to-blue-600 text-white',
      'Clôturé': 'bg-gradient-to-r from-green-500 to-green-600 text-white'
    };
    return colors[statut] || 'bg-gray-500 text-white';
  };

  const getStatutBadge = (req) => {
    const enRetard = isEnRetard(req);
    if (enRetard) {
      return { label: 'En retard', color: getStatutColor('', true) };
    }
    
    // Indicateur pour les requêtes sans deadline
    if (!req.deadline && req.statut !== 'Clôturé') {
      return { 
        label: `${req.statut} (sans deadline)`, 
        color: getStatutColor(req.statut) 
      };
    }
    
    return { label: req.statut, color: getStatutColor(req.statut) };
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'Basse': 'bg-gray-100 text-gray-700 border-gray-300',
      'Moyenne': 'bg-blue-100 text-blue-700 border-blue-300',
      'Haute': 'bg-orange-100 text-orange-700 border-orange-300',
      'Urgente': 'bg-red-100 text-red-700 border-red-300'
    };
    return colors[priority] || 'bg-gray-100 text-gray-700';
  };

  // Écran de chargement
  if (appLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
          <h2 className="text-xl font-semibold text-gray-700">Chargement...</h2>
        </div>
      </div>
    );
  }

  // Écran de connexion
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full flex items-center justify-center mb-4">
              <Lock className="text-white" size={24} />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              OCP Nutricrops
            </h1>
            <p className="text-gray-600 mt-2">Système de Gestion des Requêtes</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email professionnel
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="votre.email@ocpnutricrops.ma"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="password"
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Votre mot de passe"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  required
                />
              </div>
            </div>

            {loginError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-600 text-sm font-semibold">{loginError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-600 text-center">
              Accès réservé à l'équipe support technique d'OCP Nutricrops
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Application principale (après authentification)
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Navigation Header avec utilisateur connecté */}
      <div className="bg-white shadow-lg border-b-4 border-emerald-500 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  OCP Nutricrops
                </h1>
                <p className="text-gray-600 text-xs sm:text-sm mt-1">Système de Gestion des Requêtes</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 w-full sm:w-auto justify-between">
              {/* Info utilisateur connecté */}
              <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-2 rounded-xl border border-emerald-200">
                <div className="w-8 h-8 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full flex items-center justify-center">
                  <User className="text-white" size={16} />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-gray-800">{currentUser.name}</p>
                  <p className="text-xs text-gray-600">{currentUser.role}</p>
                </div>
              </div>

              {/* Boutons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base"
                >
                  <Plus size={20} />
                  Nouvelle Requête
                </button>

                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="flex items-center gap-2 px-4 py-2 sm:py-3 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-all shadow-lg hover:shadow-xl text-sm sm:text-base"
                  title="Changer le mot de passe"
                >
                  <Key size={20} />
                  <span className="hidden sm:inline">Mot de passe</span>
                </button>
                
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 sm:py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all shadow-lg hover:shadow-xl text-sm sm:text-base"
                  title="Déconnexion"
                >
                  <LogOut size={20} />
                  <span className="hidden sm:inline">Déconnexion</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-t-lg font-semibold transition-all whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'dashboard'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <BarChart3 size={18} />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('liste')}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-t-lg font-semibold transition-all whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'liste'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <List size={18} />
              Liste
              <span className="ml-1 px-2 py-0.5 bg-white/30 rounded-full text-xs">{requests.length}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal de changement de mot de passe */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 sm:p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xl sm:text-2xl font-bold">Changer le mot de passe</h3>
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordForm({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    });
                    setPasswordError('');
                    setPasswordSuccess('');
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="p-4 sm:p-6">
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Mot de passe actuel
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      className="w-full pl-12 pr-12 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Votre mot de passe actuel"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      className="w-full pl-12 pr-12 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nouveau mot de passe"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirmer le nouveau mot de passe
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      className="w-full pl-12 pr-12 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Confirmer le nouveau mot de passe"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {passwordError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-red-600 text-sm font-semibold">{passwordError}</p>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-green-600 text-sm font-semibold">{passwordSuccess}</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {passwordLoading ? 'Changement...' : 'Changer le mot de passe'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPasswordForm({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: ''
                      });
                      setPasswordError('');
                      setPasswordSuccess('');
                    }}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-semibold"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8">
              <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 sm:p-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl sm:text-2xl font-bold">Nouvelle Requête</h3>
                  <button
                    onClick={() => setShowForm(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
              
              <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Demandeur *</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      value={newRequest.demandeur}
                      onChange={(e) => setNewRequest({...newRequest, demandeur: e.target.value})}
                      placeholder="Nom de la personne qui émet la requête"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Date de Réception</label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      value={newRequest.date_reception}
                      onChange={(e) => setNewRequest({...newRequest, date_reception: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Priorité</label>
                    <select
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      value={newRequest.priority}
                      onChange={(e) => setNewRequest({...newRequest, priority: e.target.value})}
                    >
                      {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Titre *</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      value={newRequest.title}
                      onChange={(e) => setNewRequest({...newRequest, title: e.target.value})}
                      placeholder="Titre de la requête"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
                    <textarea
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      rows="4"
                      value={newRequest.description}
                      onChange={(e) => setNewRequest({...newRequest, description: e.target.value})}
                      placeholder="Description détaillée de la requête"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Assigné à</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      value={newRequest.assignee}
                      onChange={(e) => setNewRequest({...newRequest, assignee: e.target.value})}
                      placeholder="Laisser vide si non assignée"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Deadline <span className="text-gray-400 text-xs">(facultatif)</span>
                    </label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      value={newRequest.deadline}
                      onChange={(e) => setNewRequest({...newRequest, deadline: e.target.value})}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Fréquence de Rappel</label>
                    <select
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      value={newRequest.frequence_rappel || ''}
                      onChange={(e) => setNewRequest({...newRequest, frequence_rappel: e.target.value || null})}
                    >
                      <option value="">Aucun rappel</option>
                      {frequences.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <button
                    onClick={addRequest}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition font-semibold shadow-lg"
                  >
                    Ajouter la Requête
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-semibold"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Follow-up Modal */}
        {showFollowUpModal && selectedRequest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 sm:p-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold">Follow-ups</h3>
                    <p className="text-sm opacity-90 mt-1">Requête #{selectedRequest.id} - {selectedRequest.title}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowFollowUpModal(false);
                      setSelectedRequest(null);
                    }}
                    className="p-2 hover:bg-white/20 rounded-lg transition"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
              
              <div className="p-4 sm:p-6">
                {/* Historique des follow-ups */}
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-gray-800 mb-4">Historique des Actions</h4>
                  {selectedRequest.followUps.length > 0 ? (
                    <div className="space-y-3">
                      {selectedRequest.followUps.map((fu, index) => (
                        <div key={index} className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border-l-4 border-blue-500">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                            <span className="font-semibold text-blue-900">{fu.personne}</span>
                            <span className="text-sm text-blue-700">{fu.date}</span>
                          </div>
                          <p className="text-gray-700">{fu.action}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">Aucun follow-up pour le moment</p>
                  )}
                </div>

                {/* Ajouter nouveau follow-up */}
                <div className="border-t pt-6">
                  <h4 className="text-lg font-bold text-gray-800 mb-4">Ajouter un Follow-up</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                      <input
                        type="date"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={newFollowUp.date}
                        onChange={(e) => setNewFollowUp({...newFollowUp, date: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Personne</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={newFollowUp.personne}
                        onChange={(e) => setNewFollowUp({...newFollowUp, personne: e.target.value})}
                        placeholder="Nom de la personne"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Action effectuée</label>
                      <textarea
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows="3"
                        value={newFollowUp.action}
                        onChange={(e) => setNewFollowUp({...newFollowUp, action: e.target.value})}
                        placeholder="Décrivez l'action effectuée"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    <button
                      onClick={addFollowUp}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition font-semibold shadow-lg"
                    >
                      Ajouter Follow-up
                    </button>
                    <button
                      onClick={() => {
                        setShowFollowUpModal(false);
                        setSelectedRequest(null);
                      }}
                      className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-semibold"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4 sm:space-y-6">
            {/* KPIs Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border-l-4 border-blue-500 hover:shadow-xl transition">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs sm:text-sm font-bold text-gray-600 uppercase tracking-wide">Total</h3>
                  <div className="p-2 sm:p-3 bg-blue-100 rounded-xl">
                    <TrendingUp className="text-blue-600" size={20} />
                  </div>
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">{kpis.total}</p>
                <div className="flex items-center gap-2 text-xs sm:text-sm flex-wrap">
                  <span className="px-2 sm:px-3 py-1 bg-orange-100 text-orange-700 rounded-full font-semibold">
                    {kpis.enAttente} attente
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border-l-4 border-green-500 hover:shadow-xl transition">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs sm:text-sm font-bold text-gray-600 uppercase tracking-wide">Taux Clôture</h3>
                  <div className="p-2 sm:p-3 bg-green-100 rounded-xl">
                    <CheckCircle className="text-green-600" size={20} />
                  </div>
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">{kpis.tauxCloture}%</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all"
                    style={{ width: `${kpis.tauxCloture}%` }}
                  />
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mt-2">{kpis.clotures} / {kpis.total} clôturées</p>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border-l-4 border-purple-500 hover:shadow-xl transition">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs sm:text-sm font-bold text-gray-600 uppercase tracking-wide">Temps Moyen</h3>
                  <div className="p-2 sm:p-3 bg-purple-100 rounded-xl">
                    <Clock className="text-purple-600" size={20} />
                  </div>
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">{kpis.tempsTraitement}</p>
                <p className="text-xs sm:text-sm text-gray-600">jours de traitement</p>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border-l-4 border-red-500 hover:shadow-xl transition">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs sm:text-sm font-bold text-gray-600 uppercase tracking-wide">En Retard</h3>
                  <div className="p-2 sm:p-3 bg-red-100 rounded-xl">
                    <AlertCircle className="text-red-600" size={20} />
                  </div>
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">{kpis.enRetard}</p>
                <p className="text-xs sm:text-sm text-gray-600">{kpis.enCours} en cours</p>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Statuts */}
              <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2">
                  <BarChart3 className="text-emerald-600" size={20} />
                  Répartition par Statut
                </h3>
                <div className="space-y-4">
                  {[
                    { label: 'En attente', value: kpis.enAttente, color: 'orange', total: kpis.total },
                    { label: 'En cours', value: kpis.enCours, color: 'blue', total: kpis.total },
                    { label: 'Clôturé', value: kpis.clotures, color: 'green', total: kpis.total }
                  ].map(item => {
                    const percentage = item.total > 0 ? ((item.value / item.total) * 100).toFixed(0) : 0;
                    return (
                      <div key={item.label}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs sm:text-sm font-semibold text-gray-700">{item.label}</span>
                          <span className="text-xs sm:text-sm font-bold text-gray-900">{item.value} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className={`bg-gradient-to-r from-${item.color}-500 to-${item.color}-600 h-3 rounded-full transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Priorities */}
              <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2">
                  <AlertCircle className="text-emerald-600" size={20} />
                  Par Priorité (Actives)
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {priorities.map(p => (
                    <div key={p} className={`p-4 sm:p-6 rounded-xl border-2 ${getPriorityColor(p)} hover:shadow-lg transition`}>
                      <div className="text-center">
                        <p className="text-3xl sm:text-4xl font-bold mb-2">{kpis.parPriorite[p]}</p>
                        <p className="text-xs sm:text-sm font-semibold uppercase tracking-wide">{p}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Team Workload */}
            {Object.keys(kpis.parAssignee).length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2">
                  <TrendingUp className="text-emerald-600" size={20} />
                  Charge de Travail par Membre
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {Object.entries(kpis.parAssignee).map(([name, count]) => (
                    <div key={name} className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-200 hover:shadow-lg transition">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-800 text-sm sm:text-base">{name}</p>
                          <p className="text-xs sm:text-sm text-gray-600">Requêtes actives</p>
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold text-emerald-600">{count}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Liste Tab */}
        {activeTab === 'liste' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select
                    className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base"
                    value={filterStatut}
                    onChange={(e) => setFilterStatut(e.target.value)}
                  >
                    <option value="Tous">Tous les statuts</option>
                    {statuts.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select
                    className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base"
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                  >
                    <option value="Tous">Toutes les priorités</option>
                    {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className="flex-1 px-3 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                      value={dateDebut}
                      onChange={(e) => setDateDebut(e.target.value)}
                      placeholder="Date début"
                    />
                    <input
                      type="date"
                      className="flex-1 px-3 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                      value={dateFin}
                      onChange={(e) => setDateFin(e.target.value)}
                      placeholder="Date fin"
                    />
                  </div>
                </div>
                {(dateDebut || dateFin) && (
                  <button
                    onClick={() => {
                      setDateDebut('');
                      setDateFin('');
                    }}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold"
                  >
                    Réinitialiser les dates
                  </button>
                )}
              </div>
            </div>

            {/* Requests Cards */}
            <div className="grid grid-cols-1 gap-4">
              {filteredRequests.map(req => {
                const statutBadge = getStatutBadge(req);
                return (
                  <div key={req.id} className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all border-l-4 border-emerald-500 overflow-hidden">
                    <div className="p-4 sm:p-6">
                      <div className="flex items-start justify-between mb-4 gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="text-xs sm:text-sm font-bold text-gray-500">#{req.id}</span>
                            <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-bold ${statutBadge.color}`}>
                              {statutBadge.label}
                            </span>
                            <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-bold border-2 ${getPriorityColor(req.priority)}`}>
                              {req.priority}
                            </span>
                            {req.frequenceRappel && (
                              <span className="px-2 sm:px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 flex items-center gap-1">
                                <Bell size={12} />
                                {req.frequenceRappel}
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 break-words">{req.title}</h3>
                          <p className="text-sm sm:text-base text-gray-600 mb-2 break-words">{req.description}</p>
                          <p className="text-xs sm:text-sm text-gray-500">
                            <span className="font-semibold">Demandeur:</span> {req.demandeur}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteRequest(req.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition flex-shrink-0"
                        >
                          <X size={20} />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 pt-4 border-t">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">Date Réception</p>
                          <p className="text-sm font-bold text-gray-800">{req.dateReception}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">Assigné à</p>
                          <input
                            type="text"
                            className="text-sm font-bold text-gray-800 w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            value={req.assignee}
                            onChange={(e) => updateRequest(req.id, 'assignee', e.target.value)}
                            placeholder="Non assigné"
                          />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">Deadline</p>
                          <div className="flex items-center gap-1">
                            <CalendarX size={14} className={isEnRetard(req) ? 'text-red-500' : 'text-gray-500'} />
                            <input
                              type="date"
                              className="text-sm font-bold text-gray-800 flex-1 px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              value={req.deadline || ''}
                              onChange={(e) => updateRequest(req.id, 'deadline', e.target.value || null)}
                            />
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">Date Clôture</p>
                          <input
                            type="date"
                            className="text-sm font-bold text-gray-800 w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            value={req.dateCloture || ''}
                            onChange={(e) => updateRequest(req.id, 'dateCloture', e.target.value || null)}
                            placeholder="Non clôturé"
                          />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">Statut</p>
                          <select
                            className="text-sm font-bold text-gray-800 w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            value={req.statut}
                            onChange={(e) => updateRequest(req.id, 'statut', e.target.value)}
                          >
                            {statuts.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 pt-4 border-t">
                        <button
                          onClick={() => {
                            setSelectedRequest(req);
                            setShowFollowUpModal(true);
                          }}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition font-semibold text-sm shadow-lg flex-1"
                        >
                          <MessageSquare size={16} />
                          Follow-ups ({req.followUps.length})
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredRequests.length === 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-8 sm:p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <Search size={64} className="mx-auto" />
                </div>
                <h3 className="text-xl font-bold text-gray-600 mb-2">Aucune requête trouvée</h3>
                <p className="text-gray-500">Essayez de modifier vos filtres de recherche</p>
              </div>
            )}

            <div className="text-center text-xs sm:text-sm text-gray-600 bg-white rounded-xl shadow p-3 sm:p-4">
              Affichage de <span className="font-bold text-emerald-600">{filteredRequests.length}</span> sur <span className="font-bold">{requests.length}</span> requêtes
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BacklogSystem;
