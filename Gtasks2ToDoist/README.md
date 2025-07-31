# Google Tasks to Todoist Sync (One-Way)

This Google Apps Script provides a one-way synchronization of tasks from a specified Google Tasks list to your Todoist account. It is designed to act as a bridge, moving tasks from Google's ecosystem into Todoist for consolidated task management.

## How It Works

The script performs the following actions:
1.  Fetches all uncompleted tasks from a specific Google Tasks list that you define.
2.  For each task, it creates a new task in Todoist, transferring the following information:
    *   Task Title
    *   Notes (as the task description)
    *   Due Date
    *   Linked Gmail threads (appended to the description)
3.  After a task is successfully created in Todoist, it is **permanently deleted** from Google Tasks to prevent duplicate entries on subsequent runs.

> **Warning:** This script performs a destructive action by deleting tasks from your Google Tasks list. It is highly recommended to test the script with a new, non-critical task list first to ensure it works as you expect.

## Features

-   **One-Way Sync:** Moves tasks from Google Tasks to Todoist.
-   **Preserves Task Details:** Migrates titles, notes, and due dates.
-   **Supports Gmail Links:** Correctly handles the special links created when you use the "Add to Tasks" feature in Gmail.
-   **Prevents Duplicates:** Deletes tasks from the source list after they are synced.
-   **Automated:** Can be set up on a time-based trigger to run automatically.

## Installation and Configuration

Follow these steps carefully to set up the script.

### Step 1: Create the Google Apps Script Project

1.  Go to the [Google Apps Script dashboard](https://script.google.com/home).
2.  Click **New project**.
3.  Give the project a name, for example, "GTasks to Todoist Sync".

### Step 2: Add the Script Files

You will need to add two files to your project: `Code.js` and `appsscript.json`.

1.  **Add `Code.js`:**
    *   Delete any boilerplate code in the `Code.js` file.
    *   Copy the entire content of the `Code.js` file from this repository and paste it into the editor.

2.  **Add `appsscript.json`:**
    *   In the script editor, go to **View > Show manifest file**. This will reveal the `appsscript.json` file in the file explorer.
    *   Copy the content of the `appsscript.json` file from this repository and paste it into the manifest file, replacing its original content.

### Step 3: Enable the Google Tasks API

The script needs permission to access your Google Tasks.

1.  In the left-hand menu of the script editor, find the "Services" section and click the **+** icon.
2.  Select **Google Tasks API** from the list.
3.  Click **Add**. The service will appear in the list as `Tasks`.

### Step 4: Configure Script Properties

You must provide your Todoist API token and the name of the Google Tasks list you want to sync from.

1.  In the left-hand menu, click **Project Settings** (the gear icon ⚙️).
2.  In the "Script Properties" section, click **Add script property**.
3.  Add the following two properties:

| Property Name           | Example Value                              | Description                                                                                             |
| ----------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `TODOIST_API_TOKEN`     | `0123456789abcdef0123456789abcdef01234567` | Your personal Todoist API token. You can get this from [Todoist Settings > Integrations](https://todoist.com/app/settings/integrations). |
| `GOOGLE_TASK_LIST_NAME` | `My Tasks`                                 | The **exact name** of the Google Tasks list you want to sync from (e.g., "My Tasks", "Work", "Shopping"). |

4.  Click **Save script properties**.

## Usage

### Running the Sync Manually

You can run the script manually to test it or for a one-time sync.

1.  Make sure you have saved all your changes (**File > Save all**).
2.  From the function dropdown menu at the top of the editor, select `syncGoogleTasksToTodoist`.
3.  Click **Run**.
4.  The first time you run it, Google will ask for authorization. Grant the script the necessary permissions to access your tasks.
5.  Check the execution log at the bottom of the screen to see the script's progress.

### Automating the Sync with a Trigger

To have the script run automatically, set up a time-based trigger.

1.  In the left-hand menu, click **Triggers** (the alarm clock icon ⏰).
2.  Click **Add Trigger**.
3.  Configure the trigger with the following settings:
    *   **Choose which function to run**: `syncGoogleTasksToTodoist`
    *   **Choose which deployment to run**: `Head`
    *   **Select event source**: `Time-driven`
    *   **Select type of time-based trigger**: `Minutes timer` (or `Hour timer`)
    *   **Select minute interval**: `Every 15 minutes` (or your desired frequency)
4.  Click **Save**.

The script will now run automatically at the interval you specified, keeping your Todoist up-to-date with new tasks from Google Tasks.
