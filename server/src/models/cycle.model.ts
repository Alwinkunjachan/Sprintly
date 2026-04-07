import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface CycleAttributes {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'completed';
  projectId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CycleCreationAttributes
  extends Optional<CycleAttributes, 'id' | 'description' | 'status'> {}

export class Cycle
  extends Model<CycleAttributes, CycleCreationAttributes>
  implements CycleAttributes
{
  declare id: string;
  declare name: string;
  declare description: string | null;
  declare startDate: string;
  declare endDate: string;
  declare status: 'upcoming' | 'active' | 'completed';
  declare projectId: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Cycle.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('upcoming', 'active', 'completed'),
      allowNull: false,
      defaultValue: 'upcoming',
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'cycles',
    underscored: true,
  }
);
