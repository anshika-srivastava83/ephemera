'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  Shield,
  Layers,
  Crown,
  Trash2,
  Check,
  ChevronDown,
  Loader2,
  Mail,
  Clock,
  Sparkles,
  Info,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '../ui/Toast';
import { ConfirmDialog } from '../ui/ConfirmDialog';

export function TeamManager({ eventId, eventName, compact = false, onMemberCountChange }) {
  const toast = useToast();

  const [members, setMembers] = useState([]);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('collaborator'); // 'collaborator' | 'host'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'host' | 'collaborator'

  // Confirm delete dialog state
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Role updating state
  const [updatingMemberId, setUpdatingMemberId] = useState(null);

  const isHost = currentUserRole === 'owner';

  const loadTeam = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError('');

    try {
      const res = await fetch(`/api/events/${eventId}/collaborators`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load event team.');

      const list = data.members || [];
      setMembers(list);
      setCurrentUserRole(data.role || null);
      setCurrentUserEmail(data.currentUserEmail || '');
      if (onMemberCountChange) {
        onMemberCountChange(list.length);
      }
    } catch (err) {
      setError(err.message || 'Failed to connect to team registry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId, onMemberCountChange]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  async function handleAddMember(e) {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/events/${eventId}/collaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, role: selectedRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign team member.');

      toast.success(
        selectedRole === 'host'
          ? `${cleanEmail} assigned as co-host with full access.`
          : `${cleanEmail} assigned as collaborator.`
      );
      setEmail('');
      loadTeam(true);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRoleChange(memberId, newRole) {
    setUpdatingMemberId(memberId);
    try {
      const res = await fetch(`/api/events/${eventId}/collaborators`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not update role.');

      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
      toast.success(`Role updated to ${newRole === 'host' ? 'Host' : 'Collaborator'}.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdatingMemberId(null);
    }
  }

  async function confirmRemoveMember() {
    if (!memberToRemove) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/events/${eventId}/collaborators?memberId=${memberToRemove.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not remove member.');

      setMembers((prev) => prev.filter((m) => m.id !== memberToRemove.id));
      toast.info(`Removed ${memberToRemove.email} from the event team.`);
      setMemberToRemove(null);
      if (onMemberCountChange) {
        onMemberCountChange(members.length - 1);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
    }
  }

  const hostsCount = members.filter((m) => m.role === 'host').length;
  const collaboratorsCount = members.filter((m) => m.role === 'collaborator').length;

  const filteredMembers = members.filter((m) => {
    if (filter === 'host') return m.role === 'host';
    if (filter === 'collaborator') return m.role === 'collaborator';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Role explanation alert */}
      <div className="p-4 rounded-xl bg-ivory border border-ink/10 flex items-start gap-3 text-xs text-ink-muted">
        <Info className="w-4 h-4 text-sepia shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium text-ink">Role Responsibilities</p>
          <p>
            <strong className="text-sepia font-semibold">Hosts</strong> have full event control: settings, closing submissions, live wall styles, caption editing, final tapestry artwork, and team roster.
          </p>
          <p>
            <strong className="text-emerald-800 font-semibold">Collaborators</strong> have swipe moderation access: approve or pass guest submissions in the deck. Cannot modify settings or delete photos.
          </p>
        </div>
      </div>

      {/* Team stats counter */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-paper-light border border-ink/10 text-center">
          <span className="text-xs uppercase tracking-wider text-ink-muted block font-medium">Total Team</span>
          <span className="font-editorial text-3xl text-ink font-normal">{members.length}</span>
        </div>
        <div className="p-4 rounded-xl bg-paper-light border border-sepia/20 text-center">
          <span className="text-xs uppercase tracking-wider text-sepia block font-medium">Co-Hosts</span>
          <span className="font-editorial text-3xl text-sepia font-normal">{hostsCount}</span>
        </div>
        <div className="p-4 rounded-xl bg-paper-light border border-emerald-200 text-center">
          <span className="text-xs uppercase tracking-wider text-emerald-800 block font-medium">Collaborators</span>
          <span className="font-editorial text-3xl text-emerald-900 font-normal">{collaboratorsCount}</span>
        </div>
      </div>

      {/* Add Member Form (Visible to Hosts) */}
      {isHost ? (
        <form onSubmit={handleAddMember} className="p-5 rounded-2xl bg-ivory border border-sepia/30 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-editorial text-xl text-ink font-normal flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-sepia" />
              <span>Assign New Member</span>
            </h4>
            <span className="text-[11px] text-ink-muted font-light">Invited via email</span>
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor="member-email" className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="member-email"
                  type="email"
                  required
                  placeholder="co-host@domain.com or collaborator@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-paper-light border border-ink/15 text-ink placeholder:text-ink-faint focus:outline-none focus:border-sepia transition-all"
                />
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-2">
                Select Role & Privileges
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRole('collaborator')}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                    selectedRole === 'collaborator'
                      ? 'border-emerald-600 bg-emerald-50/70 shadow-sm'
                      : 'border-ink/10 bg-paper-light hover:border-ink/20'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${
                    selectedRole === 'collaborator' ? 'bg-emerald-600 text-white' : 'bg-ink/5 text-ink-muted'
                  }`}>
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-ink">Collaborator</span>
                      {selectedRole === 'collaborator' && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                    </div>
                    <p className="text-xs text-ink-muted mt-0.5 font-light leading-snug">
                      Swipe moderation deck, review photographs, and assist curating the wall.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('host')}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                    selectedRole === 'host'
                      ? 'border-sepia bg-sepia/10 shadow-sm'
                      : 'border-ink/10 bg-paper-light hover:border-ink/20'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${
                    selectedRole === 'host' ? 'bg-sepia text-white' : 'bg-ink/5 text-ink-muted'
                  }`}>
                    <Crown className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-ink">Co-Host</span>
                      {selectedRole === 'host' && <Check className="w-3.5 h-3.5 text-sepia-dark" />}
                    </div>
                    <p className="text-xs text-ink-muted mt-0.5 font-light leading-snug">
                      Full owner access. Change wall styles, QR cards, finalize artwork, and manage team.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !email.trim()}
              className="btn-editorial btn-editorial-primary text-xs px-4 py-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Assigning…</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Assign as {selectedRole === 'host' ? 'Co-Host' : 'Collaborator'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="p-4 rounded-xl bg-ivory border border-ink/10 text-xs text-ink-muted text-center font-light">
          You are signed in as a Collaborator. Only event hosts can add or modify team members.
        </div>
      )}

      {/* Roster Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              filter === 'all'
                ? 'bg-ink text-paper'
                : 'bg-paper-light text-ink-muted hover:text-ink border border-ink/10'
            }`}
          >
            All Members ({members.length})
          </button>
          <button
            onClick={() => setFilter('host')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              filter === 'host'
                ? 'bg-sepia text-white'
                : 'bg-paper-light text-ink-muted hover:text-ink border border-ink/10'
            }`}
          >
            Hosts ({hostsCount})
          </button>
          <button
            onClick={() => setFilter('collaborator')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              filter === 'collaborator'
                ? 'bg-emerald-700 text-white'
                : 'bg-paper-light text-ink-muted hover:text-ink border border-ink/10'
            }`}
          >
            Collaborators ({collaboratorsCount})
          </button>
        </div>

        <button
          onClick={() => loadTeam(true)}
          disabled={refreshing}
          className="text-xs text-ink-muted hover:text-ink flex items-center gap-1.5 self-end sm:self-auto"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Team Roster List */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="py-12 text-center text-ink-muted" role="status">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-sepia mb-2" />
            <p className="font-editorial text-xl">Loading event team…</p>
          </div>
        ) : error ? (
          <div role="alert" className="p-6 rounded-2xl bg-rose/10 border border-rose-300 text-center">
            <AlertCircle className="w-6 h-6 text-rose-dark mx-auto mb-2" />
            <p className="text-sm text-rose-dark font-medium">{error}</p>
            <button
              onClick={() => loadTeam()}
              className="btn-editorial btn-editorial-secondary text-xs px-3 py-1.5 mt-3"
            >
              Try again
            </button>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border-2 border-dashed border-ink/10 bg-ivory/50">
            <Users className="w-8 h-8 text-ink-faint mx-auto mb-2" />
            <p className="font-editorial text-2xl text-ink font-normal">
              {filter === 'all'
                ? 'No team members assigned yet'
                : `No members assigned with the ${filter} role`}
            </p>
            <p className="text-xs text-ink-muted font-light mt-1 max-w-sm mx-auto">
              Assign co-hosts or moderators above so they can sign in and assist with this celebration.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-ink/5 border border-ink/10 rounded-2xl bg-ivory overflow-hidden shadow-sm">
            {filteredMembers.map((member) => {
              const isMe = member.email.toLowerCase() === currentUserEmail.toLowerCase();
              const isUpdating = updatingMemberId === member.id;

              return (
                <div
                  key={member.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-paper-light/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold uppercase shrink-0 ${
                        member.role === 'host'
                          ? 'bg-sepia/15 text-sepia border border-sepia/30'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {member.email.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-ink truncate font-mono">
                          {member.email}
                        </span>
                        {isMe && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-ink/10 text-ink font-medium">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-ink-muted font-light mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-ink-faint" />
                          <span>Added {new Date(member.added_at).toLocaleDateString()}</span>
                        </span>
                        {member.added_by && (
                          <span>• by {member.added_by}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    {/* Role badge / switcher */}
                    {isHost ? (
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 border ${
                            member.role === 'host'
                              ? 'bg-sepia/10 text-sepia border-sepia/30'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {member.role === 'host' ? (
                            <>
                              <Crown className="w-3 h-3 text-sepia" />
                              <span>Host</span>
                            </>
                          ) : (
                            <>
                              <Layers className="w-3 h-3 text-emerald-700" />
                              <span>Collaborator</span>
                            </>
                          )}
                        </span>

                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() =>
                            handleRoleChange(
                              member.id,
                              member.role === 'host' ? 'collaborator' : 'host'
                            )
                          }
                          title={
                            member.role === 'host'
                              ? 'Demote to Collaborator'
                              : 'Promote to Co-Host'
                          }
                          className="btn-editorial btn-editorial-secondary text-[11px] px-2.5 py-1 font-normal disabled:opacity-50"
                        >
                          {isUpdating ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : member.role === 'host' ? (
                            'Make Collaborator'
                          ) : (
                            'Promote to Host'
                          )}
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 border ${
                          member.role === 'host'
                            ? 'bg-sepia/10 text-sepia border-sepia/30'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {member.role === 'host' ? 'Host' : 'Collaborator'}
                      </span>
                    )}

                    {/* Delete action */}
                    {isHost && (
                      <button
                        type="button"
                        onClick={() => setMemberToRemove(member)}
                        className="p-1.5 text-ink-faint hover:text-rose-dark hover:bg-rose/10 rounded-lg transition-colors"
                        title="Remove member"
                        aria-label={`Remove ${member.email}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Dialog for Removal */}
      <ConfirmDialog
        open={Boolean(memberToRemove)}
        title="Remove Team Member"
        description={
          memberToRemove
            ? `Are you sure you want to remove ${memberToRemove.email} from ${eventName || 'this event'}? They will immediately lose ${
                memberToRemove.role === 'host' ? 'host' : 'collaborator'
              } privileges.`
            : ''
        }
        confirmLabel={isDeleting ? 'Removing…' : 'Remove Member'}
        confirmVariant="danger"
        onConfirm={confirmRemoveMember}
        onCancel={() => setMemberToRemove(null)}
      />
    </div>
  );
}
