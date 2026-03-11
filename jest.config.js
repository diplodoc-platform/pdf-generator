module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/?(*.)+(test).[tj]s?(x)'],
    testTimeout: 1000000,
    moduleNameMapper: {
        '\\.(css|scss|sass)$': '<rootDir>/__tests__/__mocks__/styleMock.js',
    },
};
