import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Users, Calendar, Archive, CheckCircle } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { useTrips } from '../hooks/useTrips';
import { useAuth } from '../context/AuthContext';
import type { Trip } from '../types';
import { getTripIcon } from '../utils/tripIcons';

const TripsPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { trips, loading, addTrip } = useTrips();
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'completed' | 'archived'>('current');

  const filteredTrips = useMemo(() => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const isOld = (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d < oneYearAgo;
    };

    if (activeTab === 'current') {
      return trips.filter(t => !t.ended && !t.archived && !isOld(t.createdAt));
    } else if (activeTab === 'completed') {
      return trips.filter(t => t.ended && !t.archived && !isOld(t.createdAt));
    } else {
      // Archived: Explicitly archived OR Older than 1 year
      return trips.filter(t => t.archived || isOld(t.createdAt));
    }
  }, [trips, activeTab]);

  const tripCounts = useMemo(() => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const isOld = (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d < oneYearAgo;
    };

    return {
      current: trips.filter(t => !t.ended && !t.archived && !isOld(t.createdAt)).length,
      completed: trips.filter(t => t.ended && !t.archived && !isOld(t.createdAt)).length,
      archived: trips.filter(t => t.archived || isOld(t.createdAt)).length,
    };
  }, [trips]);

  const handleCreateTrip = async (name: string, participantNames: string[]) => {
    if (!currentUser) return;

    const participants = participantNames.map((pName, index) => ({
      id: `participant_${Date.now()}_${index}`,
      name: pName.trim(),
      isCurrentUser: index === 0
    }));

    const trip: Trip = {
      id: `trip_${Date.now()}`,
      userId: currentUser.uid,
      name,
      icon: name,
      participants,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await addTrip(trip);
    setShowAddTrip(false);
  };

  return (
    <>
      <PageTransition>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-8">
          {/* Header */}
          <div className="bg-gradient-to-br from-blue-500 to-teal-500 text-white sticky top-0 z-40 select-none">
            <div className="max-w-md mx-auto px-4 py-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-white/10">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-bold">Plans</h1>
                    <p className="text-sm text-white/80">Manage Group Expenses</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddTrip(true)}
                  className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex bg-white/10 backdrop-blur-sm rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('current')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors relative ${activeTab === 'current' ? 'bg-white text-blue-600' : 'text-white/70'
                    }`}
                >
                  Current
                  {tripCounts.current > 0 && (
                    <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${activeTab === 'current' ? 'bg-blue-100 text-blue-600' : 'bg-white/20 text-white'
                      }`}>
                      {tripCounts.current}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('completed')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors relative ${activeTab === 'completed' ? 'bg-white text-blue-600' : 'text-white/70'
                    }`}
                >
                  Completed
                  {tripCounts.completed > 0 && (
                    <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${activeTab === 'completed' ? 'bg-blue-100 text-blue-600' : 'bg-white/20 text-white'
                      }`}>
                      {tripCounts.completed}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('archived')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors relative ${activeTab === 'archived' ? 'bg-white text-blue-600' : 'text-white/70'
                    }`}
                >
                  Archived
                  {tripCounts.archived > 0 && (
                    <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${activeTab === 'archived' ? 'bg-blue-100 text-blue-600' : 'bg-white/20 text-white'
                      }`}>
                      {tripCounts.archived}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Trips List */}
          <div className="max-w-md mx-auto px-4 py-6">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredTrips.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  {activeTab === 'current' && <Users className="w-10 h-10 text-blue-500" />}
                  {activeTab === 'completed' && <CheckCircle className="w-10 h-10 text-green-500" />}
                  {activeTab === 'archived' && <Archive className="w-10 h-10 text-gray-500" />}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {activeTab === 'current' && 'No Active Plans'}
                  {activeTab === 'completed' && 'No Completed Plans'}
                  {activeTab === 'archived' && 'No Archived Plans'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  {activeTab === 'current' && 'Create a plan to start tracking group expenses'}
                  {activeTab === 'completed' && 'Completed plans will appear here'}
                  {activeTab === 'archived' && 'Archived plans will appear here'}
                </p>
                {activeTab === 'current' && (
                  <button
                    onClick={() => setShowAddTrip(true)}
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Create Plan
                  </button>
                )}
              </motion.div>
            ) : (
              <div className="space-y-3">
                {filteredTrips.map((trip, index) => {
                  const { icon: IconComponent, color } = getTripIcon(trip.icon || trip.name);
                  return (
                    <motion.div
                      key={trip.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => navigate(`/trips/${trip.id}`)}
                      className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-12 h-12 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                            <IconComponent className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">{trip.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" />
                              {trip.participants.length} participants
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex flex-col items-end gap-1">
                            {trip.ended && !trip.archived && (
                              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                                Completed
                              </span>
                            )}
                            {trip.archived && (
                              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-full">
                                Archived
                              </span>
                            )}
                            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(trip.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add Trip Modal */}
          {showAddTrip && (
            <AddTripModal
              onClose={() => setShowAddTrip(false)}
              onCreate={handleCreateTrip}
            />
          )}
        </div>
      </PageTransition>
    </>
  );
};

// Add Trip Modal Component
interface AddTripModalProps {
  onClose: () => void;
  onCreate: (name: string, participants: string[]) => void;
}

const AddTripModal = ({ onClose, onCreate }: AddTripModalProps) => {
  const [tripName, setTripName] = useState('');
  const [participantInput, setParticipantInput] = useState('');
  const [participants, setParticipants] = useState<string[]>(['Me']);
  const [isCreating, setIsCreating] = useState(false);

  const handleAddParticipant = () => {
    if (participantInput.trim() && !participants.includes(participantInput.trim())) {
      setParticipants([...participants, participantInput.trim()]);
      setParticipantInput('');
    }
  };

  const handleRemoveParticipant = (index: number) => {
    if (index === 0) return; // Can't remove "Me"
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (tripName.trim() && participants.length > 0 && !isCreating) {
      setIsCreating(true);
      try {
        await onCreate(tripName.trim(), participants);
      } finally {
        setIsCreating(false);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create New Plan</h2>

          {/* Trip Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Plan Name
            </label>
            <input
              type="text"
              value={tripName}
              onChange={e => setTripName(e.target.value)}
              placeholder="e.g., Goa Beach Trip, Mountain Hiking, City Tour"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              The icon will be automatically assigned based on your plan name
            </p>
          </div>

          {/* Participants */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Participants
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={participantInput}
                onChange={e => setParticipantInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleAddParticipant()}
                placeholder="Add participant name"
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                onClick={handleAddParticipant}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {participants.map((p, i) => (
                <div
                  key={i}
                  className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm flex items-center gap-2"
                >
                  {p}
                  {i !== 0 && (
                    <button onClick={() => handleRemoveParticipant(i)} className="hover:text-blue-900">
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!tripName.trim() || participants.length === 0}
              className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Plan
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TripsPage;
