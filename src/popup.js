// DOM元素
let rulesContainer
let addRuleButton
let newRuleForm
let newKeywordInput
let newTemplateInput
let newEnabledCheckbox
let saveNewButton
let cancelNewButton
let loadingMessage
let statusMessage

// 初始化DOM引用
function initDomReferences() {
  rulesContainer = document.getElementById('rules-container')
  addRuleButton = document.getElementById('add-rule-button')
  newRuleForm = document.getElementById('new-rule-form')
  newKeywordInput = document.getElementById('new-keyword')
  newTemplateInput = document.getElementById('new-template')
  newEnabledCheckbox = document.getElementById('new-enabled')
  saveNewButton = document.getElementById('save-new-button')
  cancelNewButton = document.getElementById('cancel-new-button')
  loadingMessage = document.getElementById('loading-message')
  statusMessage = document.getElementById('status-message')
}

// 加载规则
function loadRules() {
  chrome.storage.sync.get(['rules', 'defaultRuleId'], (result) => {
    loadingMessage.style.display = 'none'
    // 渲染规则
    renderRules(result.rules || [], result.defaultRuleId || '')
  })
}

// 渲染规则列表
function renderRules(rules, defaultRuleId) {
  rulesContainer.innerHTML = ''

  if (!rules || rules.length === 0) {
    rulesContainer.innerHTML = '<p class="text-center">没有配置规则，请添加新规则</p>'
    return
  }

  rules.forEach((rule) => {
    const ruleElement = document.createElement('div')
    ruleElement.className = 'rule-item'
    ruleElement.innerHTML = `
      <div class="form-group">
        <label for="keyword-${rule.id}">目标</label>
        <input type="text" id="keyword-${rule.id}" value="${rule.target}">
      </div>
      
      <div class="form-group">
        <label for="template-${rule.id}">URL模板</label>
        <input type="text" id="template-${rule.id}" value="${rule.template}">
      </div>

      <div class="button-group update-rule-button-group">
        <button class="btn-danger" data-action="delete" data-id="${rule.id}">删除</button>
        <button data-action="save" data-id="${rule.id}">保存</button>
      </div>
      
      <div class="form-group checkbox">
        <input type="checkbox" id="enabled-${rule.id}" ${rule.enabled ? 'checked' : ''}>
        <label for="enabled-${rule.id}">启用</label>
      </div>
      
      <div class="form-group checkbox">
        <input type="checkbox" id="default-${rule.id}" ${rule.id === defaultRuleId ? 'checked' : ''}>
        <label for="default-${rule.id}">设为默认</label>
      </div>
    `

    rulesContainer.appendChild(ruleElement)
  })

  // 添加按钮事件
  document.querySelectorAll('[data-action="save"]').forEach((button) => {
    button.addEventListener('click', saveRule)
  })

  document.querySelectorAll('[data-action="delete"]').forEach((button) => {
    button.addEventListener('click', deleteRule)
  })

  // 添加默认规则选择事件
  document.querySelectorAll('[id^="default-"]').forEach((checkbox) => {
    checkbox.addEventListener('change', setDefaultRule)
  })
}

// 设置默认规则
function setDefaultRule(event) {
  const checkbox = event.target
  const ruleId = checkbox.id.replace('default-', '')
  
  // 如果当前复选框被选中，先取消其他所有复选框的选中状态
  if (checkbox.checked) {
    document.querySelectorAll('[id^="default-"]').forEach((otherCheckbox) => {
      if (otherCheckbox !== checkbox) {
        otherCheckbox.checked = false
      }
    })
  }
  
  // 设置或清除默认规则
  chrome.storage.sync.set({ 
    defaultRuleId: checkbox.checked ? ruleId : '' 
  }, () => {
    showStatus(checkbox.checked ? '默认规则已设置' : '已取消默认规则', 'success')
  })
}

// 保存规则
function saveRule(event) {
  const button = event.target
  const ruleId = button.getAttribute('data-id')

  const keywordInput = document.getElementById(`keyword-${ruleId}`)
  const templateInput = document.getElementById(`template-${ruleId}`)
  const enabledCheckbox = document.getElementById(`enabled-${ruleId}`)
  const defaultCheckbox = document.getElementById(`default-${ruleId}`)

  const target = keywordInput.value.trim()
  const template = templateInput.value.trim()

  if (!target || !template) {
    showStatus('目标和URL模板不能为空', 'error')
    return
  }

  chrome.storage.sync.get(['rules', 'defaultRuleId'], (result) => {
    const rules = result.rules || []
    let defaultRuleId = result.defaultRuleId || ''

    // 更新规则
    const updatedRules = rules.map((rule) => {
      if (rule.id === ruleId) {
        return {
          ...rule,
          target,
          template,
          enabled: enabledCheckbox.checked,
        }
      }
      return rule
    })

    // 更新存储
    const updates = { rules: updatedRules }
    
    // 处理默认规则的变更
    if (defaultCheckbox.checked && defaultRuleId !== ruleId) {
      updates.defaultRuleId = ruleId
      defaultRuleId = ruleId
    } else if (!defaultCheckbox.checked && defaultRuleId === ruleId) {
      updates.defaultRuleId = ''
      defaultRuleId = ''
    }

    chrome.storage.sync.set(updates, () => {
      showStatus('规则已保存', 'success')
      // 重新渲染以确保默认规则选择正确显示
      renderRules(updatedRules, defaultRuleId)
    })
  })
}

// 删除规则
function deleteRule(event) {
  const button = event.target
  const ruleId = button.getAttribute('data-id')

  if (!confirm('确定要删除这条规则吗？')) {
    return
  }

  chrome.storage.sync.get(['rules', 'defaultRuleId'], (result) => {
    const rules = result.rules || []
    let defaultRuleId = result.defaultRuleId || ''

    // 过滤掉要删除的规则
    const updatedRules = rules.filter((rule) => rule.id !== ruleId)

    const updates = { rules: updatedRules }
    
    // 如果删除的是默认规则，清除默认规则设置
    if (defaultRuleId === ruleId) {
      updates.defaultRuleId = ''
      defaultRuleId = ''
    }

    // 保存更新后的规则
    chrome.storage.sync.set(updates, () => {
      showStatus('规则已删除', 'success')
      // 重新渲染规则列表
      renderRules(updatedRules, defaultRuleId)
    })
  })
}

// 显示新规则表单
function showNewRuleForm() {
  newRuleForm.classList.remove('hidden')
  newKeywordInput.value = ''
  newTemplateInput.value = ''
  newEnabledCheckbox.checked = true
}

// 隐藏新规则表单
function hideNewRuleForm() {
  newRuleForm.classList.add('hidden')
}

// 保存新规则
function saveNewRule() {
  const target = newKeywordInput.value.trim()
  const template = newTemplateInput.value.trim()

  if (!target || !template) {
    showStatus('目标和URL模板不能为空', 'error')
    return
  }

  chrome.storage.sync.get(['rules', 'defaultRuleId'], (result) => {
    const rules = result.rules || []
    const defaultRuleId = result.defaultRuleId || ''

    // 创建新规则
    const newRule = {
      id: 'rule-' + Date.now(),
      target,
      template,
      enabled: newEnabledCheckbox.checked,
    }

    // 添加新规则
    const updatedRules = [...rules, newRule]

    // 保存更新后的规则
    chrome.storage.sync.set({ rules: updatedRules }, () => {
      showStatus('新规则已添加', 'success')
      // 重新渲染规则列表
      renderRules(updatedRules, defaultRuleId)
      // 隐藏新规则表单
      hideNewRuleForm()
    })
  })
}

// 显示状态消息
function showStatus(message, type) {
  statusMessage.textContent = message
  statusMessage.className = `status status-${type}`

  // 3秒后清除消息
  setTimeout(() => {
    statusMessage.textContent = ''
    statusMessage.className = ''
  }, 3000)
}

// 绑定事件
function bindEvents() {
  addRuleButton.addEventListener('click', showNewRuleForm)
  saveNewButton.addEventListener('click', saveNewRule)
  cancelNewButton.addEventListener('click', hideNewRuleForm)
}

// 初始化
document.addEventListener('DOMContentLoaded', function () {
  initDomReferences()
  // 加载规则
  loadRules()
  // 绑定事件
  bindEvents()
})
