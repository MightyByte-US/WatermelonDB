# Design: `changePassword` API + Encryption Tests

**Date:** 2026-03-26
**Scope:** Add `sqlite3_rekey` support and encryption test coverage to WatermelonDB's SQLCipher integration.

## 1. `changePassword(newPassphrase)` API

### JS API

```js
// On an initialized, encrypted SQLiteAdapter:
await adapter.changePassword('new-secret')
```

- `SQLiteAdapter.changePassword(newPassphrase: string): Promise<void>`
- Validates `newPassphrase` is a non-empty string (throws if empty)
- JSI-only; throws `Error("changePassword requires JSI")` on NativeModules dispatcher
- Added to `SQLiteAdapterOptions` type and `SqliteDispatcher` interface

### JSI Dispatcher

`SqliteJsiDispatcher` gains a `changePassword(password: string)` method that calls `this._db.changePassword(password)`.

### C++ DatabaseBridge

New method registered on the adapter JSI object:

```cpp
createMethod(rt, adapter, "changePassword", 1, [database](jsi::Runtime &rt, const jsi::Value *args) {
    std::string newPassword = args[0].getString(rt).utf8(rt);
    database->changePassword(newPassword);
    std::fill(newPassword.begin(), newPassword.end(), '\0');
    return jsi::Value::undefined();
});
```

### C++ Database

```cpp
void Database::changePassword(std::string newPassword);
```

Calls `db_->rekey(newPassword.c_str())`, then zeroes `newPassword`.

### C++ SqliteDb

```cpp
void SqliteDb::rekey(const char *newPassword);
```

Under `#ifdef SQLITE_HAS_CODEC`:
1. Validates `newPassword` is non-null and non-empty (throws if not)
2. Calls `sqlite3_rekey(sqlite, newPassword, strlen(newPassword))`
3. Verifies with `SELECT count(*) FROM sqlite_master`
4. On failure, throws `std::runtime_error` with SQLite error message

Without `SQLITE_HAS_CODEC`: throws `std::runtime_error("Encryption not supported")`.

### Validation Rules

| Layer | Check | Action |
|-------|-------|--------|
| JS `changePassword` | `newPassphrase` empty/falsy | throw Error |
| JS `changePassword` | non-JSI dispatcher | throw Error |
| C++ `Database::changePassword` | empty string | throw runtime_error |
| C++ `SqliteDb::rekey` | no SQLITE_HAS_CODEC | throw runtime_error |
| C++ `SqliteDb::rekey` | sqlite3_rekey fails | throw runtime_error |

### Security

- Password zeroed from memory at each layer after use (same pattern as existing `sqlite3_key` flow)
- `const char*` in SqliteDb cannot be zeroed; caller responsible (documented)

## 2. Encryption Tests

### Node Jest Tests (JS plumbing)

Added to `src/adapters/sqlite/test.js` or alongside as `src/adapters/sqlite/encryption.test.js`:

- **passphrase threads through**: Create adapter with passphrase, verify no throw
- **changePassword exists**: Method is present on adapter instance
- **changePassword('') throws**: Empty string rejected
- **passphrase without jsi throws**: Verify existing invariant works

These test JS-level validation only. Node SQLite does not use the SQLCipher amalgamation, so actual encryption cannot be verified here.

### RN Integration Tests (real crypto)

Added to `src/adapters/sqlite/integrationTest.js`, JSI-mode only:

- **encrypted DB round-trip**: Create with passphrase, write data, clone adapter (same passphrase), read data back
- **wrong password fails**: Create encrypted DB, clone with wrong passphrase, expect failure
- **changePassword works**: Create encrypted DB, write data, changePassword, clone with new passphrase, verify data
- **changePassword('') throws**: Verify empty password rejected at runtime

All integration tests guarded by `if (jsi) { ... }` since encryption is JSI-only.

## 3. Files Changed

| File | Change |
|------|--------|
| `native/shared/Sqlite.h` | Add `rekey()` method declaration |
| `native/shared/Sqlite.cpp` | Implement `rekey()` with `sqlite3_rekey` |
| `native/shared/Database.h` | Add `changePassword()` method declaration |
| `native/shared/Database.cpp` | Implement `changePassword()` |
| `native/shared/DatabaseBridge.cpp` | Register `changePassword` JSI method |
| `src/adapters/sqlite/type.js` | Add `changePassword` to dispatcher method type |
| `src/adapters/sqlite/type.d.ts` | Add `changePassword` to TypeScript types |
| `src/adapters/sqlite/index.js` | Add `changePassword()` method on SQLiteAdapter |
| `src/adapters/sqlite/makeDispatcher/index.native.js` | Add `changePassword` to JSI dispatcher |
| `src/adapters/sqlite/encryption.test.js` | New file: Node Jest tests |
| `src/adapters/sqlite/integrationTest.js` | Add encrypted DB integration tests |

## 4. Out of Scope

- Removing encryption (`rekey` to empty/null) — blocked for safety
- NativeModules bridge encryption support
- Key derivation (PBKDF2 config) — SQLCipher defaults are sufficient
- Web/LokiJS encryption
