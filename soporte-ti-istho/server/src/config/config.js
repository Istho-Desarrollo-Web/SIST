require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || null,
    database: process.env.DB_NAME || 'soporte_ti_istho',
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    timezone: '-05:00',
    dialectOptions: {
      charset: 'utf8mb4',
    },
    define: {
      underscored: false,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    logging: false,
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'mysql',
    timezone: '-05:00',
    dialectOptions: {
      charset: 'utf8mb4',
      ssl: { require: true, rejectUnauthorized: false },
    },
    define: {
      underscored: false,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    logging: false,
  },
};
