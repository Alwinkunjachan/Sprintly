import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class IssueLabel extends Model {
  declare issueId: string;
  declare labelId: string;
}

IssueLabel.init(
  {
    issueId: {
      type: DataTypes.UUID,
      primaryKey: true,
    },
    labelId: {
      type: DataTypes.UUID,
      primaryKey: true,
    },
  },
  {
    sequelize,
    tableName: 'issue_labels',
    underscored: true,
    timestamps: false,
  }
);
