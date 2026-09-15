function buildAssistantSystemPrompt(input) {
  const base = input.baseKnowledge.map((k) => `### ${k.title}\n${k.body}`).join('\n\n')
  const siteKb = input.siteKnowledge.map((k) => `### ${k.title}\n${k.body}`).join('\n\n')
  return `Ты менеджер сайта «${input.name}»\n## Базовые знания платформы\n${base}\n## Знания этого сайта\n${siteKb}`
}

const prompt = buildAssistantSystemPrompt({
  name: 'Visit Kazakhstan',
  baseKnowledge: [{ title: 'Роль', body: 'Помогай найти карточку и не выдумывай цены.' }],
  siteKnowledge: [{ title: 'Тон', body: 'Сначала город, потом журнал.' }],
})

if (!prompt.includes('Базовые знания платформы')) throw new Error('missing base')
if (!prompt.includes('не выдумывай цены')) throw new Error('missing base body')
if (!prompt.includes('Сначала город')) throw new Error('missing site knowledge')
if (!prompt.includes('Visit Kazakhstan')) throw new Error('missing site name')
console.log('assistant context ok')
