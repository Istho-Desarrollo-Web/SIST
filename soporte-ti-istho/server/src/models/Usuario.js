const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

class Usuario extends Model {
  validarPassword(password) {
    return bcrypt.compareSync(password, this.password_hash);
  }

  toJSON() {
    const values = { ...this.get() };
    delete values.password_hash;
    delete values.intentos_fallidos;
    return values;
  }
}

Usuario.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  identificacion: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(100), allowNull: false, unique: true, validate: { isEmail: true } },
  password_hash: { type: DataTypes.STRING(255), allowNull: false },
  rol: { type: DataTypes.ENUM('admin', 'tecnico', 'usuario'), allowNull: false, defaultValue: 'usuario' },
  area: { type: DataTypes.STRING(100) },
  especialidad: { type: DataTypes.STRING(100) },
  capacidad_max: { type: DataTypes.INTEGER, defaultValue: 10 },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
  ultimo_acceso: { type: DataTypes.DATE },
  intentos_fallidos: { type: DataTypes.INTEGER, defaultValue: 0 },
  bloqueado_hasta: { type: DataTypes.DATE },
}, {
  sequelize,
  modelName: 'Usuario',
  tableName: 'usuarios',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password_hash) {
        user.password_hash = await bcrypt.hash(user.password_hash, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password_hash')) {
        user.password_hash = await bcrypt.hash(user.password_hash, 10);
      }
    },
  },
});

module.exports = Usuario;
