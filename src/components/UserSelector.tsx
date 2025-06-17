import React, { useState } from 'react';
import { User, Users, Plus, Eye, EyeOff, Palette } from 'lucide-react';
import { useShopStore } from '../store/useShopStore';
import { ViewMode } from '../types';

const UserSelector: React.FC = () => {
  const { 
    users, 
    currentUser, 
    viewMode,
    setCurrentUser, 
    setViewMode,
    addUser,
    deleteUser
  } = useShopStore();
  
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');

  const userColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'
  ];

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    
    const availableColor = userColors.find(color => 
      !users.some(user => user.color === color)
    ) || userColors[0];
    
    addUser({
      name: newUserName.trim(),
      email: `${newUserName.toLowerCase().replace(/\s+/g, '.')}@company.com`,
      color: availableColor
    });
    
    setNewUserName('');
    setShowAddUser(false);
  };

  const handleDeleteUser = (userId: string) => {
    if (users.length <= 1) {
      alert('Cannot delete the last user. At least one user must remain.');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this user? This will also delete all their tasks.')) {
      deleteUser(userId);
    }
  };

  return (
    <div className="flex items-center space-x-4">
      {/* View Mode Toggle */}
      <div className="flex items-center bg-neutral-100 rounded-lg p-1">
        <button
          onClick={() => setViewMode(ViewMode.MY_VIEW)}
          className={`px-3 py-1.5 rounded-md text-sm flex items-center transition-colors ${
            viewMode === ViewMode.MY_VIEW
              ? 'bg-white text-neutral-800 shadow-sm'
              : 'text-neutral-600 hover:text-neutral-800'
          }`}
        >
          <Eye className="h-4 w-4 mr-1" />
          My View
        </button>
        <button
          onClick={() => setViewMode(ViewMode.ALL_DATA)}
          className={`px-3 py-1.5 rounded-md text-sm flex items-center transition-colors ${
            viewMode === ViewMode.ALL_DATA
              ? 'bg-white text-neutral-800 shadow-sm'
              : 'text-neutral-600 hover:text-neutral-800'
          }`}
        >
          <EyeOff className="h-4 w-4 mr-1" />
          All Data
        </button>
      </div>

      {/* User Selector */}
      <div className="flex items-center space-x-2">
        <div className="relative">
          <select
            value={currentUser?.id || ''}
            onChange={(e) => {
              const user = users.find(u => u.id === e.target.value);
              if (user) setCurrentUser(user);
            }}
            className="appearance-none bg-white border border-neutral-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            style={{ 
              borderLeftColor: currentUser?.color,
              borderLeftWidth: '4px'
            }}
          >
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          <User className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
        </div>

        {/* Add User Button */}
        <button
          onClick={() => setShowAddUser(!showAddUser)}
          disabled={users.length >= 10}
          className="p-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title={users.length >= 10 ? 'Maximum 10 users allowed' : 'Add new user'}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Add User Form */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add New User</h2>
            
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User Name
                </label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Enter user name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Palette className="h-4 w-4 text-neutral-500" />
                <span className="text-sm text-neutral-600">
                  Color will be assigned automatically
                </span>
                <div 
                  className="w-4 h-4 rounded-full border border-neutral-300"
                  style={{ 
                    backgroundColor: userColors.find(color => 
                      !users.some(user => user.color === color)
                    ) || userColors[0]
                  }}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddUser(false);
                    setNewUserName('');
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Management */}
      <div className="flex items-center space-x-1">
        {users.map(user => (
          <div
            key={user.id}
            className={`relative group ${user.id === currentUser?.id ? 'ring-2 ring-primary-500' : ''}`}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium cursor-pointer"
              style={{ backgroundColor: user.color }}
              onClick={() => setCurrentUser(user)}
              title={user.name}
            >
              {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            
            {users.length > 1 && (
              <button
                onClick={() => handleDeleteUser(user.id)}
                className="absolute -top-1 -right-1 w-4 h-4 bg-error-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {/* User Count */}
      <div className="text-sm text-neutral-500">
        {users.length}/10 users
      </div>
    </div>
  );
};

export default UserSelector;