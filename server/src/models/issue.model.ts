import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type IssueStatus = 'backlog' | 'todo' | 'in_progress' | 'ready_to_test' | 'testing_in_progress' | 'done' | 'cancelled';
export type IssuePriority = 'urgent' | 'high' | 'medium' | 'low' | 'none';

export interface IssueAttributes {
  id: string;
  identifier: string;
  number: number;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  projectId: string;
  assigneeId: string | null;
  cycleId: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface IssueCreationAttributes
  extends Optional<
    IssueAttributes,
    'id' | 'identifier' | 'number' | 'description' | 'status' | 'priority' | 'assigneeId' | 'cycleId'
  > {}

export class Issue
  extends Model<IssueAttributes, IssueCreationAttributes>
  implements IssueAttributes
{
  declare id: string;
  declare identifier: string;
  declare number: number;
  declare title: string;
  declare description: string | null;
  declare status: IssueStatus;
  declare priority: IssuePriority;
  declare projectId: string;
  declare assigneeId: string | null;
  declare cycleId: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  // Associations
  declare labels?: any[];
  declare project?: any;
  declare assignee?: any;
  declare cycle?: any;
}

Issue.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    identifier: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('backlog', 'todo', 'in_progress', 'ready_to_test', 'testing_in_progress', 'done', 'cancelled'),
      allowNull: false,
      defaultValue: 'backlog',
    },
    priority: {
      type: DataTypes.ENUM('urgent', 'high', 'medium', 'low', 'none'),
      allowNull: false,
      defaultValue: 'none',
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    assigneeId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    cycleId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'issues',
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['project_id', 'number'],
      },
    ],
  }
);
