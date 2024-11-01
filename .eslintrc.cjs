module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
  ],
  ignorePatterns: ["dist", ".eslintrc.cjs"],
  parser: "@typescript-eslint/parser",
  plugins: ["react", "react-refresh", "unicorn", "@limegrass/import-alias"],
  rules: {
    "no-fallthrough": "error",
    "react-refresh/only-export-components": [
      "warn",
      { allowConstantExport: true },
    ],
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "prefer-rest-params": "off",
    "@typescript-eslint/no-this-alias": "off",
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/strict-boolean-expressions": [
      "warn",
      {
        allowNumber: true,
        allowNullableString: true,
        allowNullableNumber: false,
        allowNullableBoolean: true,
      },
    ],
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "react/jsx-sort-props": [
      "warn",
      {
        callbacksLast: true,
        shorthandFirst: true,
        ignoreCase: true,
        reservedFirst: true,
        noSortAlphabetically: true,
      },
    ],
    "react/jsx-no-useless-fragment": [
      "warn",
      {
        allowExpressions: true,
      },
    ],
    "unicorn/filename-case": [
      "error",
      {
        cases: {
          pascalCase: true,
          kebabCase: true,
          camelCase: true,
        },
        ignore: ["\\.d\\.ts$"],
      },
    ],
    "import/no-cycle": "error",
    "import/order": [
      "warn",
      {
        groups: [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index",
          "unknown",
        ],
        pathGroups: [
          {
            pattern: "**/*?script&module",
            group: "unknown",
            position: "after",
          },
        ],
        pathGroupsExcludedImportTypes: ["script-module"],
        "newlines-between": "always",
        alphabetize: {
          order: "asc",
          caseInsensitive: true,
        },
      },
    ],
    "@limegrass/import-alias/import-alias": "off",
  },
  parserOptions: {
    project: "./tsconfig.json",
  },
  settings: {
    react: { version: "detect" },
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true,
        project: "./tsconfig.json",
      },
    },
  },
  overrides: [
    {
      files: ["src/**/*.{ts,tsx}"],
      rules: {
        "@limegrass/import-alias/import-alias": ["warn"],
      },
    },
  ],
};
