// 内置配置
const BUILT_IN_RULES = [
  {
    id: 'default-github',
    target: 'gh',
    description: 'GitHub 搜索',
    template: 'https://github.com/search?q={source}&type=repositories',
    enabled: true,
  }
]

// 获取默认跳转
const GET_DEFAULT_LINK = (source) => `https://www.google.com/search?q=${encodeURIComponent(source.trim())}`

// 默认建议
const DEFAULT_SUGGESTION = {
  description: '<dim>输入格式：</dim> <match>规则 + 空格 + 关键词</match>'
}
// 从storage中获取配置
async function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('rules', (result) => {
      resolve(result.rules || BUILT_IN_RULES)
    })
  })
}

// 获取默认规则ID
async function getDefaultRuleId() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('defaultRuleId', (result) => {
      resolve(result.defaultRuleId || '')
    })
  })
}

// 根据输入和规则生成URL
async function generateUrl(text) {
  const rules = await getConfig()
  const activeRules = rules.filter((rule) => rule.enabled)
  const defaultRuleId = await getDefaultRuleId()
  
  // 首先查找匹配前缀的规则
  for (const rule of activeRules) {
    const regExp = new RegExp(`^\\s*${rule.target}\\s+`)
    const match = text.match(regExp)
    if (match) {
      const source = text.slice(match[0].length).trim()
      return rule.template.replace('{source}', encodeURIComponent(source))
    }
  }
  
  // 如果没有匹配前缀的规则，但有默认规则，使用默认规则
  if (defaultRuleId) {
    const defaultRule = activeRules.find(rule => rule.id === defaultRuleId)
    if (defaultRule) {
      return defaultRule.template.replace('{source}', encodeURIComponent(text.trim()))
    }
  }

  return GET_DEFAULT_LINK(text)
}

// 生成规则建议列表
async function generateSuggestions(text) {
  const rules = await getConfig()
  const activeRules = rules.filter((rule) => rule.enabled)
  const suggestions = []
  
  // 对每个启用的规则生成建议
  activeRules.forEach(rule => {
    // 如果用户输入为空或者输入的文本匹配规则前缀
    if (!text.trim() || rule.target.toLowerCase().includes(text.trim().toLowerCase())) {
      suggestions.push({
        content: `${rule.target} `, // 在规则后加空格，方便用户继续输入
        description: `<match>${rule.target}</match> - <dim>${rule.description}</dim> • <match>示例：${rule.target} 关键词</match>`
      })
    }
  })

  return suggestions
}

// 监听输入变化，提供建议
chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  try {
    const suggestions = await generateSuggestions(text)
    // 设置默认建议
    chrome.omnibox.setDefaultSuggestion(DEFAULT_SUGGESTION)
    // 提供其他建议
    suggest(suggestions)
  } catch (error) {
    console.error('Error generating suggestions:', error)
    suggest([])
  }
})

// 监听omnibox输入
chrome.omnibox.onInputEntered.addListener(async (text) => {
  try {
    const t = text.trim()
    const isRuleSyntax = /^\s*.+\s+.+$/.test(t)
    if (isRuleSyntax){
      const url = await generateUrl(t)
      chrome.tabs.create({ url })
      return
    } else {
      const defaultRuleId = await getDefaultRuleId()
      // 如果设置了默认规则，则直接跳转
      if (defaultRuleId) {
        const rules = await getConfig()
        const defaultRule = rules.find(rule => rule.id === defaultRuleId && rule.enabled)
        if (defaultRule) {
          const url = defaultRule.template.replace('{source}', encodeURIComponent(text.trim()))
          chrome.tabs.create({ url })
          return
        }
      }
    }
    // 如果只是规则名，不执行跳转
    chrome.omnibox.setDefaultSuggestion(DEFAULT_SUGGESTION)
    
  } catch (error) {
    console.error('Error handling omnibox input:', error)
  }
})

// 设置默认建议
chrome.omnibox.onInputStarted.addListener(async () => {
  const defaultRuleId = await getDefaultRuleId()
  
  if (defaultRuleId) {
    const rules = await getConfig()
    const defaultRule = rules.find(rule => rule.id === defaultRuleId && rule.enabled)
    if (defaultRule) {
      const description = `默认使用 ${defaultRule.target} 规则`
      chrome.omnibox.setDefaultSuggestion({ description })
    }
  }
  
  chrome.omnibox.setDefaultSuggestion(DEFAULT_SUGGESTION)
})

// 初始化
function initialize() {
  // 检查是否需要初始化默认规则
  chrome.storage.sync.get('rules', (result) => {
    if (!result.rules) {
      chrome.storage.sync.set({ rules: DEFAULT_RULES })
    }
  })
}

// 扩展安装或更新时初始化
chrome.runtime.onInstalled.addListener(initialize)
