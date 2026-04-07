import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface ProjectAttributes {
  id: string;
  name: string;
  identifier: string;
  description: string | null;
  issueCounter: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ProjectCreationAttributes
  extends Optional<ProjectAttributes, 'id' | 'description' | 'issueCounter'> {}

export class Project
  extends Model<ProjectAttributes, ProjectCreationAttributes>
  implements ProjectAttributes
{
  declare id: string;
  declare name: string;
  declare identifier: string;
  declare description: string | null;
  declare issueCounter: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Project.init(
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
    identifier: {
      type: DataTypes.STRING(5),
      allowNull: false,
      unique: true,
      validate: {
        isUppercase: true,
        len: [2, 5],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    issueCounter: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'projects',
    underscored: true,
  }
);
