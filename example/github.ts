import { openai } from '@ai-sdk/openai'
import { tool } from 'ai'
import z from 'zod'

import { run } from '../index.js'
import { agent, flow } from '../index.js'

// https://sdk.vercel.ai/docs/ai-sdk-core/agents
// We're using `tool-as-agent` per Vercel AI SDK

const communicationAgent = agent({
  model: openai('gpt-4o'),
  system: `
    You are a communication agent.
    You need to send a message to the given receipient.

    For project maintainers, you send emails to: "opensource@callstack.com".
  `,
  tools: {
    sendEmail: tool({
      parameters: z.object({
        message: z.string().describe('The message to send'),
        to: z.string().describe('The email address to send the message to'),
      }),
      execute: async ({ message, to }) => {
        return `Email sent: ${message} to ${to}`
      },
    }),
  },
})

/**
 * This agent takes a Github project name as input and task to perform.
 */
const githubAgent = agent({
  model: openai('gpt-4o-mini'),
  system: `
    You are a Github agent.
    You are given a Github project name and an instruction to perform.
    You will scrape the data from Github and return the result.
  `,
  tools: {
    scrapeTool: tool({
      parameters: z.object({
        url: z.string().describe('The url to scrape'),
      }),
      execute: async () => {
        return `<html><div>Open issues: 10000</div>, Top 3 issues: <ul><li>Issue 1</li><li>Issue 2</li><li>Issue 3</li></ul></html>`
      },
    }),
  },
})

/**
 * This agent takes simple text as input
 */
const userInputAgent = agent({
  model: openai('gpt-4o-mini'),
  system: 'You are given a prompt and you need to return the user input.',
  tools: {
    askQuestion: tool({
      parameters: z.object({
        message: z.string().describe('The question to ask the user'),
      }),
      execute: async ({ message }) => {
        const { text } = await import('@clack/prompts')
        return text({
          message,
        })
      },
    }),
  },
})

const githubProjectHealthAnalysisFlow = {
  agent: 'sequenceAgent',
  payload: [
    {
      agent: 'userInputAgent',
      payload: 'Get a valid Github project name in format "organization/project"',
    },
    {
      agent: 'githubAgent',
      payload: 'Go to Github and get the top 3 most popular issues and number of open issues.',
    },
    {
      agent: 'forEachAgent',
      step: 'Each step is a Github issue and total number of open issues',
      payload: {
        agent: 'parallelAgent',
        payload: [
          {
            agent: 'oneOfAgent',
            payload: [
              {
                agent: 'communicationAgent',
                payload: 'Write an email to the maintainer saying he is behind schedule.',
                when: 'There are more than 500 open issues',
              },
              {
                agent: 'communicationAgent',
                payload: 'Inform the maintainer that he is doing good job.',
                when: 'There are less than 500 open issues',
              },
            ],
          },
          {
            agent: 'communicationAgent',
            payload: 'Inform the maintainer about open issue.',
          },
        ],
      },
    },
  ],
}

/**
 * In order to run the flow, we must first construct it out of the definition,
 * and provide all the agents.
 */
const f = flow(githubProjectHealthAnalysisFlow, {
  userInputAgent,
  githubAgent,
  communicationAgent,
})

/**
 * In this particular example, the flow takes no input argument (gets it from the user)
 */
const response = await run(f, '')

console.log('response', response)
