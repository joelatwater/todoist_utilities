# Todoist to PDF Exporter

This Google Apps Script fetches all uncompleted tasks from a Todoist account, organizes them by project into a new Google Sheet, and then exports that sheet as a PDF to a specified Google Drive folder.

## Features

-   Fetches uncompleted tasks from Todoist using the REST API.
-   Groups tasks by project.
-   Creates a formatted Google Sheet with the tasks.
-   Exports the Google Sheet to a PDF file in a specified Google Drive folder.
-   Securely stores the Todoist API token and Google Drive folder ID as script properties.
-   Automatically deletes the previous day's report to keep the folder clean.

## Setup and Usage

1.  **Create a new Google Sheet.**
2.  Open the **Apps Script** editor by going to `Extensions > Apps Script`.
3.  Copy the code from `Code.js` and `appsscript.json` into the corresponding files in the Apps Script editor.
4.  Go to **Project Settings** (the gear icon on the left).
5.  Under **Script Properties**, add two properties:
    -   Name: `TODOIST_API_TOKEN`, Value: `YOUR_TODOIST_API_TOKEN`
    -   Name: `GOOGLE_DRIVE_FOLDER_ID`, Value: `YOUR_GOOGLE_DRIVE_FOLDER_ID`
6.  Replace `YOUR_TODOIST_API_TOKEN` with your actual Todoist API token. You can get one from your Todoist settings: `Settings > Integrations > Developer > API Token`.
7.  Replace `YOUR_GOOGLE_DRIVE_FOLDER_ID` with the ID of the Google Drive folder where you want to save the PDF report. You can find this ID in the URL of the folder (e.g., in `https://drive.google.com/drive/folders/THIS_IS_THE_ID`, `THIS_IS_THE_ID` is the folder ID).
8.  Save the project.

## Running the Script

1.  To run the script manually, select the `createTodoistReport` function from the dropdown menu in the Apps Script editor and click **Run**.
2.  The first time you run the script, you will be prompted to authorize its permissions to access external services, Google Sheets, and Google Drive.
3.  Check the **Execution Log** in the Apps Script editor for status messages.

## Automating with Triggers

To run the script automatically every day:

1.  In the Apps Script editor, go to **Triggers** (the clock icon on the left).
2.  Click **Add Trigger**.
3.  Configure the trigger as follows:
    -   **Choose which function to run**: `createTodoistReport`
    -   **Choose which deployment to run**: `Head`
    -   **Select event source**: `Time-driven`
    -   **Select type of time based trigger**: `Day timer`
    -   **Select time of day**: `Midnight to 1am` (or your preferred time)
4.  Click **Save**.

The script will now run automatically every day at the specified time, generating a new PDF report and deleting the old one.
