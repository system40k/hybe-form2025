import globals from "globals";

export default [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  // Configuration for Node.js ESM files
  {
    files: ["server.js", "lib/security.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
      "no-console": "off",
    },
  },
  // Configuration for Browser files
  {
    files: ["script.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.jquery, // If you use jQuery
        AOS: "readonly",
        bootstrap: "readonly",
        intlTelInput: "readonly",
      },
    },
    rules: {
      "no-unused-vars": [
        "warn",
        {
          varsIgnorePattern:
            "paymentMethods|countryInput|currencyInput|languageInput",
        },
      ],
      "no-undef": "error",
      "no-console": "off",
    },
  },
];
