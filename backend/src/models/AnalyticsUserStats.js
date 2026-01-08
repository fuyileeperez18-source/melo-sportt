const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const AnalyticsUserStats = sequelize.define('AnalyticsUserStats', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  month: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  new_users: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  total_users: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  active_users: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  active_orders: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  tableName: 'analytics_user_stats',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = AnalyticsUserStats;