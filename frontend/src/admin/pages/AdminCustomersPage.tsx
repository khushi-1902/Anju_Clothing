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
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-charcoal">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl border flex items-center gap-3 text-xs font-bold animate-in slide-in-from-bottom-3 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : 'bg-red-900 text-white border-red-700'
          }`}
        >
          <span>{toastMessage.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#202223] tracking-tight">
              Customers & Store Users
            </h1>
            <span className="px-2.5 py-0.5 bg-[#FAF8F5] border border-[#EBE4D8] rounded-full text-xs font-bold text-[#769055]">
              {users.length} registered
            </span>
          </div>
          <p className="text-xs text-[#6D7175] mt-0.5">
            Registered accounts from PostgreSQL database, join dates, order frequency, and role management.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E1E3E5] shadow-xs">
          <span className="text-[11px] font-bold text-[#6D7175] uppercase tracking-wider">Total Registered Accounts</span>
          <p className="text-2xl font-bold text-[#202223] mt-1">{users.length}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E1E3E5] shadow-xs">
          <span className="text-[11px] font-bold text-[#6D7175] uppercase tracking-wider">👑 Store Administrators</span>
          <p className="text-2xl font-bold text-amber-900 mt-1">{adminCount}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E1E3E5] shadow-xs">
          <span className="text-[11px] font-bold text-[#6D7175] uppercase tracking-wider">🛍️ Active Customers</span>
          <p className="text-2xl font-bold text-[#769055] mt-1">{customerCount}</p>
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="bg-white p-4 rounded-xl border border-[#E1E3E5] shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="w-full sm:max-w-md flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-2.5 text-gray-400 text-xs">🔍</span>
            <input
              type="text"
              placeholder="Search by customer name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs bg-[#FAF8F5] border border-gray-300 rounded-lg focus:outline-none focus:border-[#769055] focus:bg-white transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-[#202223] text-white text-xs font-bold rounded-lg hover:bg-black transition-colors cursor-pointer"
          >
            Filter
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setRoleFilter('all')
              }}
              className="px-3 py-2 text-xs text-gray-500 hover:text-gray-800 font-semibold cursor-pointer"
            >
              Reset
            </button>
          )}
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-gray-500 font-semibold hidden sm:inline">Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs bg-[#FAF8F5] border border-gray-300 rounded-lg focus:outline-none focus:border-[#769055] font-medium text-charcoal"
          >
            <option value="all">All Roles</option>
            <option value="ADMIN">👑 Administrators</option>
            <option value="CUSTOMER">Customers</option>
          </select>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-white rounded-xl border border-[#E1E3E5] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#EBE4D8] text-[11px] font-bold text-[#6D7175] uppercase tracking-wider">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Joined Date</th>
                <th className="py-3 px-4 text-center">Orders Placed</th>
                <th className="py-3 px-4 text-right">Lifetime Spend</th>
                <th className="py-3 px-4 text-right">Role Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3.5 px-4"><div className="h-4 w-36 bg-gray-200 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-16 bg-gray-200 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-20 bg-gray-200 rounded" /></td>
                    <td className="py-3.5 px-4 text-center"><div className="h-4 w-12 bg-gray-200 rounded mx-auto" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-4 w-16 bg-gray-200 rounded ml-auto" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-6 w-24 bg-gray-200 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : users.length > 0 ? (
                users.map((u) => {
                  const isSelf = currentEmail && u.email.toLowerCase() === currentEmail
                  const isAdmin = u.role === 'ADMIN'

                  return (
                    <tr key={u.id || u.clerkUserId} className="hover:bg-[#FAF8F5]/80 transition-colors group">
                      
                      {/* User Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#769055]/15 border border-[#769055] flex items-center justify-center font-bold text-xs text-[#769055] shrink-0">
                            {(u.name?.[0] || u.email[0] || 'U').toUpperCase()}
                          </div>
                          <div className="min-w-0 max-w-xs">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-[#202223] truncate">
                                {u.name || 'Registered User'}
                              </p>
                              {isSelf && (
                                <span className="text-[9px] bg-blue-100 text-blue-900 font-extrabold px-1.5 py-0.2 rounded">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#6D7175] font-mono truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                            isAdmin
                              ? 'bg-amber-100/70 border-amber-300 text-amber-950'
                              : 'bg-gray-100 border-gray-300 text-gray-700'
                          }`}
                        >
                          {isAdmin ? '👑 ADMIN' : 'CUSTOMER'}
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td className="py-3.5 px-4 text-[#6D7175] whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Orders Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-[#202223]">{u.orderCount || 0}</span>
                      </td>

                      {/* Lifetime Spend */}
                      <td className="py-3.5 px-4 text-right font-bold text-[#202223]">
                        {u.totalSpent > 0 ? `₹${u.totalSpent.toLocaleString('en-IN')}` : '—'}
                      </td>

                      {/* Action: Promote to ADMIN or Demote */}
                      <td className="py-3.5 px-4 text-right">
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => handleOpenRoleModal(u, 'CUSTOMER')}
                            className="px-2.5 py-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                          >
                            Demote to Customer
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenRoleModal(u, 'ADMIN')}
                            className="px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1 ml-auto"
                          >
                            <span>👑 Make Admin</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    <p className="text-2xl mb-2">👤</p>
                    <p className="font-bold text-charcoal">No users found</p>
                    <p className="text-xs text-gray-400 mt-1">No user records match your search.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Change Confirmation Modal */}
      {targetUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-amber-100 text-center space-y-4">
            <div className="w-12 h-12 bg-amber-50 border border-amber-200 text-amber-800 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
              👑
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-[#202223]">
                {newRole === 'ADMIN' ? 'Promote to Administrator?' : 'Demote to Customer?'}
              </h3>
              <p className="text-xs text-[#6D7175] leading-relaxed">
                {newRole === 'ADMIN' ? (
                  <>
                    Are you sure you want to promote <strong className="text-charcoal font-bold">{targetUser.email}</strong> to <strong className="text-amber-900">ADMIN</strong>? They will have full access to manage products, orders, and customer accounts.
                  </>
                ) : (
                  <>
                    Are you sure you want to revoke admin privileges for <strong className="text-charcoal font-bold">{targetUser.email}</strong>? They will be demoted to standard CUSTOMER role.
                  </>
                )}
              </p>
            </div>

            <div className="pt-2 flex gap-2.5">
              <button
                type="button"
                onClick={() => setTargetUser(null)}
                disabled={updating}
                className="flex-1 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-charcoal text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRoleChange}
                disabled={updating}
                className={`flex-1 py-2.5 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer shadow-sm ${
                  newRole === 'ADMIN'
                    ? 'bg-amber-600 hover:bg-amber-700 disabled:opacity-50'
                    : 'bg-[#202223] hover:bg-black disabled:opacity-50'
                }`}
              >
                {updating ? 'Updating...' : newRole === 'ADMIN' ? 'Yes, Make Admin' : 'Yes, Demote'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
