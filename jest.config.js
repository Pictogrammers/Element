export default {
  testEnvironment: "jsdom",
  transform: {
    "^.+\.[jt]sx?$": ["ts-jest"],
  },
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  moduleNameMapper: {
    '(.+)\\.js': '$1'
  },
  extensionsToTreatAsEsm: ['.ts']
};
