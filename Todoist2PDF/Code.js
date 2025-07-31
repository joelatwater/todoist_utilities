/**
 * This script fetches all uncompleted tasks from a Todoist account,
 * organizes them by project into a new Google Sheet, and then exports
 * that sheet as a PDF to a specified Google Drive folder.
 *
 * To use this script:
 * 1.  Open the Google Apps Script editor from a Google Sheet.
 * 2.  Paste this entire script into the editor.
 * 3.  Go to "Project Settings" (the gear icon on the left).
 * 4.  Under "Script Properties", add two properties:
 *     - Name: TODOIST_API_TOKEN, Value: YOUR_TODOIST_API_TOKEN
 *     - Name: GOOGLE_DRIVE_FOLDER_ID, Value: YOUR_GOOGLE_DRIVE_FOLDER_ID
 * 5.  Run the 'createTodoistReport' function.
 * 6.  The first time you run it, you will be prompted to authorize the script's
 * permissions to access external services, Google Sheets, and Google Drive.
 * Check the Execution Log in the Apps Script editor for status messages.
 */

/**
 * Main function to be run by the user.
 * It orchestrates the entire process of fetching tasks, creating the sheet,
 * and exporting the PDF.
 */
function createTodoistReport() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const TODOIST_API_TOKEN = scriptProperties.getProperty('TODOIST_API_TOKEN');
  const GOOGLE_DRIVE_FOLDER_ID = scriptProperties.getProperty('GOOGLE_DRIVE_FOLDER_ID');

  // Check if placeholder values have been replaced.
  if (!TODOIST_API_TOKEN || !GOOGLE_DRIVE_FOLDER_ID) {
    const message = "Please set the 'TODOIST_API_TOKEN' and 'GOOGLE_DRIVE_FOLDER_ID' script properties.";
    Logger.log(message);
    return;
  }

  try {
    Logger.log('Starting Todoist report generation...');

    // Clean up yesterday's report.
    deleteYesterdaysReport(GOOGLE_DRIVE_FOLDER_ID);

    // Step 1: Fetch and group tasks from Todoist.
    const tasksByProject = getUncompletedTasksByProject(TODOIST_API_TOKEN);
    if (Object.keys(tasksByProject).length === 0) {
      Logger.log('No uncompleted tasks found. Aborting.');
      return;
    }

    // Step 2: Create a new Google Sheet and populate it with the tasks.
    const spreadsheet = createAndPopulateSheet(tasksByProject);

    // Step 3: Export the sheet as a PDF to Google Drive.
    exportSheetAsPdf(spreadsheet, GOOGLE_DRIVE_FOLDER_ID);

    // Step 4: Clean up the temporary spreadsheet.
    DriveApp.getFileById(spreadsheet.getId()).setTrashed(true);

    Logger.log('Successfully created Todoist report PDF. Check your specified Google Drive folder.');

  } catch (error) {
    Logger.log('An error occurred: ' + error.toString());
    Logger.log('Stack: ' + error.stack);
  }
}

/**
 * Deletes the PDF report from yesterday to keep the folder clean.
 * @param {string} folderId - The ID of the Google Drive folder.
 */
function deleteYesterdaysReport(folderId) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const formattedDate = (yesterday.getMonth() + 1) + '-' + yesterday.getDate() + '-' + yesterday.getFullYear();
  const fileName = `Todoist Report - ${formattedDate}.pdf`;

  try {
    const folder = DriveApp.getFolderById(folderId);
    const files = folder.getFilesByName(fileName);
    if (files.hasNext()) {
      const file = files.next();
      file.setTrashed(true);
      Logger.log(`Cleaned up yesterday's report: ${fileName}`);
    } else {
      Logger.log("No report from yesterday to clean up.");
    }
  } catch (e) {
    Logger.log(`Could not clean up yesterday's report. Error: ${e.toString()}`);
  }
}

/**
 * Fetches all projects and all uncompleted tasks from the Todoist API,
 * then groups the tasks by their project name.
 * @param {string} apiToken - The Todoist API token.
 * @returns {Object} An object where keys are project names and values are arrays of task objects.
 */
function getUncompletedTasksByProject(apiToken) {
  const apiHeaders = {
    'Authorization': 'Bearer ' + apiToken
  };
  const apiOptions = {
    'method': 'get',
    'headers': apiHeaders
  };

  // Fetch all projects to map project IDs to names.
  Logger.log('Fetching projects from Todoist...');
  const projectsResponse = UrlFetchApp.fetch('https://api.todoist.com/rest/v2/projects', apiOptions);
  const projects = JSON.parse(projectsResponse.getContentText());

  const projectMap = {};
  projects.forEach(project => {
    projectMap[project.id] = project.name;
  });

  // Fetch all active (uncompleted) tasks.
  Logger.log('Fetching uncompleted tasks from Todoist...');
  const tasksResponse = UrlFetchApp.fetch('https://api.todoist.com/rest/v2/tasks', apiOptions);
  const tasks = JSON.parse(tasksResponse.getContentText());
  Logger.log(`Found ${tasks.length} uncompleted tasks.`);

  // Group tasks by project name.
  const tasksByProject = {};
  tasks.forEach(task => {
    // Use the project ID to find the project name.
    // If a project ID is not found in our map (which is true for the Inbox project),
    // we default the name to 'Inbox'. This ensures tasks from the Inbox are included.
    const projectName = projectMap[task.project_id] || 'Inbox';
    if (!tasksByProject[projectName]) {
      tasksByProject[projectName] = [];
    }
    tasksByProject[projectName].push({
      content: task.content,
      due: task.due ? task.due.string : 'No due date'
    });
  });

  return tasksByProject;
}

/**
 * Creates a new Google Sheet and populates it with the tasks grouped by project.
 * @param {Object} tasksByProject - The tasks grouped by project name.
 * @returns {Spreadsheet} The newly created Google Spreadsheet object.
 */
function createAndPopulateSheet(tasksByProject) {
  const date = new Date();
  const formattedDate = (date.getMonth() + 1) + '-' + date.getDate() + '-' + date.getFullYear();
  const sheetName = `Todoist Report - ${formattedDate}`;

  Logger.log(`Creating new spreadsheet: "${sheetName}"`);
  const spreadsheet = SpreadsheetApp.create(sheetName);
  const sheet = spreadsheet.getActiveSheet();
  sheet.setName('Uncompleted Tasks');

  // Set up main title
  sheet.appendRow([sheetName]).getRange('A1').setFontWeight('bold').setFontSize(16).setHorizontalAlignment('center');
  sheet.getRange('A1:B1').merge();
  sheet.appendRow(['']); // Add a spacer row

  // Iterate over each project and its tasks, and write them to the sheet.
  for (const projectName in tasksByProject) {
    if (tasksByProject.hasOwnProperty(projectName)) {
      // Append project name as a header row.
      const projectHeaderRow = sheet.getLastRow() + 1;
      sheet.appendRow([projectName]).getRange(`A${projectHeaderRow}`).setFontWeight('bold').setFontSize(12).setBackground('#f3f3f3');
      sheet.getRange(`A${projectHeaderRow}:B${projectHeaderRow}`).merge();

      // Append headers for the tasks.
      const taskHeaderRow = sheet.getLastRow() + 1;
      sheet.appendRow(['Task', 'Due Date']).getRange(`A${taskHeaderRow}:B${taskHeaderRow}`).setFontWeight('bold');

      // Append each task for the current project.
      const tasks = tasksByProject[projectName];
      tasks.forEach(task => {
        sheet.appendRow([task.content, task.due]);
      });

      sheet.appendRow(['']); // Add a spacer row after each project section.
    }
  }

  // Set column widths and text wrapping for better readability.
  sheet.setColumnWidth(1, 400); // Set Task column width to 400 pixels.
  sheet.autoResizeColumn(2); // Auto-size the Due Date column.
  sheet.getRange("A:A").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP); // Wrap text in the Task column.

  // Apply all pending changes to the spreadsheet to ensure they are reflected in the PDF.
  SpreadsheetApp.flush();

  Logger.log('Spreadsheet has been populated and formatted.');
  return spreadsheet;
}

/**
 * Exports a given Google Sheet as a PDF to the specified Google Drive folder.
 * @param {Spreadsheet} spreadsheet - The Google Spreadsheet to export.
 * @param {string} folderId - The ID of the Google Drive folder.
 */
function exportSheetAsPdf(spreadsheet, folderId) {
  try {
    Logger.log('Exporting spreadsheet to PDF...');
    const folder = DriveApp.getFolderById(folderId);
    const pdfBlob = spreadsheet.getBlob().getAs('application/pdf');
    pdfBlob.setName(spreadsheet.getName() + '.pdf');

    const pdfFile = folder.createFile(pdfBlob);
    Logger.log(`PDF file created: ${pdfFile.getName()} in folder "${folder.getName()}"`);
  } catch (e) {
    // This specific catch helps identify if the folder ID is incorrect.
    if (e.message.includes("Folder not found")) {
       Logger.log(`Error: The Google Drive Folder with ID "${folderId}" was not found. Please check the ID and your permissions.`);
    }
    // Re-throw the error to be caught by the main function's catch block.
    throw e;
  }
}