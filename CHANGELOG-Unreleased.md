### Highlights

### BREAKING CHANGES

### Deprecations

### New features

- [SQLCipher] Add `changePassword(newPassphrase)` API to change encryption key on an open database at runtime (JSI-only)
- [SQLCipher] Add `sqlite3_rekey` support in native C++ layer with post-rekey verification

### Fixes

- [LokiJS] Multitab sync issue fix
- [Android] Added linker flag for building with 16kB page alignment
- [TS] make catchError visible to typescript
- [SQLCipher] Fix use-after-free when encrypted database fails to open (error message was read after `sqlite3_close`)
- [SQLCipher] Fix `throw new` to `throw` in native C++ so exceptions are catchable by `catch(const std::exception&)` handlers
- [SQLCipher] Fix sqlite handle leak on `sqlite3_open` failure (missing `sqlite3_close` before throw)
- [SQLCipher] Zero encryption password from memory after use in Database, DatabaseBridge, and SqliteDb layers
- [SQLCipher] Zero password on error path in `changePassword` bridge method
- [SQLCipher] Throw error when `passphrase` is used without `jsi: true` to prevent silent fallback to unencrypted DB
- [SQLCipher] Make passphrase+jsi invariant run in production builds (not dev-only)
- [SQLCipher] Forward `passphrase` in `testClone` to support encrypted database cloning
- [Android] Align gradle property name `isEncryptedDB` with docs and iOS podspec (was `encryptedDB`)
- [Native] Restore `#include` in shared C++ headers for MSVC/GCC portability (revert `#import`)
- [Native] Restore standard `public:`/`private:` indentation in shared header class declarations
- [Native] Clean up debug log markers (`#####`) in encryption path

### Performance

### Changes

- Updated better-sqlite3 to 11.9.1

### Internal

- Updated internal dependencies
- Updated documentation scripts
- [SQLCipher] Add Node Jest tests for encryption validation and passphrase plumbing
- [SQLCipher] Add RN integration tests for encrypted DB round-trip, `changePassword`, and error cases
