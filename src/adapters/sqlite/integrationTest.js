import { Platform } from 'react-native'
import SQLiteAdapter from './index'
import { testSchema, mockTaskRaw } from '../__tests__/helpers'
import commonTests from '../__tests__/commonTests'
import { invariant } from '../../utils/common'
import DatabaseAdapterCompat from '../compat'

const SQLiteAdapterTest = (spec) => {
  const configurations = [
    Platform.OS !== 'windows'
      ? {
          name: 'SQLiteAdapter (async mode)',
          options: {},
          expectedDispatcherType: 'asynchronous',
        }
      : null,
    { name: 'SQLiteAdapter (JSI mode)', options: { jsi: true }, expectedDispatcherType: 'jsi' },
  ].filter(Boolean)

  configurations.forEach(({ name: configurationName, options, expectedDispatcherType }) => {
    spec.describe(configurationName, () => {
      spec.it('configures adapter correctly', () => {
        const adapter = new SQLiteAdapter({ schema: testSchema, ...options })
        expect(adapter._dispatcherType).toBe(expectedDispatcherType)
      })

      const testCases = commonTests()
      const onlyTestCases = testCases.filter(([, , isOnly]) => isOnly)
      const testCasesToRun = onlyTestCases.length ? onlyTestCases : testCases

      testCasesToRun.forEach((testCase) => {
        const [name, test] = testCase
        spec.it(name, async () => {
          const dbName = `file:testdb${Math.random()}?mode=memory&cache=shared`
          const adapter = new SQLiteAdapter({ schema: testSchema, dbName, ...options })
          invariant(
            adapter._dispatcherType === expectedDispatcherType,
            `Expected adapter to be ${expectedDispatcherType}`,
          )
          await test(
            new DatabaseAdapterCompat(adapter),
            SQLiteAdapter,
            { dbName, ...options },
            Platform.OS,
          )
        })
      })

      if (onlyTestCases.length) {
        spec.it('BROKEN SETUP', async () => {
          throw new Error('Do not commit tests with it.only')
        })
      }

      // Encryption tests are JSI-only (SQLCipher requires JSI dispatcher)
      if (expectedDispatcherType === 'jsi') {
        spec.describe('Encryption (SQLCipher)', () => {
          spec.it('encrypted DB round-trip', async () => {
            const dbName = `file:testdb${Math.random()}?mode=memory&cache=shared`
            const passphrase = 'test-secret-passphrase'
            const adapter = new DatabaseAdapterCompat(
              new SQLiteAdapter({ schema: testSchema, dbName, passphrase, jsi: true }),
            )

            const record = mockTaskRaw({ id: 'enc1', text1: 'encrypted-data', order: 1 })
            await adapter.batch([['create', 'tasks', record]])

            // Clone with same passphrase and verify data survives
            const cloned = await adapter.testClone()
            const found = await cloned.find('tasks', 'enc1')
            expect(found).toEqual(record)
          })

          // NOTE: For in-memory databases, each new adapter with a different dbName gets an
          // independent database, so "wrong passphrase" cannot be meaningfully tested.
          // This scenario is best tested with file-based databases on device.

          spec.it('changePassword works', async () => {
            const dbName = `file:testdb${Math.random()}?mode=memory&cache=shared`
            const passphrase = 'original-password'
            const rawAdapter = new SQLiteAdapter({
              schema: testSchema,
              dbName,
              passphrase,
              jsi: true,
            })
            const adapter = new DatabaseAdapterCompat(rawAdapter)

            const record = mockTaskRaw({ id: 'cp1', text1: 'before-rekey', order: 1 })
            await adapter.batch([['create', 'tasks', record]])

            // Change the password on the raw adapter
            rawAdapter.changePassword('new-password')

            // Clone with the new passphrase and verify data is still readable
            const cloned = await adapter.testClone()
            const found = await cloned.find('tasks', 'cp1')
            expect(found).toEqual(record)
          })

          spec.it('changePassword with empty string throws', async () => {
            const dbName = `file:testdb${Math.random()}?mode=memory&cache=shared`
            const passphrase = 'test-secret'
            const rawAdapter = new SQLiteAdapter({
              schema: testSchema,
              dbName,
              passphrase,
              jsi: true,
            })
            await rawAdapter._initPromise

            let didThrow = false
            try {
              rawAdapter.changePassword('')
            } catch (e) {
              didThrow = true
              expect(e.message).toMatch(/non-empty/)
            }
            expect(didThrow).toBe(true)
          })
        })
      }
    })
  })
}

export default SQLiteAdapterTest
