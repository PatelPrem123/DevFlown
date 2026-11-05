import { stringify } from 'csv-stringify/sync';
import ExcelJS from 'exceljs';
import Task from '../models/Task.js';
import Project from '../models/Project.js';

/**
 * Prepares formatted tabular task rows for export
 */
export const getTaskExportData = async (projectId) => {
  const project = await Project.findById(projectId).select('name key').lean();
  if (!project) {
    const error = new Error('Project not found.');
    error.statusCode = 404;
    error.code = 'PROJECT_NOT_FOUND';
    throw error;
  }

  const tasks = await Task.find({ projectId })
    .populate('assigneeId', 'name email')
    .populate('reporterId', 'name email')
    .populate('sprintId', 'name')
    .populate('milestoneId', 'title')
    .sort({ orderIndex: 1 })
    .lean();

  const rows = tasks.map((t) => ({
    'Task Key': t.taskKey,
    'Title': t.title,
    'Status': t.status,
    'Priority': t.priority,
    'Story Points': t.storyPoints !== null && t.storyPoints !== undefined ? t.storyPoints : '',
    'Assignee': t.assigneeId ? t.assigneeId.name : 'Unassigned',
    'Assignee Email': t.assigneeId ? t.assigneeId.email : '',
    'Reporter': t.reporterId ? t.reporterId.name : 'System',
    'Sprint': t.sprintId ? t.sprintId.name : 'Backlog',
    'Milestone': t.milestoneId ? t.milestoneId.title : 'None',
    'Due Date': t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : '',
    'Labels': (t.labels || []).join(', '),
    'Commits Count': (t.githubCommits || []).length,
    'Pull Requests Count': (t.githubPullRequests || []).length,
    'Created At': new Date(t.createdAt).toISOString()
  }));

  return { project, rows };
};

/**
 * Generates RFC 4180 compliant CSV stream string
 */
export const exportTasksToCSV = async (projectId) => {
  const { rows } = await getTaskExportData(projectId);

  if (rows.length === 0) {
    return 'Task Key,Title,Status,Priority,Story Points,Assignee,Assignee Email,Reporter,Sprint,Milestone,Due Date,Labels,Commits Count,Pull Requests Count,Created At\n';
  }

  return stringify(rows, {
    header: true,
    quoted_string: true
  });
};

/**
 * Generates formatted, production-grade Excel (.xlsx) spreadsheet
 */
export const exportTasksToExcel = async (projectId) => {
  const { project, rows } = await getTaskExportData(projectId);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DevFlow Platform';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Project Tasks', {
    properties: { tabColor: { argb: '4F46E5' } },
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  sheet.columns = [
    { header: 'Task Key', key: 'Task Key', width: 14 },
    { header: 'Title', key: 'Title', width: 36 },
    { header: 'Status', key: 'Status', width: 15 },
    { header: 'Priority', key: 'Priority', width: 12 },
    { header: 'Story Points', key: 'Story Points', width: 14 },
    { header: 'Assignee', key: 'Assignee', width: 22 },
    { header: 'Assignee Email', key: 'Assignee Email', width: 28 },
    { header: 'Reporter', key: 'Reporter', width: 22 },
    { header: 'Sprint', key: 'Sprint', width: 22 },
    { header: 'Milestone', key: 'Milestone', width: 24 },
    { header: 'Due Date', key: 'Due Date', width: 14 },
    { header: 'Labels', key: 'Labels', width: 20 },
    { header: 'Commits Count', key: 'Commits Count', width: 14 },
    { header: 'Pull Requests Count', key: 'Pull Requests Count', width: 18 },
    { header: 'Created At', key: 'Created At', width: 24 }
  ];

  // Header row styling
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '4F46E5' } // Indigo brand theme
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 24;

  // Add data rows
  rows.forEach((row) => {
    sheet.addRow(row);
  });

  return await workbook.xlsx.writeBuffer();
};
