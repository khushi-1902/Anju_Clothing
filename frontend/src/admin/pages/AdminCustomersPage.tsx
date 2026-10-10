import React, { useState, useEffect } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { fetchAdminUsers, updateUserRole, AdminUser } from '../adminApi'

export function AdminCustomersPage() {
  const { getToken } = useAuth()
  const { user: currentClerkUser } = useUser()

  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  // Role action confirmation modal
  const [targetUser, setTargetUser] = useState<AdminUser | null>(null)
  const [newRole, setNewRole] = useState<'ADMIN' | 'CUSTOMER'>('ADMIN')
  const [updating, setUpdating] = useState(false)

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  const loadUsers = async () => {
    try {
      setLoading(true)
      const token = await getToken()
      if (!token) return
      const data = await fetchAdminUsers(token, search, roleFilter)
      setUsers(data)
    } catch (err: any) {
      console.error('Failed to load users:', err)
      showToast(err.message || 'Failed to load users', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [roleFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadUsers()
  }

  const handleOpenRoleModal = (user: AdminUser, roleToSet: 'ADMIN' | 'CUSTOMER') => {
    setTargetUser(user)
    setNewRole(roleToSet)
  }

  const handleConfirmRoleChange = async () => {
    if (!targetUser) return

    try {
      setUpdating(true)
      const token = await getToken()
      const updated = await updateUserRole(token || '', targetUser.id || targetUser.clerkUserId, newRole)

      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id || u.clerkUserId === targetUser.clerkUserId ? { ...u, role: updated.role } : u))
      )

      showToast(
        newRole === 'ADMIN'
          ? `👑 Promoted ${targetUser.email} to Administrator!`
          : `Demoted ${targetUser.email} to Customer.`
      )
      setTargetUser(null)
    } catch (err: any) {
      console.error('Failed to update role:', err)
      showToast(err.message || 'Failed to update user role', 'error')
    } finally {
      setUpdating(false)
    }
  }

  const currentEmail = currentClerkUser?.primaryEmailAddress?.emailAddress?.toLowerCase()

  const adminCount = users.filter((u) => u.role === 'ADMIN').length
  const customerCount = users.filter((u) => u.role === 'CUSTOMER').length

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-8 sm:pb-12 font-sans text-[#232B1E]">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-4 sm:bottom-6 right-4 sm:right-6 left-4 sm:left-auto z-50 p-3.5 sm:p-4 rounded-xl shadow-2xl border flex items-center gap-3 text-xs font-semibold animate-in slide-in-from-bottom-3 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-[#233019] text-white border-[#344426]'
              : 'bg-rose-900 text-white border-rose-700'
          }`}
        >
          <span>{toastMessage.type === 'success' ? '✓' : '⚠️'}</span>
          <span className="flex-1 truncate">{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-bold text-[#1B2513] tracking-tight">
              Customers & Store Users
            </h1>
            <span className="px-2 py-0.5 bg-[#F0F5EB] border border-[#D5DFC9] rounded-md text-xs font-mono font-semibold text-[#4A6333]">
              {users.length} registered
            </span>
          </div>
          <p className="text-xs text-[#5D6F4E] mt-0.5">
            Manage user accounts, view join dates, and configure admin privileges.
          </p>
        </div>
      </div>

      {/* Metric Cards (1 column on mobile, 3 on tablets/desktops) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#E3E9DD] shadow-2xs">
          <span className="text-[11px] font-medium text-[#5D6F4E] uppercase tracking-wider">Total Accounts</span>
          <p className="text-xl sm:text-2xl font-bold text-[#202E15] mt-1 tabular-nums">{users.length}</p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#E3E9DD] shadow-2xs">
          <span className="text-[11px] font-medium text-[#5D6F4E] uppercase tracking-wider">👑 Administrators</span>
          <p className="text-xl sm:text-2xl font-bold text-amber-900 mt-1 tabular-nums">{adminCount}</p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#E3E9DD] shadow-2xs">
          <span className="text-[11px] font-medium text-[#5D6F4E] uppercase tracking-wider">🛍️ Active Customers</span>
          <p className="text-xl sm:text-2xl font-bold text-[#4A6333] mt-1 tabular-nums">{customerCount}</p>
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="bg-white p-3 rounded-xl border border-[#E3E9DD] shadow-2xs flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <svg className="w-4 h-4 text-[#7A8E6A] absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search by customer name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#F7F9F5] border border-[#D5DFC9] rounded-lg focus:outline-none focus:border-[#769055] focus:bg-white transition-all text-[#232B1E]"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 bg-[#769055] hover:bg-[#5e7343] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setRoleFilter('all')
              }}
              className="px-2.5 py-2 text-xs text-[#7A8E6A] hover:text-[#232B1E] transition-colors cursor-pointer shrink-0"
            >
              Reset
            </button>
          )}
        </form>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#5D6F4E] font-medium hidden sm:inline shrink-0">Filter Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs bg-[#F7F9F5] border border-[#D5DFC9] rounded-lg focus:outline-none focus:border-[#769055] font-semibold text-[#232B1E]"
          >
            <option value="all">All Roles</option>
            <option value="ADMIN">👑 Administrators</option>
            <option value="CUSTOMER">🛍️ Customers</option>
          </select>
        </div>
      </div>

      {/* Users Section */}
      <div className="bg-white rounded-xl border border-[#E3E9DD] shadow-2xs overflow-hidden">
        
        {/* Mobile View: Customer Cards */}
        <div className="block sm:hidden divide-y divide-[#EBEFE6]">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-3.5 space-y-2 animate-pulse">
                <div className="h-4 w-32 bg-[#F0F5EB] rounded" />
                <div className="h-3 w-48 bg-[#F0F5EB] rounded" />
              </div>
            ))
          ) : users.length > 0 ? (
            users.map((u) => {
              const isCurrentUser = currentEmail && u.email?.toLowerCase() === currentEmail
              const isAdmin = u.role === 'ADMIN'

              return (
                <div key={u.id || u.clerkUserId} className="p-3.5 space-y-2.5 hover:bg-[#F9FAF7] transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#F0F5EB] border border-[#D5DFC9] text-[#4A6333] font-bold text-xs flex items-center justify-center shrink-0">
                        {(u.name?.[0] || u.email?.[0] || 'U').toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-[#1B2513] truncate">
                          {u.name || 'Anonymous User'}
                          {isCurrentUser && <span className="ml-1 text-[10px] text-[#769055]">(You)</span>}
                        </p>
                        <p className="text-[11px] text-[#7A8E6A] font-mono truncate">{u.email}</p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        isAdmin
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-[#F0F5EB] text-[#4A6333] border border-[#D5DFC9]'
                      }`}
                    >
                      {isAdmin ? '👑 ADMIN' : 'CUSTOMER'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#5D6F4E] pt-1 border-t border-[#EBEFE6]">
                    <span>Joined: {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    
                    {!isCurrentUser && (
                      <button
                        onClick={() => handleOpenRoleModal(u, isAdmin ? 'CUSTOMER' : 'ADMIN')}
                        className={`text-xs font-bold underline cursor-pointer ${
                          isAdmin ? 'text-rose-700 hover:text-rose-900' : 'text-[#769055] hover:text-[#5e7343]'
                        }`}
                      >
                        {isAdmin ? 'Demote' : 'Promote to Admin'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="py-12 text-center text-[#7A8E6A] text-xs p-4">
              <p className="font-semibold text-[#202E15]">No customer accounts found</p>
            </div>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F7F9F5] border-b border-[#EBEFE6] text-[11px] font-semibold text-[#5D6F4E] uppercase tracking-wider">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Joined</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBEFE6]">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3.5 px-4"><div className="h-4 w-32 bg-[#F0F5EB] rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-44 bg-[#F0F5EB] rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-16 bg-[#F0F5EB] rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-24 bg-[#F0F5EB] rounded" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-4 w-20 bg-[#F0F5EB] rounded ml-auto" /></td>
                  </tr>
                ))
              ) : users.length > 0 ? (
                users.map((u) => {
                  const isCurrentUser = currentEmail && u.email?.toLowerCase() === currentEmail
                  const isAdmin = u.role === 'ADMIN'

                  return (
                    <tr key={u.id || u.clerkUserId} className="hover:bg-[#F9FAF7] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#F0F5EB] border border-[#D5DFC9] text-[#4A6333] font-bold text-xs flex items-center justify-center shrink-0">
                            {(u.name?.[0] || u.email?.[0] || 'U').toUpperCase()}
                          </div>
                          <span className="font-semibold text-[#1B2513]">
                            {u.name || 'Anonymous User'}
                            {isCurrentUser && (
                              <span className="ml-1.5 text-[10px] text-[#769055] font-normal">(You)</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#5D6F4E]">
                        {u.email}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                            isAdmin
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-[#F0F5EB] text-[#4A6333] border border-[#D5DFC9]'
                          }`}
                        >
                          {isAdmin ? '👑 ADMIN' : 'CUSTOMER'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#5D6F4E] text-[11px] whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isCurrentUser ? (
                          <span className="text-[11px] text-[#7A8E6A] italic">Current Session</span>
                        ) : (
                          <button
                            onClick={() => handleOpenRoleModal(u, isAdmin ? 'CUSTOMER' : 'ADMIN')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                              isAdmin
                                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                                : 'bg-[#F0F5EB] hover:bg-[#E3EBD9] text-[#3E522B]'
                            }`}
                          >
                            {isAdmin ? 'Demote to Customer' : 'Promote to Admin'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#7A8E6A] text-xs">
                    <p className="font-semibold text-[#202E15]">No customer accounts found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Action Confirmation Modal */}
      {targetUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-sm w-full space-y-4 shadow-2xl border border-[#E3E9DD]">
            <div className="w-10 h-10 rounded-full bg-[#F0F5EB] text-[#4A6333] flex items-center justify-center mx-auto text-lg">
              {newRole === 'ADMIN' ? '👑' : '👤'}
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-sm text-[#1B2513]">
                {newRole === 'ADMIN' ? 'Promote to Administrator' : 'Demote to Customer'}
              </h3>
              <p className="text-xs text-[#5D6F4E]">
                Are you sure you want to change the role for <strong className="text-[#1B2513]">{targetUser.email}</strong> to <strong className="text-[#1B2513]">{newRole}</strong>?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTargetUser(null)}
                disabled={updating}
                className="flex-1 py-2 text-xs font-semibold bg-[#F0F5EB] hover:bg-[#E3EBD9] text-[#202E15] rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRoleChange}
                disabled={updating}
                className={`flex-1 py-2 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50 ${
                  newRole === 'ADMIN' ? 'bg-[#769055] hover:bg-[#5e7343]' : 'bg-rose-700 hover:bg-rose-800'
                }`}
              >
                {updating ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
