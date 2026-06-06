const welcomeMessage = require('./welcome-message')
const packageMilestone = require('./package-milestone')
const packageCompletion = require('./package-completion')
const noShowFollowup = require('./no-show-followup')
const inactivePatient = require('./inactive-patient')

function startWorkflowEngine() {
  // Register event-driven workflows
  welcomeMessage.register()
  packageMilestone.register()
  packageCompletion.register()
  noShowFollowup.register()

  // Start cron-based workflows
  inactivePatient.start()

  console.log('[WorkflowEngine] Started — 4 event listeners, 1 cron job')
}

module.exports = { startWorkflowEngine }
