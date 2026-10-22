import createTask from './create-task/create-task.js'
import checkTitle from './check-title/check-title.js'
import listTasks from './list-tasks/list-tasks.js'
import getTask from './get-task/get-task.js'
import updateTaskStatus from './update-task-status/update-task-status.js'
import deleteTask from './delete-task/delete-task.js'

const tasksPlugin = {
  name: 'tasks',
  version: '1.0.0',
  register: (server, _options) => {
    server.route([
      createTask,
      checkTitle,
      listTasks,
      getTask,
      updateTaskStatus,
      deleteTask
    ])
    server.logger.info('Tasks plugin registered')
  }
}

export default tasksPlugin
export { default as createTask } from './create-task/create-task.js'
export { default as checkTitle } from './check-title/check-title.js'
export { default as listTasks } from './list-tasks/list-tasks.js'
export { default as getTask } from './get-task/get-task.js'
export { default as updateTaskStatus } from './update-task-status/update-task-status.js'
export { default as deleteTask } from './delete-task/delete-task.js'
