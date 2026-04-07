import sequelize from '../config/database';
import { Project } from './project.model';
import { Member } from './member.model';
import { Issue } from './issue.model';
import { Label } from './label.model';
import { IssueLabel } from './issue-label.model';
import { Cycle } from './cycle.model';

// Project associations
Project.hasMany(Issue, { foreignKey: 'projectId', as: 'issues' });
Project.hasMany(Cycle, { foreignKey: 'projectId', as: 'cycles' });

// Issue associations
Issue.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
Issue.belongsTo(Member, { foreignKey: 'assigneeId', as: 'assignee' });
Issue.belongsTo(Cycle, { foreignKey: 'cycleId', as: 'cycle' });
Issue.belongsToMany(Label, { through: IssueLabel, foreignKey: 'issueId', otherKey: 'labelId', as: 'labels' });

// Label associations (global — not tied to project)
Label.belongsToMany(Issue, { through: IssueLabel, foreignKey: 'labelId', otherKey: 'issueId', as: 'issues' });

// Cycle associations
Cycle.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
Cycle.hasMany(Issue, { foreignKey: 'cycleId', as: 'issues' });

// Member associations
Member.hasMany(Issue, { foreignKey: 'assigneeId', as: 'assignedIssues' });

export { sequelize, Project, Member, Issue, Label, IssueLabel, Cycle };
