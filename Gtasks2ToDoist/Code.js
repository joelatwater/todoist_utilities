/**
 * @fileoverview Syncs tasks from a specified Google Tasks list to Todoist.
 *
 * This script fetches uncompleted tasks from a Google Tasks list, creates them
 * in Todoist, and then deletes the original task from Google Tasks to prevent
 * duplicates on subsequent runs.
 *
 * It handles task titles, notes, due dates, and special links to Gmail threads.
 */

// ========== SCRIPT CONFIGURATION ==========
//
// 1. Open the Script Editor.
// 2. In the left-hand menu, click "Project Settings" (the gear icon ⚙️).
// 3. In the "Script Properties" section, click "Add script property".
// 4. Add the following two properties:
//
//    Property Name         | Example Value
//    ----------------------|--------------------------------------------------
//    TODOIST_API_TOKEN     | 0123456789abcdef0123456789abcdef01234567
//    GOOGLE_TASK_LIST_NAME | My Tasks
//
//    - You can get your Todoist API token from: https://todoist.com/app/settings/integrations
//    - The GOOGLE_TASK_LIST_NAME should be the exact name of the Google Tasks
//      list you want to sync from (e.g., "My Tasks", "Work", "Shopping").
//
// 5. Enable the "Google Tasks API" service:
//    - In the left-hand menu, next to "Services", click the "+" icon.
//    - Select "Google Tasks API" and click "Add".

/**
 * The main function to be triggered by a time-based trigger.
 * Fetches Google Tasks and syncs them to Todoist.
 */
function syncGoogleTasksToTodoist() {
  const SCRIPT_PROPERTIES = PropertiesService.getScriptProperties();
  const TODOIST_API_TOKEN = SCRIPT_PROPERTIES.getProperty('TODOIST_API_TOKEN');
  const GOOGLE_TASK_LIST_NAME = SCRIPT_PROPERTIES.getProperty('GOOGLE_TASK_LIST_NAME');

  // Validate that script properties are set
  if (!TODOIST_API_TOKEN || !GOOGLE_TASK_LIST_NAME) {
    console.error("Script configuration is incomplete. Please set TODOIST_API_TOKEN and GOOGLE_TASK_LIST_NAME in the Script Properties.");
    return;
  }

  try {
    // Find the ID of the Google Task list by its name
    const taskListId = getTaskListIdByName_(GOOGLE_TASK_LIST_NAME);
    if (!taskListId) {
      console.error(`Could not find a Google Tasks list named "${GOOGLE_TASK_LIST_NAME}". Please check the name in your Script Properties. Aborting sync.`);
      return;
    }
    console.log(`Found task list "${GOOGLE_TASK_LIST_NAME}" with ID: ${taskListId}`);

    // Fetch all non-completed tasks from the specified list
    const tasks = Tasks.Tasks.list(taskListId, {
      showCompleted: false,
      showHidden: false
    });

    if (!tasks.items || tasks.items.length === 0) {
      console.log("No tasks to sync.");
      return;
    }

    console.log(`Found ${tasks.items.length} task(s) to sync.`);

    // Process each task
    tasks.items.forEach(task => {
      // Skip tasks without a title
      if (!task.title) {
        return;
      }

      console.log(`Processing task: "${task.title}"`);

      // Prepare the description, starting with any notes
      let description = task.notes || '';

      // Check for a linked email and append its URL to the description
      if (task.links) {
        const emailLink = task.links.find(link => link.type === 'email');
        if (emailLink) {
          const emailUrl = emailLink.link;
          // Add a separator if there are already notes
          if (description) {
            description += '\n\n---\n';
          }
          description += `Linked Email: ${emailUrl}`;
          console.log(`Found linked email: ${emailUrl}`);
        }
      }

      // Prepare the payload for the Todoist API
      const todoistPayload = {
        content: task.title,
        description: description.trim()
      };

      // If there's a due date, format it for the Todoist API (YYYY-MM-DD)
      if (task.due) {
        todoistPayload.due_date = task.due.substring(0, 10);
      }

      // Create the task in Todoist
      const todoistResponse = createTodoistTask_(todoistPayload, TODOIST_API_TOKEN);

      // If the task was created successfully in Todoist, delete it from Google Tasks
      if (todoistResponse) {
        console.log(`Successfully created task in Todoist: "${task.title}". Response: ${todoistResponse.getContentText()}`);
        try {
          Tasks.Tasks.remove(taskListId, task.id);
          console.log(`Successfully deleted task from Google Tasks: "${task.title}"`);
        } catch (e) {
          console.error(`Failed to delete task from Google Tasks (ID: ${task.id}). Please delete it manually to avoid duplicates. Error: ${e.toString()}`);
        }
      } else {
        // Log an error if the Todoist creation failed to prevent data loss
        console.error(`Failed to create task in Todoist: "${task.title}". The task will not be deleted from Google Tasks.`);
      }
    });

  } catch (err) {
    console.error(`An error occurred during the sync process: ${err.toString()}`);
  }
}

/**
 * Helper function to find the ID of a Google Tasks list by its name.
 * @param {string} listName The name of the task list to find.
 * @return {string|null} The ID of the found list, or null if not found.
 * @private
 */
function getTaskListIdByName_(listName) {
  try {
    const taskLists = Tasks.Tasklists.list();
    if (!taskLists.items) {
      console.log("No task lists found for this user.");
      return null;
    }

    const foundList = taskLists.items.find(list => list.title === listName);
    return foundList ? foundList.id : null;

  } catch (e) {
    console.error(`Error fetching Google Task lists: ${e.toString()}`);
    return null;
  }
}


/**
 * Helper function to create a new task in Todoist via their REST API.
 * @param {Object} payload The data for the new task.
 * @param {string} apiToken The user's Todoist API token.
 * @return {GoogleAppsScript.URL_Fetch.HTTPResponse|null} The HTTP response object on success, or null on failure.
 * @private
 */
function createTodoistTask_(payload, apiToken) {
  const TODOIST_API_URL = 'https://api.todoist.com/rest/v2/tasks';

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + apiToken
    },
    // The payload must be stringified
    payload: JSON.stringify(payload),
    // Mute exceptions to handle non-200 responses gracefully
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(TODOIST_API_URL, options);
    const responseCode = response.getResponseCode();

    // 200 is the success code for task creation
    if (responseCode === 200) {
      return response;
    } else {
      console.error(`Todoist API returned an error. Status: ${responseCode}. Response: ${response.getContentText()}`);
      return null;
    }
  } catch (e) {
    console.error(`Failed to call Todoist API. Error: ${e.toString()}`);
    return null;
  }
}
