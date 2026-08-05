import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import { defineConfig, globalIgnores } from 'eslint/config'

const A11Y_STRICT_FILES = [
  'src/components/common/Modal.jsx',
  'src/components/common/ConfirmDialog.jsx',
  'src/components/common/Select.jsx',
  'src/components/common/DatePicker.jsx',
  'src/components/common/Pagination.jsx',
]

const a11yRuleNames = Object.keys(jsxA11y.flatConfigs.recommended.rules)
const a11yWarnRules = Object.fromEntries(a11yRuleNames.map((rule) => [rule, 'warn']))
const a11yErrorRules = Object.fromEntries(a11yRuleNames.map((rule) => [rule, 'error']))

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: a11yWarnRules,
  },
  {
    files: A11Y_STRICT_FILES,
    rules: a11yErrorRules,
  },
])
