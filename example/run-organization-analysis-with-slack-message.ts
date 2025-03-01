import { execute } from 'flows-ai'

import { githubAgent, slackAgent } from './agents'
import { organizationAnalysisWithSlackMessageFlow } from './flows'

const projectName = process.argv[2]

if (!projectName) {
  throw new Error(
    'Please provide a project name, e.g.: bun run-project-analysis.ts facebook/react-native'
  )
}

const channelId = process.env['SLACK_CHANNEL_ID']
if (!channelId) {
  throw new Error('Please set SLACK_CHANNEL_ID environment variable.')
}

/**
 * In this example, we run already defined `githubProjectHealthAnalysisFlow`,
 * and then, we send the report to Slack.
 */
const response = await execute(organizationAnalysisWithSlackMessageFlow, {
  agents: {
    githubAgent,
    slackAgent,
  },
  input: projectName,
  onFlowStart: (flow) => {
    console.log('Executing', flow.agent.name)
  },
})

console.log(response)
