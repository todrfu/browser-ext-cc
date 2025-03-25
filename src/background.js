// 默认配置
const DEFAULT_RULES = [
  {
    id: 'default-github',
    target: 'gh',
    template: `https://github.com/search?q={source}&type=repositories`,
    enabled: true,
  }
]

// 从storage中获取配置
async function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('rules', (result) => {
      resolve(result.rules || DEFAULT_RULES)
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

  // 如果没有默认规则或默认规则未启用，使用GitHub
  return `https://github.com/${encodeURIComponent(text.trim())}`
}

// 监听omnibox输入
chrome.omnibox.onInputEntered.addListener(async (text) => {
  try {
    const url = await generateUrl(text)
    chrome.tabs.create({ url })
  } catch (error) {
    console.error('Error handling omnibox input:', error)
  }
})

// 设置默认建议
chrome.omnibox.onInputStarted.addListener(async () => {
  const defaultRuleId = await getDefaultRuleId()
  let description = '输入资源名以快速跳转到对应页面'
  
  if (defaultRuleId) {
    const rules = await getConfig()
    const defaultRule = rules.find(rule => rule.id === defaultRuleId && rule.enabled)
    if (defaultRule) {
      description = `默认使用 ${defaultRule.target} 规则，直接输入内容可快速跳转`
    }
  }
  
  chrome.omnibox.setDefaultSuggestion({ description })
})

// 初始化
function initialize() {
  // 异步设置omnibox默认建议
  (async () => {
    const defaultRuleId = await getDefaultRuleId()
    let description = '输入资源名以快速跳转到对应页面'
    
    if (defaultRuleId) {
      const rules = await getConfig()
      const defaultRule = rules.find(rule => rule.id === defaultRuleId && rule.enabled)
      if (defaultRule) {
        description = `默认使用 ${defaultRule.target} 规则，直接输入内容可快速跳转`
      }
    }
    
    chrome.omnibox.setDefaultSuggestion({ description })
  })()

  // 检查是否需要初始化默认规则
  chrome.storage.sync.get('rules', (result) => {
    if (!result.rules) {
      chrome.storage.sync.set({ rules: DEFAULT_RULES })
    }
  })
}

// 扩展安装或更新时初始化
chrome.runtime.onInstalled.addListener(initialize)
