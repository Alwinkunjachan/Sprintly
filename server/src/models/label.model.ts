import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface LabelAttributes {
  id: string;
  name: string;
  color: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface LabelCreationAttributes
  extends Optional<LabelAttributes, 'id'> {}

export class Label
  extends Model<LabelAttributes, LabelCreationAttributes>
  implements LabelAttributes
{
  declare id: string;
  declare name: string;
  declare color: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Label.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    color: {
      type: DataTypes.STRING(7),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'labels',
    underscored: true,
  }
);
